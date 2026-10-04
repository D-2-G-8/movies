import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.playbackHistory.deleteMany();
  await prisma.channelAd.deleteMany();
  await prisma.channelMedia.deleteMany();
  await prisma.mediaSource.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.media.deleteMany();
  await prisma.channel.deleteMany();

  const mediaData = [
    {
      type: "MOVIE",
      title: "Бриллиантовая рука",
      year: 1968,
      durationSeconds: 5973,
      youtubeId: "M9cGHdVbNXI",
    },
    {
      type: "EPISODE",
      title: "Батальоны просят огня. 2 серия",
      year: 1985,
      seriesTitle: "Батальоны просят огня",
      seasonNumber: 1,
      episodeNumber: 2,
      durationSeconds: 4500,
      youtubeId: "QeHEIxpHuiY",
    },
    {
      type: "CARTOON",
      title: "Новое Простоквашино. Все серии подряд",
      year: 2019,
      seriesTitle: "Простоквашино",
      seasonNumber: 1,
      episodeNumber: null,
      durationSeconds: 5580,
      youtubeId: "bMEr3VnIh54",
    },
  ];

  const media = [];
  for (const item of mediaData) {
    const { youtubeId, ...data } = item;
    media.push(
      await prisma.media.create({
        data: {
          ...data,
          sources: {
            create: {
              provider: "YOUTUBE",
              externalId: youtubeId,
              priority: 100,
            },
          },
        },
      }),
    );
  }

  const channels = await Promise.all([
    prisma.channel.create({
      data: {
        slug: "horror",
        name: "Кино",
        description: "Любимые фильмы на русском языке без долгого выбора.",
        accent: "#ff5e57",
        playbackMode: "RANDOM",
        repeatDays: 14,
        interstitialCount: 0,
        useTrailers: false,
        useAds: false,
        interstitialRepeatDays: 3,
      },
    }),
    prisma.channel.create({
      data: {
        slug: "comedy-tv",
        name: "Сериалы",
        description: "Серии подряд — включай и смотри с любого места.",
        accent: "#d7ff64",
        playbackMode: "ORDERED",
        repeatDays: 5,
        interstitialCount: 0,
        useTrailers: false,
        useAds: false,
      },
    }),
    prisma.channel.create({
      data: {
        slug: "cartoons",
        name: "Мультфильмы",
        description: "Русские мультфильмы для детей и взрослых.",
        accent: "#8ea7ff",
        playbackMode: "RANDOM",
        repeatDays: 3,
        interstitialCount: 0,
        useTrailers: false,
        useAds: false,
      },
    }),
  ]);

  const mediaMap = [
    [media[0]],
    [media[1]],
    [media[2]],
  ];

  for (const [channelIndex, channel] of channels.entries()) {
    await prisma.channelMedia.createMany({
      data: mediaMap[channelIndex].map((item, position) => ({
        channelId: channel.id,
        mediaId: item.id,
        position,
        weight: position === 0 ? 2 : 1,
      })),
    });
  }

  console.log(`Создано каналов: ${channels.length}; материалов: ${media.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
