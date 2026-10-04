import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const videos = {
  bunny: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  dream: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  sintel: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  steel: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  blazes: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  escapes: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  joyrides: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
};

async function main() {
  await prisma.playbackHistory.deleteMany();
  await prisma.channelAd.deleteMany();
  await prisma.channelMedia.deleteMany();
  await prisma.mediaSource.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.media.deleteMany();
  await prisma.channel.deleteMany();

  const mediaData = [
    { type: "MOVIE", title: "Midnight Signal", year: 1987, durationSeconds: 596, url: videos.sintel },
    { type: "MOVIE", title: "The Empty House", year: 1994, durationSeconds: 734, url: videos.steel },
    { type: "EPISODE", title: "Dead Air", year: 2021, seriesTitle: "Night Shift", seasonNumber: 1, episodeNumber: 1, durationSeconds: 653, url: videos.dream },
    { type: "MOVIE", title: "Room for Two", year: 2018, durationSeconds: 635, url: videos.bunny },
    { type: "EPISODE", title: "The Wrong Table", year: 2022, seriesTitle: "Small Disasters", seasonNumber: 2, episodeNumber: 4, durationSeconds: 147, url: videos.blazes },
    { type: "CARTOON", title: "Meadow Patrol", year: 2011, durationSeconds: 635, url: videos.bunny },
    { type: "CARTOON", title: "Cloud Mechanics", year: 2016, durationSeconds: 148, url: videos.joyrides },
  ];

  const media = [];
  for (const item of mediaData) {
    const { url, ...data } = item;
    media.push(
      await prisma.media.create({
        data: {
          ...data,
          sources: {
            create: {
              provider: "DIRECT_URL",
              streamUrl: url,
              priority: 100,
            },
          },
        },
      }),
    );
  }

  const trailers = await Promise.all([
    prisma.ad.create({ data: { title: "After Dark — trailer", type: "TRAILER", videoUrl: videos.escapes, durationSeconds: 15 } }),
    prisma.ad.create({ data: { title: "Coming Soon: Orbit", type: "TRAILER", videoUrl: videos.blazes, durationSeconds: 15 } }),
    prisma.ad.create({ data: { title: "Nightwave station ident", type: "AD", videoUrl: videos.joyrides, durationSeconds: 15 } }),
  ]);

  const channels = await Promise.all([
    prisma.channel.create({
      data: {
        slug: "horror",
        name: "Horror",
        description: "Cult fear, strange signals and the long night.",
        accent: "#ff5e57",
        playbackMode: "RANDOM",
        repeatDays: 14,
        interstitialCount: 2,
        useTrailers: true,
        useAds: false,
        interstitialRepeatDays: 3,
      },
    }),
    prisma.channel.create({
      data: {
        slug: "comedy-tv",
        name: "Comedy TV",
        description: "Easy stories, awkward timing, zero decisions.",
        accent: "#d7ff64",
        playbackMode: "ORDERED",
        repeatDays: 5,
        interstitialCount: 1,
        useTrailers: true,
        useAds: true,
      },
    }),
    prisma.channel.create({
      data: {
        slug: "cartoons",
        name: "Cartoons",
        description: "A bright all-ages loop for slow mornings.",
        accent: "#8ea7ff",
        playbackMode: "RANDOM",
        repeatDays: 3,
        interstitialCount: 1,
        useTrailers: false,
        useAds: true,
      },
    }),
  ]);

  const mediaMap = [
    [media[0], media[1], media[2]],
    [media[3], media[4], media[0]],
    [media[5], media[6]],
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
    await prisma.channelAd.createMany({
      data: trailers.map((ad, position) => ({
        channelId: channel.id,
        adId: ad.id,
        position,
      })),
    });
  }

  console.log(`Seeded ${channels.length} channels, ${media.length} titles and ${trailers.length} interstitials.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
