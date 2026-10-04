export type PublicChannel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accent: string;
  enabled: boolean;
  playbackMode: string;
};

export type PlaybackItem = {
  historyId: string;
  kind: "MEDIA" | "INTERSTITIAL";
  id: string;
  type: string;
  title: string;
  year: number | null;
  seriesTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  startedAt: string;
  source: {
    type: "direct" | "iframe";
    url: string;
    provider: string;
  };
};

export type PlaybackResponse = {
  channel: PublicChannel;
  item: PlaybackItem;
  next: string[];
};
