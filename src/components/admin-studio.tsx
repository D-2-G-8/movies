"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  ArrowLeft,
  Cable,
  Check,
  ChevronRight,
  Clapperboard,
  Film,
  LoaderCircle,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Source = {
  id: string;
  mediaId: string;
  provider: string;
  externalId: string | null;
  streamUrl: string | null;
  iframeUrl: string | null;
  priority: number;
  enabled: boolean;
};

type Media = {
  id: string;
  title: string;
  originalTitle: string | null;
  type: string;
  year: number | null;
  enabled: boolean;
  description: string | null;
  posterUrl: string | null;
  kinopoiskId: string | null;
  kinopoiskUrl: string | null;
  genres: string | null;
  countries: string | null;
  directors: string | null;
  cast: string | null;
  rating: number | null;
  ratingCount: number | null;
  ageRating: string | null;
  durationSeconds: number;
  seriesTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  sources: Source[];
};

type KinopoiskDraft = Omit<Media, "id" | "enabled" | "seriesTitle" | "seasonNumber" | "episodeNumber" | "sources" | "kinopoiskId" | "kinopoiskUrl"> & {
  kinopoiskId: string;
  kinopoiskUrl: string;
  existing: { id: string; title: string } | null;
};

type Ad = {
  id: string;
  title: string;
  type: string;
  videoUrl: string;
  enabled: boolean;
  channels: { channelId: string; channel: { name: string } }[];
};

type Channel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accent: string;
  enabled: boolean;
  playbackMode: string;
  repeatDays: number;
  interstitialCount: number;
  useTrailers: boolean;
  useAds: boolean;
  interstitialMode: string;
  interstitialRepeatDays: number;
  media: { id: string; mediaId: string; position: number; weight: number; enabled: boolean; media: Media }[];
  ads: { id: string; adId: string; position: number; enabled: boolean; ad: Ad }[];
  _count: { history: number };
};

type Tab = "channels" | "content" | "sources" | "ads";

const tabs: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: "channels", label: "Каналы", icon: Radio },
  { id: "content", label: "Контент", icon: Film },
  { id: "sources", label: "Источники", icon: Cable },
  { id: "ads", label: "Реклама и трейлеры", icon: Clapperboard },
];

const typeLabels: Record<string, string> = {
  MOVIE: "Фильм",
  SERIES: "Сериал",
  EPISODE: "Серия",
  CARTOON: "Мультфильм",
  TRAILER: "Трейлер",
  AD: "Реклама",
};

const providerLabels: Record<string, string> = {
  YOUTUBE: "YouTube",
  INTERNET_ARCHIVE: "Internet Archive",
  DIRECT_URL: "Прямая ссылка",
  EXTERNAL: "Внешний источник",
};

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Не удалось выполнить запрос");
  return payload;
}

function intValue(form: FormData, key: string, fallback = 0) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function plural(value: number, one: string, few: string, many: string) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function AdminStudio() {
  const [tab, setTab] = useState<Tab>("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [kinopoiskUrl, setKinopoiskUrl] = useState("");
  const [kinopoiskDraft, setKinopoiskDraft] = useState<KinopoiskDraft | null>(null);
  const [importing, setImporting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [channelData, mediaData, adData] = await Promise.all([
        api("/api/internal/channels"),
        api("/api/internal/media"),
        api("/api/internal/ads"),
      ]);
      setChannels(channelData);
      setMedia(mediaData);
      setAds(adData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось загрузить Студию");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      setNotice(message);
      await loadAll();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Что-то пошло не так");
    }
  };

  const createChannel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void run(
      () => api("/api/internal/channels", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          accent: form.get("accent"),
          playbackMode: form.get("playbackMode"),
          enabled: true,
        }),
      }),
      "Канал создан",
    ).then(() => formElement.reset());
  };

  const saveChannel = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      () => api(`/api/internal/channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
          description: form.get("description"),
          accent: form.get("accent"),
          enabled: form.get("enabled") === "on",
          playbackMode: form.get("playbackMode"),
          repeatDays: intValue(form, "repeatDays"),
          interstitialCount: intValue(form, "interstitialCount"),
          useTrailers: form.get("useTrailers") === "on",
          useAds: form.get("useAds") === "on",
          interstitialMode: form.get("interstitialMode"),
          interstitialRepeatDays: intValue(form, "interstitialRepeatDays"),
        }),
      }),
      "Настройки канала сохранены",
    );
  };

  const createMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void run(
      () => api("/api/internal/media", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          type: form.get("type"),
          year: form.get("year"),
          seriesTitle: form.get("seriesTitle"),
          seasonNumber: form.get("seasonNumber"),
          episodeNumber: form.get("episodeNumber"),
          enabled: true,
        }),
      }),
      "Контент добавлен",
    ).then(() => formElement.reset());
  };

  const previewKinopoisk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImporting(true);
    setKinopoiskDraft(null);
    try {
      const draft = await api("/api/internal/media/import/kinopoisk", {
        method: "POST",
        body: JSON.stringify({ url: kinopoiskUrl }),
      });
      setKinopoiskDraft(draft);
      if (draft.existing) setNotice(`Уже есть в библиотеке: ${draft.existing.title}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось получить данные с Кинопоиска");
    } finally {
      setImporting(false);
    }
  };

  const saveKinopoisk = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!kinopoiskDraft || kinopoiskDraft.existing) return;
    const form = new FormData(event.currentTarget);
    void run(
      () => api("/api/internal/media", {
        method: "POST",
        body: JSON.stringify({
          ...kinopoiskDraft,
          existing: undefined,
          title: form.get("title"),
          originalTitle: form.get("originalTitle"),
          type: form.get("type"),
          year: form.get("year"),
          description: form.get("description"),
          durationSeconds: intValue(form, "durationMinutes", 5) * 60,
          enabled: true,
        }),
      }),
      "Карточка добавлена из Кинопоиска",
    ).then(() => {
      setKinopoiskDraft(null);
      setKinopoiskUrl("");
    });
  };

  const createSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const mediaId = String(form.get("mediaId"));
    void run(
      () => api(`/api/internal/media/${mediaId}/sources`, {
        method: "POST",
        body: JSON.stringify({
          provider: form.get("provider"),
          externalId: form.get("externalId"),
          streamUrl: form.get("streamUrl"),
          priority: intValue(form, "priority"),
          enabled: true,
        }),
      }),
      "Источник подключён",
    ).then(() => formElement.reset());
  };

  const createAd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void run(
      () => api("/api/internal/ads", {
        method: "POST",
        body: JSON.stringify({ title: form.get("title"), type: form.get("type"), videoUrl: form.get("videoUrl"), enabled: true }),
      }),
      "Ролик добавлен",
    ).then(() => formElement.reset());
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" href="/"><span className="brand-mark"><Radio size={18} /></span>Nightwave</Link>
        <div className="studio-label">Студия</div>
        <nav>
          {tabs.map((item) => {
            const Icon = item.icon;
            return <button className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} key={item.id}><Icon size={18} />{item.label}</button>;
          })}
        </nav>
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Вернуться в кинотеатр</Link>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div><span className="eyebrow">Управление эфиром</span><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div>
          <button className="icon-text-button" onClick={() => void loadAll()}><RefreshCw size={16} /> Обновить</button>
        </header>

        {notice && <button className="notice" onClick={() => setNotice("")}><Check size={16} />{notice}</button>}
        {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Загружаем Студию</div> : null}

        {!loading && tab === "channels" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createChannel}>
              <div><span className="panel-kicker">Новая частота</span><h2>Создать канал</h2></div>
              <label><span>Название</span><input name="name" placeholder="Фантастика на ночь" required /></label>
              <label className="wide"><span>Описание</span><input name="description" placeholder="Коротко расскажи о канале" /></label>
              <label><span>Порядок</span><select name="playbackMode"><option value="ORDERED">По порядку</option><option value="RANDOM">Случайный</option></select></label>
              <label><span>Цвет</span><input type="color" name="accent" defaultValue="#d7ff64" /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Создать</button>
            </form>

            <div className="stack-list">
              {channels.map((channel) => (
                <article className="admin-card channel-editor" key={channel.id} style={{ "--accent": channel.accent } as React.CSSProperties}>
                  <div className="card-head">
                    <div><span className="status-line"><i /> {channel.enabled ? "В эфире" : "Выключен"}</span><h2>{channel.name}</h2><p>{channel.media.length} {plural(channel.media.length, "материал", "материала", "материалов")} · {channel._count.history} {plural(channel._count.history, "запуск", "запуска", "запусков")}</p></div>
                    <Link href={`/channel/${channel.slug}`} className="mini-link">Открыть канал <ChevronRight size={15} /></Link>
                  </div>
                  <form className="settings-grid" onSubmit={(event) => saveChannel(event, channel.id)}>
                    <label><span>Название</span><input name="name" defaultValue={channel.name} required /></label>
                    <label><span>Адрес</span><input name="slug" defaultValue={channel.slug} required /></label>
                    <label className="wide"><span>Описание</span><input name="description" defaultValue={channel.description ?? ""} /></label>
                    <label><span>Воспроизведение</span><select name="playbackMode" defaultValue={channel.playbackMode}><option value="ORDERED">По порядку</option><option value="RANDOM">Случайно</option></select></label>
                    <label><span>Повтор контента, дней</span><input name="repeatDays" type="number" min="0" defaultValue={channel.repeatDays} /></label>
                    <label><span>Роликов между показами</span><input name="interstitialCount" type="number" min="0" defaultValue={channel.interstitialCount} /></label>
                    <label><span>Порядок роликов</span><select name="interstitialMode" defaultValue={channel.interstitialMode}><option value="RANDOM">Случайно</option><option value="ORDERED">По порядку</option></select></label>
                    <label><span>Повтор роликов, дней</span><input name="interstitialRepeatDays" type="number" min="0" defaultValue={channel.interstitialRepeatDays} /></label>
                    <label><span>Цвет</span><input name="accent" type="color" defaultValue={channel.accent} /></label>
                    <div className="check-row wide">
                      <label className="check"><input name="enabled" type="checkbox" defaultChecked={channel.enabled} /><span>Канал активен</span></label>
                      <label className="check"><input name="useTrailers" type="checkbox" defaultChecked={channel.useTrailers} /><span>Показывать трейлеры</span></label>
                      <label className="check"><input name="useAds" type="checkbox" defaultChecked={channel.useAds} /><span>Показывать рекламу</span></label>
                    </div>
                    <button className="primary-button" type="submit"><Save size={16} /> Сохранить</button>
                    <button className="danger-button" type="button" onClick={() => void run(() => api(`/api/internal/channels/${channel.id}`, { method: "DELETE" }), "Канал удалён")}><Trash2 size={16} /> Удалить</button>
                  </form>

                  <div className="programming">
                    <div className="subhead"><div><span className="panel-kicker">Расписание</span><h3>Контент канала</h3></div></div>
                    <div className="linked-items">
                      {channel.media.map((link) => (
                        <div className="linked-row" key={link.id}>
                          <span className="position">{String(link.position + 1).padStart(2, "0")}</span>
                          <div><strong>{link.media.title}</strong><small>{typeLabels[link.media.type] ?? link.media.type} · {link.media.year ?? "год неизвестен"}</small></div>
                          <label className="compact-field"><span>Позиция</span><input type="number" defaultValue={link.position} onBlur={(event) => void run(() => api(`/api/internal/channels/${channel.id}/media/${link.mediaId}`, { method: "PATCH", body: JSON.stringify({ position: Number(event.target.value) }) }), "Порядок обновлён")} /></label>
                          <button className="icon-button danger" aria-label="Убрать с канала" onClick={() => void run(() => api(`/api/internal/channels/${channel.id}/media/${link.mediaId}`, { method: "DELETE" }), "Контент убран с канала")}><Trash2 size={15} /></button>
                        </div>
                      ))}
                      {!channel.media.length && <p className="muted">В расписании пока ничего нет.</p>}
                    </div>
                    <form className="inline-form" onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void run(() => api(`/api/internal/channels/${channel.id}/media`, { method: "POST", body: JSON.stringify({ mediaId: form.get("mediaId"), position: channel.media.length, weight: 1, enabled: true }) }), "Контент добавлен на канал");
                    }}>
                      <select name="mediaId" required defaultValue=""><option value="" disabled>Выбрать контент…</option>{media.filter((item) => !channel.media.some((linked) => linked.mediaId === item.id)).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select>
                      <button className="secondary-button" type="submit"><Plus size={16} /> Добавить на канал</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === "content" && (
          <div className="admin-content">
            <form className="create-panel kinopoisk-import" onSubmit={previewKinopoisk}>
              <div><span className="panel-kicker">Импорт метаданных</span><h2>Добавить по ссылке Кинопоиска</h2></div>
              <label className="kinopoisk-url"><span>Ссылка</span><input type="url" value={kinopoiskUrl} onChange={(event) => setKinopoiskUrl(event.target.value)} placeholder="https://www.kinopoisk.ru/film/4860213/" required /></label>
              <button className="primary-button" type="submit" disabled={importing}>{importing ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} {importing ? "Читаем карточку" : "Получить данные"}</button>
            </form>

            {kinopoiskDraft && (
              <form className="kinopoisk-preview" onSubmit={saveKinopoisk}>
                <div className="kinopoisk-poster">
                  {kinopoiskDraft.posterUrl ? <img src={kinopoiskDraft.posterUrl} alt={`Постер: ${kinopoiskDraft.title}`} /> : <Film size={28} />}
                </div>
                <div className="kinopoisk-card-body">
                  <div className="kinopoisk-card-head">
                    <div><span className="panel-kicker">Карточка заполнена автоматически</span><h2>{kinopoiskDraft.title}</h2></div>
                    <a href={kinopoiskDraft.kinopoiskUrl} target="_blank" rel="noreferrer">Открыть на Кинопоиске</a>
                  </div>
                  <div className="kinopoisk-fields">
                    <label><span>Название</span><input name="title" defaultValue={kinopoiskDraft.title} required /></label>
                    <label><span>Оригинальное название</span><input name="originalTitle" defaultValue={kinopoiskDraft.originalTitle ?? ""} /></label>
                    <label><span>Тип</span><select name="type" defaultValue={kinopoiskDraft.type}><option value="MOVIE">Фильм</option><option value="SERIES">Сериал</option><option value="CARTOON">Мультфильм</option></select></label>
                    <label><span>Год</span><input name="year" type="number" defaultValue={kinopoiskDraft.year ?? ""} /></label>
                    <label><span>Длительность, мин</span><input name="durationMinutes" type="number" min="1" defaultValue={Math.round(kinopoiskDraft.durationSeconds / 60)} /></label>
                    <label className="wide"><span>Описание</span><textarea name="description" defaultValue={kinopoiskDraft.description ?? ""} rows={5} /></label>
                  </div>
                  <dl className="kinopoisk-meta">
                    <div><dt>Жанры</dt><dd>{kinopoiskDraft.genres ?? "—"}</dd></div>
                    <div><dt>Страны</dt><dd>{kinopoiskDraft.countries ?? "—"}</dd></div>
                    <div><dt>Режиссёр</dt><dd>{kinopoiskDraft.directors ?? "—"}</dd></div>
                    <div><dt>Рейтинг</dt><dd>{kinopoiskDraft.rating ?? "—"}{kinopoiskDraft.ratingCount ? ` · ${kinopoiskDraft.ratingCount.toLocaleString("ru-RU")} оценок` : ""}</dd></div>
                    <div><dt>В ролях</dt><dd>{kinopoiskDraft.cast ?? "—"}</dd></div>
                    <div><dt>Возрастной рейтинг</dt><dd>{kinopoiskDraft.ageRating ?? "—"}</dd></div>
                  </dl>
                  {kinopoiskDraft.existing ? (
                    <p className="import-warning">Этот материал уже есть в библиотеке: {kinopoiskDraft.existing.title}</p>
                  ) : (
                    <button className="primary-button import-save" type="submit"><Save size={16} /> Добавить в библиотеку</button>
                  )}
                </div>
              </form>
            )}

            <form className="create-panel" onSubmit={createMedia}>
              <div><span className="panel-kicker">Вручную</span><h2>Добавить контент</h2></div>
              <label><span>Название</span><input name="title" placeholder="Название" required /></label>
              <label><span>Тип</span><select name="type"><option value="MOVIE">Фильм</option><option value="SERIES">Сериал</option><option value="EPISODE">Серия</option><option value="CARTOON">Мультфильм</option></select></label>
              <label><span>Год</span><input name="year" type="number" min="1888" max="2100" /></label>
              <label><span>Название сериала</span><input name="seriesTitle" placeholder="Для отдельных серий" /></label>
              <label><span>Сезон</span><input name="seasonNumber" type="number" min="1" /></label>
              <label><span>Серия</span><input name="episodeNumber" type="number" min="1" /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Добавить</button>
            </form>
            <div className="data-table">
              <div className="table-head"><span>Название</span><span>Тип</span><span>Год</span><span>Источники</span><span>Статус</span><span /></div>
              {media.map((item) => (
                <div className="table-row" key={item.id}>
                  <div className="media-title-cell">
                    {item.posterUrl && <img src={item.posterUrl} alt="" loading="lazy" />}
                    <div>
                      <strong>{item.title}</strong>
                      {item.originalTitle && <small>{item.originalTitle}</small>}
                      {item.seriesTitle && (
                        <small>
                          {item.seriesTitle}
                          {item.seasonNumber ? ` · сезон ${item.seasonNumber}` : ""}
                          {item.episodeNumber ? `, серия ${item.episodeNumber}` : ""}
                        </small>
                      )}
                      {item.kinopoiskUrl && <a href={item.kinopoiskUrl} target="_blank" rel="noreferrer">Кинопоиск · {item.rating ?? "без рейтинга"}</a>}
                    </div>
                  </div>
                  <span className="type-pill">{typeLabels[item.type] ?? item.type}</span><span>{item.year ?? "—"}</span><span>{item.sources.length}</span>
                  <button className={`state-toggle ${item.enabled ? "on" : ""}`} onClick={() => void run(() => api(`/api/internal/media/${item.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !item.enabled }) }), "Статус контента обновлён")}>{item.enabled ? "Активен" : "Выключен"}</button>
                  <button className="icon-button danger" aria-label="Удалить контент" onClick={() => void run(() => api(`/api/internal/media/${item.id}`, { method: "DELETE" }), "Контент удалён")}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === "sources" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createSource}>
              <div><span className="panel-kicker">Подключение</span><h2>Добавить источник</h2></div>
              <label><span>Контент</span><select name="mediaId" required defaultValue=""><option value="" disabled>Выбрать название…</option>{media.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
              <label><span>Провайдер</span><select name="provider"><option value="YOUTUBE">YouTube</option><option value="INTERNET_ARCHIVE">Internet Archive</option><option value="DIRECT_URL">Прямая ссылка</option><option value="EXTERNAL">Внешний источник</option></select></label>
              <label><span>ID источника</span><input name="externalId" placeholder="ID видео YouTube или архива" /></label>
              <label className="wide"><span>Ссылка на видео</span><input name="streamUrl" type="url" placeholder="Нужна только для прямой ссылки" /></label>
              <label><span>Приоритет</span><input name="priority" type="number" defaultValue="10" /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Подключить</button>
            </form>
            <div className="source-grid">
              {media.flatMap((item) => item.sources.map((source) => (
                <article className="source-card" key={source.id}>
                  <div className="source-icon"><Cable size={20} /></div>
                  <div className="source-title"><span>{providerLabels[source.provider] ?? source.provider}</span><h3>{item.title}</h3></div>
                  <dl><div><dt>Ссылка / ID</dt><dd title={source.streamUrl ?? source.iframeUrl ?? source.externalId ?? ""}>{source.streamUrl ?? source.iframeUrl ?? source.externalId ?? "—"}</dd></div><div><dt>Приоритет</dt><dd>{source.priority}</dd></div></dl>
                  <div className="source-actions">
                    <button className={`state-toggle ${source.enabled ? "on" : ""}`} onClick={() => void run(() => api(`/api/internal/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !source.enabled }) }), "Статус источника обновлён")}>{source.enabled ? "Активен" : "Выключен"}</button>
                    <button className="icon-button danger" aria-label="Удалить источник" onClick={() => void run(() => api(`/api/internal/sources/${source.id}`, { method: "DELETE" }), "Источник удалён")}><Trash2 size={15} /></button>
                  </div>
                </article>
              )))}
            </div>
          </div>
        )}

        {!loading && tab === "ads" && (
          <div className="admin-content">
            <form className="create-panel" onSubmit={createAd}>
              <div><span className="panel-kicker">Ролики между показами</span><h2>Добавить ролик</h2></div>
              <label><span>Название</span><input name="title" placeholder="Название ролика" required /></label>
              <label><span>Тип</span><select name="type"><option value="TRAILER">Трейлер</option><option value="AD">Реклама</option></select></label>
              <label className="wide"><span>Ссылка на видео</span><input name="videoUrl" type="url" placeholder="https://…/clip.mp4" required /></label>
              <button className="primary-button" type="submit"><Plus size={17} /> Добавить ролик</button>
            </form>
            <div className="stack-list">
              {ads.map((ad) => (
                <article className="admin-card ad-row" key={ad.id}>
                  <div className="ad-icon"><Clapperboard size={21} /></div>
                  <div><span className="type-pill">{typeLabels[ad.type] ?? ad.type}</span><h3>{ad.title}</h3><p title={ad.videoUrl}>{ad.videoUrl}</p><small>{ad.channels.length ? `Используется на каналах: ${ad.channels.map((item) => item.channel.name).join(", ")}` : "Не назначен"}</small></div>
                  <form className="assign-form" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const channelId = String(form.get("channelId"));
                    void run(() => api(`/api/internal/channels/${channelId}/ads`, { method: "POST", body: JSON.stringify({ adId: ad.id, position: 0, enabled: true }) }), "Ролик назначен");
                  }}><select name="channelId" required defaultValue=""><option value="" disabled>Назначить каналу…</option>{channels.filter((channel) => !ad.channels.some((link) => link.channelId === channel.id)).map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}</select><button className="secondary-button" aria-label="Назначить"><Plus size={15} /></button></form>
                  <button className={`state-toggle ${ad.enabled ? "on" : ""}`} onClick={() => void run(() => api(`/api/internal/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !ad.enabled }) }), "Статус ролика обновлён")}>{ad.enabled ? "Активен" : "Выключен"}</button>
                  <button className="icon-button danger" aria-label="Удалить ролик" onClick={() => void run(() => api(`/api/internal/ads/${ad.id}`, { method: "DELETE" }), "Ролик удалён")}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
