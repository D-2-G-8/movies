import { db } from "@/lib/db";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const channel = await db.channel.findFirst({
    where: { enabled: true, OR: [{ id }, { slug: id }] },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      accent: true,
      enabled: true,
      playbackMode: true,
    },
  });
  return channel ? Response.json(channel) : apiError("Channel not found", 404);
}
