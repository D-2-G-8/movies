"use client";

import Link from "next/link";
import { ArrowLeft, Info, LoaderCircle, Radio, RotateCcw, SkipForward, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackResponse } from "@/lib/types";

export function ChannelPlayer() {
  const params = useParams<{ id: string }>();
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const advancing = useRef(false);

  const load = useCallback(async (advance = false) => {
    if (advancing.current) return;
    advancing.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/channels/${params.id}/${advance ? "next" : "playback"}`, {
        method: advance ? "POST" : "GET",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The signal is unavailable");
      setPlayback(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The signal is unavailable");
    } finally {
      advancing.current = false;
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const detail = playback?.item.seriesTitle
    ? `${playback.item.seriesTitle} · S${playback.item.seasonNumber ?? "–"} E${playback.item.episodeNumber ?? "–"}`
    : null;

  return (
    <main className="player-page" style={{ "--accent": playback?.channel.accent ?? "#d7ff64" } as React.CSSProperties}>
      <header className="player-header">
        <Link href="/" className="round-button" aria-label="Back to channels"><ArrowLeft size={20} /></Link>
        <div className="player-channel">
          <span className="live-badge"><i /> Live</span>
          <strong>{playback?.channel.name ?? "Tuning…"}</strong>
        </div>
        <button className="round-button" onClick={() => setInfoOpen(true)} aria-label="Program information"><Info size={20} /></button>
      </header>

      <section className="screen-wrap">
        <div className="screen">
          {playback?.item.source.type === "iframe" ? (
            <iframe key={playback.item.historyId} src={playback.item.source.url} allow="autoplay; fullscreen" title={playback.item.title} />
          ) : playback ? (
            <video
              key={playback.item.historyId}
              src={playback.item.source.url}
              autoPlay
              controls
              playsInline
              onEnded={() => void load(true)}
            />
          ) : null}

          {loading && (
            <div className="screen-message"><LoaderCircle className="spin" size={30} /><span>Finding the signal</span></div>
          )}
          {error && (
            <div className="screen-message error-message">
              <Radio size={32} />
              <strong>{error}</strong>
              <button className="primary-button" onClick={() => void load()}><RotateCcw size={17} /> Try again</button>
            </div>
          )}
          {playback && !loading && (
            <div className="now-strip">
              <div><span>Now playing</span><strong>{playback.item.title}</strong></div>
              <button onClick={() => void load(true)} aria-label="Skip to next"><SkipForward size={19} /></button>
            </div>
          )}
        </div>
      </section>

      <div className={`info-drawer ${infoOpen ? "open" : ""}`}>
        <button className="drawer-close" onClick={() => setInfoOpen(false)} aria-label="Close information"><X size={20} /></button>
        <span className="eyebrow">Program information</span>
        <h2>{playback?.item.title ?? "No program"}</h2>
        {detail && <p className="series-detail">{detail}</p>}
        <dl>
          <div><dt>Type</dt><dd>{playback?.item.type.toLowerCase()}</dd></div>
          <div><dt>Year</dt><dd>{playback?.item.year ?? "—"}</dd></div>
          <div><dt>Channel</dt><dd>{playback?.channel.name ?? "—"}</dd></div>
        </dl>
        <p className="drawer-note">The channel chooses what plays next according to its schedule.</p>
      </div>
      {infoOpen && <button className="drawer-backdrop" aria-label="Close information" onClick={() => setInfoOpen(false)} />}
    </main>
  );
}
