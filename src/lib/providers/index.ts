import { DirectUrlProvider } from "./direct-url";
import { FutureExternalProvider } from "./future-external";
import { InternetArchiveProvider } from "./internet-archive";
import { YoutubeProvider } from "./youtube";
import type { MediaWithSources, ResolvedSource } from "./types";

const providers = [
  new YoutubeProvider(),
  new DirectUrlProvider(),
  new InternetArchiveProvider(),
  new FutureExternalProvider(),
];

export async function resolveMedia(media: MediaWithSources): Promise<ResolvedSource | null> {
  const resolved = (await Promise.all(providers.map((provider) => provider.resolve(media))))
    .flat()
    .sort((a, b) => b.priority - a.priority);

  return resolved[0] ?? null;
}

export type { MediaProvider, ResolvedSource } from "./types";
