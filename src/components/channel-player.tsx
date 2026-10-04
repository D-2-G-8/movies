"use client";

import Link from "next/link";
import { ArrowLeft, Info, LoaderCircle, Radio, RotateCcw, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackResponse } from "@/lib/types";

const typeLabels: Record<string, string> = {
  MOVIE: "Фильм",
  SERIES: "Сериал",
  EPISODE: "Серия",
  CARTOON: "Мультфильм",
  TRAILER: "Трейлер",
  AD: "Реклама",
};

export function ChannelPlayer() {
  const params = useParams<{ id: string }>();
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const advancing = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      if (!response.ok) throw new Error(result.error ?? "Сигнал недоступен");
      setMuted(true);
      setPlayback(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Сигнал недоступен");
    } finally {
      advancing.current = false;
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const handlePlayerMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube-nocookie.com" || event.source !== iframeRef.current?.contentWindow) return;
      try {
        const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (message?.event === "onStateChange" && message.info === 0) void load(true);
      } catch {
        // Встроенный плеер также отправляет служебные сообщения, которые не являются JSON.
      }
    };
    window.addEventListener("message", handlePlayerMessage);
    return () => window.removeEventListener("message", handlePlayerMessage);
  }, [load]);

  const toggleSound = () => {
    if (playback?.item.source.provider === "YOUTUBE") {
      const player = iframeRef.current?.contentWindow;
      const command = { event: "command", func: muted ? "unMute" : "mute", args: [] };
      player?.postMessage(JSON.stringify(command), "https://www.youtube-nocookie.com");
      if (muted) player?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "https://www.youtube-nocookie.com");
    }
    setMuted((value) => !value);
  };

  const startYoutubeEvents = () => {
    if (playback?.item.source.provider !== "YOUTUBE") return;
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "https://www.youtube-nocookie.com");
  };

  const detail = playback?.item.seriesTitle
    ? [
        playback.item.seriesTitle,
        playback.item.seasonNumber ? `сезон ${playback.item.seasonNumber}` : null,
        playback.item.episodeNumber ? `серия ${playback.item.episodeNumber}` : null,
      ].filter(Boolean).join(" · ")
    : null;

  return (
    <main className="player-page" style={{ "--accent": playback?.channel.accent ?? "#d7ff64" } as React.CSSProperties}>
      <header className="player-header">
        <Link href="/" className="round-button" aria-label="Вернуться к каналам"><ArrowLeft size={20} /></Link>
        <div className="player-channel">
          <span className="live-badge"><i /> В эфире</span>
          <strong>{playback?.channel.name ?? "Настраиваем канал…"}</strong>
        </div>
        <button className="round-button" onClick={() => setInfoOpen(true)} aria-label="Информация о программе"><Info size={20} /></button>
      </header>

      <section className="screen-wrap">
        <div className="screen">
          {playback?.item.source.type === "iframe" ? (
            <iframe ref={iframeRef} key={playback.item.historyId} src={playback.item.source.url} onLoad={startYoutubeEvents} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen title={playback.item.title} />
          ) : playback ? (
            <video
              key={playback.item.historyId}
              src={playback.item.source.url}
              autoPlay
              muted={muted}
              controls
              playsInline
              onEnded={() => void load(true)}
            />
          ) : null}

          {loading && (
            <div className="screen-message"><LoaderCircle className="spin" size={30} /><span>Ищем сигнал</span></div>
          )}
          {error && (
            <div className="screen-message error-message">
              <Radio size={32} />
              <strong>{error}</strong>
              <button className="primary-button" onClick={() => void load()}><RotateCcw size={17} /> Повторить</button>
            </div>
          )}
          {playback && !loading && (
            <>
              {(playback.item.source.type === "direct" || playback.item.source.provider === "YOUTUBE") && (
                <button className="sound-toggle" onClick={toggleSound}>
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {muted ? "Включить звук" : "Звук включён"}
                </button>
              )}
              <div className="now-strip">
                <div><span>Сейчас идёт</span><strong>{playback.item.title}</strong></div>
                <button onClick={() => void load(true)} aria-label="Переключить на следующее"><SkipForward size={19} /></button>
              </div>
            </>
          )}
        </div>
      </section>

      <div className={`info-drawer ${infoOpen ? "open" : ""}`}>
        <button className="drawer-close" onClick={() => setInfoOpen(false)} aria-label="Закрыть информацию"><X size={20} /></button>
        <span className="eyebrow">О программе</span>
        <h2>{playback?.item.title ?? "Нет программы"}</h2>
        {detail && <p className="series-detail">{detail}</p>}
        <dl>
          <div><dt>Тип</dt><dd>{playback ? typeLabels[playback.item.type] ?? playback.item.type : "—"}</dd></div>
          <div><dt>Год</dt><dd>{playback?.item.year ?? "—"}</dd></div>
          <div><dt>Канал</dt><dd>{playback?.channel.name ?? "—"}</dd></div>
        </dl>
        <p className="drawer-note">Следующую программу канал выберет автоматически по своему расписанию.</p>
      </div>
      {infoOpen && <button className="drawer-backdrop" aria-label="Закрыть информацию" onClick={() => setInfoOpen(false)} />}
    </main>
  );
}
