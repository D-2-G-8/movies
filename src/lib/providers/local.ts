import type { MediaProvider, ResolvedSource } from "./types";

export class LocalProvider implements MediaProvider {
  name = "LOCAL";

  async resolve(media: Parameters<MediaProvider["resolve"]>[0]) {
    return media.sources
      .filter((source) => source.enabled && source.provider === this.name && source.streamUrl)
      .map<ResolvedSource>((source) => ({
        type: "direct",
        url: source.streamUrl!,
        provider: this.name,
        priority: source.priority,
      }));
  }
}
