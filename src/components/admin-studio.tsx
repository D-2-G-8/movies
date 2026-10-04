"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Cable,
  Check,
  ChevronRight,
  Clapperboard,
  Film,
  LoaderCircle,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Source = {
  id: string;
  mediaId: string;
  provider: string;
  externalId: string | null;
  streamUrl: string | null;
  iframeUrl: string | null;
  priority: number;
  enabled: boolean;
};

type Media = {
  id: string;
  title: string;
  type: string;
  year: number | null;
  enabled: boolean;
  seriesTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  sources: Source[];
};

type Ad = {
  id: string;
  title: string;
  type: string;
  videoUrl: string;
  enabled: boolean;
  channels: { channelId: string; channel: { name: string } }[];
};

type Channel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accent: string;
  enabled: boolean;
  playbackMode: string;
  repeatDays: number;
  interstitialCount: number;
  useTrailers: boolean;
  useAds: boolean;
  interstitialMode: string;
  interstitialRepeatDays: number;
  media: { id: string; mediaId: string; position: number; weight: number; enabled: boolean; media: Media }[];
  ads: { id: string; adId: string; position: number; enabled: boolean; ad: Ad }[];
  _count: { history: number };
};

type Tab = "channels" | "content" | "sources" | "ads";

const tabs: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: "channels", label: "Channels", icon: Radio },
  { id: "content", label: "Content", icon: Film },
  { id: "sources", label: "Sources", icon: Cable },
  { id: "ads", label: "Ads / Trailers", icon: Clapperboard },
];

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

function intValue(form: FormData, key: string, fallback = 0) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

export function AdminStudio() {
  const [tab, setTab] = useState<Tab>("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [channelData, mediaData, adData] = await Promise.all([
        api("/api/internal/channels"),
        api("/api/internal/media"),
        api("/api/internal/ads"),
      ]);
      setChannels(channelData);
      setMedia(mediaData);
      setAds(adData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load Studio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      setNotice(message);
      await loadAll();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const createChannel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void run(
      () => api("/api/internal/channels", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          accent: form.get("accent"),
          playbackMode: form.get("playbackMode"),
          enabled: true,
        }),
      }),
      "Channel created",
    ).then(() => formElement.reset());
  };

  const saveChannel = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      () => api(`/api/internal/channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
          description: form.get("description"),
          accent: form.get("accent"),
          enabled: form.get("enabled") === "on",
          playbackMode: form.get("playbackMode"),
          repeatDays: intValue(form, "repeatDays"),
          interstitialCount: intValue(form, "interstitialCount"),
          useTrailers: form.get("useTrailers") === "on",
          useAds: form.get("useAds") === "on",
          interstitialMode: form.get("interstitialMode"),
          interstitialRepeatDays: intValue(form, "interstitialRepeatDays"),
        }),
      }),
      "Channel settings saved",
    );
  };

  const createMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void run(
      () => api("/api/internal/media", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          type: form.get("type"),
          year: form.get("year"),
          seriesTitle: form.get("seriesTitle"),
          seasonNumber: form.get("seasonNumber"),
          episodeNumber: form.get("episodeNumber"),
          enabled: true,
        }),
      }),
      "Content added",
    ).then(() => formElement.reset());
  };

  const createSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const mediaId = String(form.get("mediaId"));
    void run(
      () => api(`/api/internal/media/${mediaId}/sources`, {
        method: "POST",
        body: JSON.stringify({
          provider: form.get("provider"),
          externalId: form.get("externalId"),
          streamUrl: form.get("streamUrl"),
          priority: intValue(form, "priority"),
          enabled: true,
        }),
      }),
      "Source connected",
    ).then(() => formElement.reset());
  };

  const createAd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void run(
      () => api("/api/internal/ads", {
        method: "POST",
        body: JSON.stringify({ title: form.get("title"), type: form.get("type"), videoUrl: form.get("videoUrl"), enabled: true }),
      }),
      "Interstitial added",
    ).then(() => formElement.reset());
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" href="/"><span className="brand-mark"><Radio size={18} /></span>Nightwave</Link>
        <div className="studio-label">Studio</div>
        <nav>
          {tabs.map((item) => {
            const Icon = item.icon;
            return <button className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} key={item.id}><Icon size={18} />{item.label}</button>;
          })}
        </nav>
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to cinema</Link>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div><span className="eyebrow">Broadcast control</span><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div>
          <button className="icon-text-button" onClick={() => void loadAll()}><RefreshCw size={16} /> Refresh</button>
        </header>

        {notice && <button className="notice" onClick={() => setNotice("")}><Check size={16} />{notice}</button>}
        {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading Studio</div> : null}

        {!loading && tab === "channels" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createChannel}>
              <div><span className="panel-kicker">New frequency</span><h2>Create channel</h2></div>
              <label><span>Name</span><input name="name" placeholder="Late Night Sci-Fi" required /></label>
              <label className="wide"><span>Description</span><input name="description" placeholder="One short line about the channel" /></label>
              <label><span>Mode</span><select name="playbackMode"><option value="ORDERED">Ordered</option><option value="RANDOM">Random</option></select></label>
              <label><span>Accent</span><input type="color" name="accent" defaultValue="#d7ff64" /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Create</button>
            </form>

            <div className="stack-list">
              {channels.map((channel) => (
                <article className="admin-card channel-editor" key={channel.id} style={{ "--accent": channel.accent } as React.CSSProperties}>
                  <div className="card-head">
                    <div><span className="status-line"><i /> {channel.enabled ? "Broadcasting" : "Off air"}</span><h2>{channel.name}</h2><p>{channel.media.length} titles · {channel._count.history} plays</p></div>
                    <Link href={`/channel/${channel.slug}`} className="mini-link">Open channel <ChevronRight size={15} /></Link>
                  </div>
                  <form className="settings-grid" onSubmit={(event) => saveChannel(event, channel.id)}>
                    <label><span>Name</span><input name="name" defaultValue={channel.name} required /></label>
                    <label><span>Slug</span><input name="slug" defaultValue={channel.slug} required /></label>
                    <label className="wide"><span>Description</span><input name="description" defaultValue={channel.description ?? ""} /></label>
                    <label><span>Playback</span><select name="playbackMode" defaultValue={channel.playbackMode}><option value="ORDERED">Ordered</option><option value="RANDOM">Random</option></select></label>
                    <label><span>Movie repeat, days</span><input name="repeatDays" type="number" min="0" defaultValue={channel.repeatDays} /></label>
                    <label><span>Between movies</span><input name="interstitialCount" type="number" min="0" defaultValue={channel.interstitialCount} /></label>
                    <label><span>Insert order</span><select name="interstitialMode" defaultValue={channel.interstitialMode}><option value="RANDOM">Random</option><option value="ORDERED">Ordered</option></select></label>
                    <label><span>Insert repeat, days</span><input name="interstitialRepeatDays" type="number" min="0" defaultValue={channel.interstitialRepeatDays} /></label>
                    <label><span>Accent</span><input name="accent" type="color" defaultValue={channel.accent} /></label>
                    <div className="check-row wide">
                      <label className="check"><input name="enabled" type="checkbox" defaultChecked={channel.enabled} /><span>Channel active</span></label>
                      <label className="check"><input name="useTrailers" type="checkbox" defaultChecked={channel.useTrailers} /><span>Use trailers</span></label>
                      <label className="check"><input name="useAds" type="checkbox" defaultChecked={channel.useAds} /><span>Use ads</span></label>
                    </div>
                    <button className="primary-button" type="submit"><Save size={16} /> Save settings</button>
                    <button className="danger-button" type="button" onClick={() => void run(() => api(`/api/internal/channels/${channel.id}`, { method: "DELETE" }), "Channel deleted")}><Trash2 size={16} /> Delete</button>
                  </form>

                  <div className="programming">
                    <div className="subhead"><div><span className="panel-kicker">Schedule</span><h3>Channel content</h3></div></div>
                    <div className="linked-items">
                      {channel.media.map((link) => (
                        <div className="linked-row" key={link.id}>
                          <span className="position">{String(link.position + 1).padStart(2, "0")}</span>
                          <div><strong>{link.media.title}</strong><small>{link.media.type.toLowerCase()} · {link.media.year ?? "year unknown"}</small></div>
                          <label className="compact-field"><span>Position</span><input type="number" defaultValue={link.position} onBlur={(event) => void run(() => api(`/api/internal/channels/${channel.id}/media/${link.mediaId}`, { method: "PATCH", body: JSON.stringify({ position: Number(event.target.value) }) }), "Order updated")} /></label>
                          <button className="icon-button danger" onClick={() => void run(() => api(`/api/internal/channels/${channel.id}/media/${link.mediaId}`, { method: "DELETE" }), "Content unlinked")}><Trash2 size={15} /></button>
                        </div>
                      ))}
                      {!channel.media.length && <p className="muted">Nothing scheduled yet.</p>}
                    </div>
                    <form className="inline-form" onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void run(() => api(`/api/internal/channels/${channel.id}/media`, { method: "POST", body: JSON.stringify({ mediaId: form.get("mediaId"), position: channel.media.length, weight: 1, enabled: true }) }), "Content linked");
                    }}>
                      <select name="mediaId" required defaultValue=""><option value="" disabled>Add content…</option>{media.filter((item) => !channel.media.some((linked) => linked.mediaId === item.id)).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select>
                      <button className="secondary-button" type="submit"><Plus size={16} /> Add to channel</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === "content" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createMedia}>
              <div><span className="panel-kicker">Library</span><h2>Add content</h2></div>
              <label><span>Title</span><input name="title" placeholder="Title" required /></label>
              <label><span>Type</span><select name="type"><option value="MOVIE">Movie</option><option value="SERIES">Series</option><option value="EPISODE">Episode</option><option value="CARTOON">Cartoon</option></select></label>
              <label><span>Year</span><input name="year" type="number" min="1888" max="2100" /></label>
              <label><span>Series name</span><input name="seriesTitle" placeholder="For episodes" /></label>
              <label><span>Season</span><input name="seasonNumber" type="number" min="1" /></label>
              <label><span>Episode</span><input name="episodeNumber" type="number" min="1" /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Add content</button>
            </form>
            <div className="data-table">
              <div className="table-head"><span>Title</span><span>Type</span><span>Year</span><span>Sources</span><span>Status</span><span /></div>
              {media.map((item) => (
                <div className="table-row" key={item.id}>
                  <div><strong>{item.title}</strong>{item.seriesTitle && <small>{item.seriesTitle} · S{item.seasonNumber} E{item.episodeNumber}</small>}</div>
                  <span className="type-pill">{item.type}</span><span>{item.year ?? "—"}</span><span>{item.sources.length}</span>
                  <button className={`state-toggle ${item.enabled ? "on" : ""}`} onClick={() => void run(() => api(`/api/internal/media/${item.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !item.enabled }) }), "Content status updated")}>{item.enabled ? "Active" : "Inactive"}</button>
                  <button className="icon-button danger" onClick={() => void run(() => api(`/api/internal/media/${item.id}`, { method: "DELETE" }), "Content deleted")}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === "sources" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createSource}>
              <div><span className="panel-kicker">Resolver</span><h2>Connect source</h2></div>
              <label><span>Content</span><select name="mediaId" required defaultValue=""><option value="" disabled>Select title…</option>{media.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
              <label><span>Provider</span><select name="provider"><option value="INTERNET_ARCHIVE">Internet Archive</option><option value="DIRECT_URL">Direct URL</option><option value="LOCAL">Local</option><option value="EXTERNAL">External (future)</option></select></label>
              <label><span>Archive identifier</span><input name="externalId" placeholder="his_girl_friday" /></label>
              <label className="wide"><span>Stream URL</span><input name="streamUrl" type="url" placeholder="Optional for Archive; required for Direct URL" /></label>
              <label><span>Priority</span><input name="priority" type="number" defaultValue="10" /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Connect</button>
            </form>
            <div className="source-grid">
              {media.flatMap((item) => item.sources.map((source) => (
                <article className="source-card" key={source.id}>
                  <div className="source-icon"><Cable size={20} /></div>
                  <div className="source-title"><span>{source.provider}</span><h3>{item.title}</h3></div>
                  <dl><div><dt>URL / ID</dt><dd title={source.streamUrl ?? source.iframeUrl ?? source.externalId ?? ""}>{source.streamUrl ?? source.iframeUrl ?? source.externalId ?? "—"}</dd></div><div><dt>Priority</dt><dd>{source.priority}</dd></div></dl>
                  <div className="source-actions">
                    <button className={`state-toggle ${source.enabled ? "on" : ""}`} onClick={() => void run(() => api(`/api/internal/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !source.enabled }) }), "Source status updated")}>{source.enabled ? "Active" : "Inactive"}</button>
                    <button className="icon-button danger" onClick={() => void run(() => api(`/api/internal/sources/${source.id}`, { method: "DELETE" }), "Source deleted")}><Trash2 size={15} /></button>
                  </div>
                </article>
              )))}
            </div>
          </div>
        )}

        {!loading && tab === "ads" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createAd}>
              <div><span className="panel-kicker">Interstitials</span><h2>Add clip</h2></div>
              <label><span>Title</span><input name="title" placeholder="Station ident" required /></label>
              <label><span>Type</span><select name="type"><option value="TRAILER">Trailer</option><option value="AD">Ad</option></select></label>
              <label className="wide"><span>Video URL</span><input name="videoUrl" type="url" placeholder="https://…/clip.mp4" required /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Add clip</button>
            </form>
            <div className="stack-list">
              {ads.map((ad) => (
                <article className="admin-card ad-row" key={ad.id}>
                  <div className="ad-icon"><Clapperboard size={21} /></div>
                  <div><span className="type-pill">{ad.type}</span><h3>{ad.title}</h3><p title={ad.videoUrl}>{ad.videoUrl}</p><small>{ad.channels.length ? `Used by ${ad.channels.map((item) => item.channel.name).join(", ")}` : "Not assigned"}</small></div>
                  <form className="assign-form" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const channelId = String(form.get("channelId"));
                    void run(() => api(`/api/internal/channels/${channelId}/ads`, { method: "POST", body: JSON.stringify({ adId: ad.id, position: 0, enabled: true }) }), "Clip assigned");
                  }}><select name="channelId" required defaultValue=""><option value="" disabled>Assign to…</option>{channels.filter((channel) => !ad.channels.some((link) => link.channelId === channel.id)).map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}</select><button className="secondary-button"><Plus size={15} /></button></form>
                  <button className={`state-toggle ${ad.enabled ? "on" : ""}`} onClick={() => void run(() => api(`/api/internal/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !ad.enabled }) }), "Clip status updated")}>{ad.enabled ? "Active" : "Inactive"}</button>
                  <button className="icon-button danger" onClick={() => void run(() => api(`/api/internal/ads/${ad.id}`, { method: "DELETE" }), "Clip deleted")}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
