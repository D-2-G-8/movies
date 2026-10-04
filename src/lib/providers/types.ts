import type { Media, MediaSource } from "@prisma/client";

export type MediaWithSources = Media & { sources: MediaSource[] };

export type ResolvedSource = {
  type: "direct" | "iframe";
  url: string;
  provider: string;
  priority: number;
};

export interface MediaProvider {
  name: string;
  resolve(media: MediaWithSources): Promise<ResolvedSource[]>;
}
