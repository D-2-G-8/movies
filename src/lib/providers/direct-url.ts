import type { MediaProvider, ResolvedSource } from "./types";

export class DirectUrlProvider implements MediaProvider {
  name = "DIRECT_URL";

  async resolve(media: Parameters<MediaProvider["resolve"]>[0]) {
    return media.sources
      .filter((source) => source.enabled && source.provider === this.name)
      .flatMap<ResolvedSource>((source) => {
        if (source.streamUrl) {
          return [{ type: "direct", url: source.streamUrl, provider: this.name, priority: source.priority }];
        }
        if (source.iframeUrl) {
          return [{ type: "iframe", url: source.iframeUrl, provider: this.name, priority: source.priority }];
        }
        return [];
      });
  }
}
