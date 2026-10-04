import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = await db.channel.findMany({
    where: { enabled: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      accent: true,
      enabled: true,
      playbackMode: true,
      _count: { select: { media: true } },
    },
  });
  return Response.json(channels);
}
