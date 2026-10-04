import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { readKinopoisk } from "@/lib/kinopoisk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const media = await readKinopoisk(String(body.url ?? ""));
    const existing = await db.media.findUnique({ where: { kinopoiskId: media.kinopoiskId }, select: { id: true, title: true } });
    return Response.json({ ...media, existing });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить данные с Кинопоиска", 400);
  }
}
