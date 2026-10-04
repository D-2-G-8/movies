"use client";

import Link from "next/link";
import { ArrowUpRight, Radio, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicChannel } from "@/lib/types";

type ChannelCard = PublicChannel & { _count: { media: number } };

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
        <Link className="ghost-button" href="/admin"><Settings2 size={16} /> Studio</Link>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span className="live-dot" /> On air now</div>
        <h1>Don’t choose.<br /><span>Just tune in.</span></h1>
        <p>Your small, always-on cinema. Pick a frequency and see what’s playing.</p>
      </section>

      <section className="channel-section">
        <div className="section-heading">
          <h2>Live channels</h2>
          <span>{channels.length} frequencies</span>
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
                  <span>CH {String(index + 1).padStart(2, "0")}</span>
                  <span className="channel-status"><i /> Live</span>
                </div>
                <div className="channel-title">
                  <h3>{channel.name}</h3>
                  <p>{channel.description}</p>
                </div>
                <div className="channel-meta">
                  <span>{channel.playbackMode.toLowerCase()} · {channel._count.media} titles</span>
                  <span className="tune-in">Tune in <ArrowUpRight size={18} /></span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">No channel is broadcasting. Enable one in Studio.</div>
        )}
      </section>

      <footer className="home-footer">
        <span>Nightwave private broadcast system</span>
        <span>Local signal · SQLite</span>
      </footer>
    </main>
  );
}
