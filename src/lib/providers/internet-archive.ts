import type { MediaSource } from "@prisma/client";
import type { MediaProvider, ResolvedSource } from "./types";

type ArchiveFile = {
  name?: string;
  format?: string;
  size?: string;
  private?: boolean;
};

type ArchiveMetadata = {
  is_dark?: boolean;
  files?: ArchiveFile[];
};

function fileScore(file: ArchiveFile) {
  const format = file.format?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";
  if (format.includes("512kb mpeg4")) return 30;
  if (name.includes("512kb")) return 20;
  if (format.includes("h.264") || format.includes("mpeg4")) return 10;
  return 0;
}

function archiveDownloadUrl(identifier: string, name: string) {
  const encodedName = name.split("/").map(encodeURIComponent).join("/");
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedName}`;
}

async function resolveArchiveSource(source: MediaSource): Promise<ResolvedSource | null> {
  if (source.streamUrl) {
    return {
      type: "direct",
      url: source.streamUrl,
      provider: "INTERNET_ARCHIVE",
      priority: source.priority,
    };
  }

  const identifier = source.externalId?.trim();
  if (!identifier) return null;

  try {
    const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    const metadata = (await response.json()) as ArchiveMetadata;
    if (metadata.is_dark || !metadata.files) return null;

    const file = metadata.files
      .filter((item): item is ArchiveFile & { name: string } =>
        Boolean(item.name?.toLowerCase().endsWith(".mp4")) && !item.private,
      )
      .sort((a, b) => {
        const scoreDifference = fileScore(b) - fileScore(a);
        if (scoreDifference) return scoreDifference;
        return Number(a.size ?? Number.MAX_SAFE_INTEGER) - Number(b.size ?? Number.MAX_SAFE_INTEGER);
      })[0];

    return file
      ? {
          type: "direct",
          url: archiveDownloadUrl(identifier, file.name),
          provider: "INTERNET_ARCHIVE",
          priority: source.priority,
        }
      : null;
  } catch {
    return null;
  }
}

export class InternetArchiveProvider implements MediaProvider {
  name = "INTERNET_ARCHIVE";

  async resolve(media: Parameters<MediaProvider["resolve"]>[0]) {
    const sources = media.sources.filter((source) => source.enabled && source.provider === this.name);
    const resolved = await Promise.all(sources.map(resolveArchiveSource));
    return resolved.filter((source): source is ResolvedSource => source !== null);
  }
}
