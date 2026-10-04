import { apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; adId: string }> }) {
  const { id: channelId, adId } = await params;
  try {
    await db.channelAd.delete({ where: { channelId_adId: { channelId, adId } } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Ролик не найден в расписании канала", 404);
  }
}
