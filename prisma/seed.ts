import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const blenderTrailer = "https://download.blender.org/peach/trailer/trailer_iphone.m4v";

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
      title: "Night of the Living Dead",
      year: 1968,
      durationSeconds: 5760,
      archiveId: "Night.Of.The.Living.Dead_1080p",
    },
    {
      type: "MOVIE",
      title: "His Girl Friday",
      year: 1940,
      durationSeconds: 5520,
      archiveId: "his_girl_friday",
    },
    {
      type: "EPISODE",
      title: "The Clampetts Strike Oil",
      year: 1962,
      seriesTitle: "The Beverly Hillbillies",
      seasonNumber: 1,
      episodeNumber: 1,
      durationSeconds: 1500,
      archiveId: "Beverly_Hillbillies_Ep01_The_Clampetts_Strike_Oil",
    },
    {
      type: "CARTOON",
      title: "Superman: The Mechanical Monsters",
      year: 1941,
      durationSeconds: 540,
      archiveId: "mechanical_monsters_1941",
    },
  ];

  const media = [];
  for (const item of mediaData) {
    const { archiveId, ...data } = item;
    media.push(
      await prisma.media.create({
        data: {
          ...data,
          sources: {
            create: {
              provider: "INTERNET_ARCHIVE",
              externalId: archiveId,
              priority: 100,
            },
          },
        },
      }),
    );
  }

  const trailers = [
    await prisma.ad.create({
      data: {
        title: "Big Buck Bunny — official trailer",
        type: "TRAILER",
        videoUrl: blenderTrailer,
        durationSeconds: 33,
      },
    }),
  ];

  const channels = await Promise.all([
    prisma.channel.create({
      data: {
        slug: "horror",
        name: "Horror",
        description: "Cult fear, strange signals and the long night.",
        accent: "#ff5e57",
        playbackMode: "RANDOM",
        repeatDays: 14,
        interstitialCount: 1,
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
        useAds: false,
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
        useTrailers: true,
        useAds: false,
      },
    }),
  ]);

  const mediaMap = [
    [media[0]],
    [media[1], media[2]],
    [media[3]],
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
