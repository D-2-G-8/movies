"use client";

import Link from "next/link";
import { ArrowUpRight, Radio, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicChannel } from "@/lib/types";

type ChannelCard = PublicChannel & { _count: { media: number } };

function channelCount(value: number) {
  const ending = value % 10 === 1 && value % 100 !== 11 ? "канал" : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20) ? "канала" : "каналов";
  return `${value} ${ending}`;
}

function titleCount(value: number) {
  const ending = value % 10 === 1 && value % 100 !== 11 ? "название" : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20) ? "названия" : "названий";
  return `${value} ${ending}`;
}

export default function Home() {
  const [channels, setChannels] = useState<ChannelCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/channels", { cache: "no-store" })
      .then((response) => response.json())
      .then(setChannels)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="home-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark"><Radio size={18} /></span>
          Nightwave
        </Link>
        <Link className="ghost-button" href="/admin"><Settings2 size={16} /> Студия</Link>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span className="live-dot" /> Сейчас в эфире</div>
        <h1>Не выбирай.<br /><span>Просто включай.</span></h1>
        <p>Твой личный кинотеатр, который всегда в эфире. Выбирай канал — там уже что-то идёт.</p>
      </section>

      <section className="channel-section">
        <div className="section-heading">
          <h2>Каналы в эфире</h2>
          <span>{channelCount(channels.length)}</span>
        </div>

        {loading ? (
          <div className="channel-grid">
            {[0, 1, 2].map((item) => <div className="channel-card skeleton" key={item} />)}
          </div>
        ) : channels.length ? (
          <div className="channel-grid">
            {channels.map((channel, index) => (
              <Link
                href={`/channel/${channel.slug}`}
                className="channel-card"
                key={channel.id}
                style={{ "--accent": channel.accent } as React.CSSProperties}
              >
                <div className="channel-glow" />
                <div className="channel-topline">
                  <span>КАНАЛ {String(index + 1).padStart(2, "0")}</span>
                  <span className="channel-status"><i /> В эфире</span>
                </div>
                <div className="channel-title">
                  <h3>{channel.name}</h3>
                  <p>{channel.description}</p>
                </div>
                <div className="channel-meta">
                  <span>{channel.playbackMode === "RANDOM" ? "случайный порядок" : "по порядку"} · {titleCount(channel._count.media)}</span>
                  <span className="tune-in">Смотреть <ArrowUpRight size={18} /></span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">Сейчас нет активных каналов. Включи канал в Студии.</div>
        )}
      </section>

      <footer className="home-footer">
        <span>Личная система вещания Nightwave</span>
        <span>Прямой эфир · SQLite</span>
      </footer>
    </main>
  );
}
