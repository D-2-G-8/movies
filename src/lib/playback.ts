import type { Ad, Channel, ChannelAd, ChannelMedia, Media, MediaSource, PlaybackHistory } from "@prisma/client";
import { db } from "./db";
import { resolveMedia } from "./providers";
import type { PlaybackResponse } from "./types";

type MediaCandidate = ChannelMedia & { media: Media & { sources: MediaSource[] } };
type AdCandidate = ChannelAd & { ad: Ad };
type CurrentHistory = PlaybackHistory & { media: (Media & { sources: MediaSource[] }) | null; ad: Ad | null };

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(1, item.weight);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

async function getChannel(identifier: string) {
  return db.channel.findFirst({ where: { OR: [{ id: identifier }, { slug: identifier }] } });
}

async function chooseMedia(channel: Channel): Promise<MediaCandidate | null> {
  const candidates = await db.channelMedia.findMany({
    where: { channelId: channel.id, enabled: true, media: { enabled: true } },
    include: { media: { include: { sources: { where: { enabled: true }, orderBy: { priority: "desc" } } } } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  const playable: MediaCandidate[] = [];
  for (const candidate of candidates) {
    if (await resolveMedia(candidate.media)) playable.push(candidate);
  }
  if (!playable.length) return null;

  const repeatSince = new Date(Date.now() - Math.max(0, channel.repeatDays) * 86_400_000);
  const recent = await db.playbackHistory.findMany({
    where: { channelId: channel.id, mediaId: { not: null }, startedAt: { gte: repeatSince } },
    select: { mediaId: true },
  });
  const recentIds = new Set(recent.map((item) => item.mediaId));
  const eligible = playable.filter((item) => !recentIds.has(item.mediaId));
  const pool = eligible.length ? eligible : playable;

  if (channel.playbackMode === "RANDOM") return weightedPick(pool);

  const last = await db.playbackHistory.findFirst({
    where: { channelId: channel.id, mediaId: { not: null } },
    orderBy: { startedAt: "desc" },
    select: { mediaId: true },
  });
  const lastIndex = last ? playable.findIndex((item) => item.mediaId === last.mediaId) : -1;
  for (let offset = 1; offset <= playable.length; offset += 1) {
    const candidate = playable[(lastIndex + offset) % playable.length];
    if (pool.some((item) => item.id === candidate.id)) return candidate;
  }
  return pool[0];
}

async function chooseAd(channel: Channel): Promise<AdCandidate | null> {
  const allowedTypes = [channel.useTrailers ? "TRAILER" : null, channel.useAds ? "AD" : null].filter(Boolean) as string[];
  if (!allowedTypes.length) return null;
  const candidates = await db.channelAd.findMany({
    where: { channelId: channel.id, enabled: true, ad: { enabled: true, type: { in: allowedTypes } } },
    include: { ad: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  if (!candidates.length) return null;

  const repeatSince = new Date(Date.now() - Math.max(0, channel.interstitialRepeatDays) * 86_400_000);
  const recent = await db.playbackHistory.findMany({
    where: { channelId: channel.id, adId: { not: null }, startedAt: { gte: repeatSince } },
    select: { adId: true },
  });
  const recentIds = new Set(recent.map((item) => item.adId));
  const eligible = candidates.filter((item) => !recentIds.has(item.adId));
  const pool = eligible.length ? eligible : candidates;

  if (channel.interstitialMode === "RANDOM") return weightedPick(pool);
  const last = await db.playbackHistory.findFirst({
    where: { channelId: channel.id, adId: { not: null } },
    orderBy: { startedAt: "desc" },
    select: { adId: true },
  });
  const index = last ? candidates.findIndex((item) => item.adId === last.adId) : -1;
  return candidates[(index + 1) % candidates.length];
}

async function shouldPlayInterstitial(channel: Channel, previous: CurrentHistory | null) {
  if (!previous || previous.mediaId) return Boolean(previous?.mediaId && channel.interstitialCount > 0);
  const lastMedia = await db.playbackHistory.findFirst({
    where: { channelId: channel.id, mediaId: { not: null } },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  if (!lastMedia) return false;
  const count = await db.playbackHistory.count({
    where: { channelId: channel.id, adId: { not: null }, startedAt: { gt: lastMedia.startedAt } },
  });
  return count < channel.interstitialCount;
}

async function createNext(channel: Channel, previous: CurrentHistory | null) {
  if (await shouldPlayInterstitial(channel, previous)) {
    const selected = await chooseAd(channel);
    if (selected) {
      return db.playbackHistory.create({
        data: {
          channelId: channel.id,
          adId: selected.adId,
          contentType: selected.ad.type,
          sourceUrl: selected.ad.videoUrl,
        },
        include: { media: { include: { sources: true } }, ad: true },
      });
    }
  }

  const selected = await chooseMedia(channel);
  if (!selected) throw new Error("NO_PLAYABLE_CONTENT");
  const source = await resolveMedia(selected.media);
  if (!source) throw new Error("NO_PLAYABLE_SOURCE");
  return db.playbackHistory.create({
    data: {
      channelId: channel.id,
      mediaId: selected.mediaId,
      contentType: selected.media.type,
      sourceUrl: source.url,
    },
    include: { media: { include: { sources: true } }, ad: true },
  });
}

async function serialize(channel: Channel, history: CurrentHistory): Promise<PlaybackResponse> {
  if (history.media) {
    const resolved = await resolveMedia(history.media);
    const source = resolved ?? { type: "direct" as const, url: history.sourceUrl, provider: "DIRECT_URL", priority: 0 };
    return {
      channel,
      item: {
        historyId: history.id,
        kind: "MEDIA",
        id: history.media.id,
        type: history.media.type,
        title: history.media.title,
        year: history.media.year,
        seriesTitle: history.media.seriesTitle,
        seasonNumber: history.media.seasonNumber,
        episodeNumber: history.media.episodeNumber,
        startedAt: history.startedAt.toISOString(),
        source: { type: source.type, url: source.url, provider: source.provider },
      },
      next: [],
    };
  }
  if (!history.ad) throw new Error("PLAYBACK_ITEM_MISSING");
  return {
    channel,
    item: {
      historyId: history.id,
      kind: "INTERSTITIAL",
      id: history.ad.id,
      type: history.ad.type,
      title: history.ad.title,
      year: null,
      seriesTitle: null,
      seasonNumber: null,
      episodeNumber: null,
      startedAt: history.startedAt.toISOString(),
      source: { type: "direct", url: history.ad.videoUrl, provider: "DIRECT_URL" },
    },
    next: [],
  };
}

export async function getPlayback(identifier: string) {
  const channel = await getChannel(identifier);
  if (!channel || !channel.enabled) return null;
  let current = await db.playbackHistory.findFirst({
    where: { channelId: channel.id, finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: { media: { include: { sources: true } }, ad: true },
  });
  if (!current) current = await createNext(channel, null);
  return serialize(channel, current);
}

export async function advancePlayback(identifier: string) {
  const channel = await getChannel(identifier);
  if (!channel || !channel.enabled) return null;
  const current = await db.playbackHistory.findFirst({
    where: { channelId: channel.id, finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: { media: { include: { sources: true } }, ad: true },
  });
  if (current) await db.playbackHistory.update({ where: { id: current.id }, data: { finishedAt: new Date() } });
  const next = await createNext(channel, current);
  return serialize(channel, next);
}
