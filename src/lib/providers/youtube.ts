import type { MediaProvider } from "./types";

const youtubeId = /^[A-Za-z0-9_-]{11}$/;

export class YoutubeProvider implements MediaProvider {
  name = "YOUTUBE";

  async resolve(media: Parameters<MediaProvider["resolve"]>[0]) {
    return media.sources
      .filter(
        (source) =>
          source.enabled &&
          source.provider === this.name &&
          source.externalId &&
          youtubeId.test(source.externalId),
      )
      .map((source) => ({
        type: "iframe" as const,
        url: `https://www.youtube-nocookie.com/embed/${source.externalId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`,
        provider: this.name,
        priority: source.priority,
      }));
  }
}
