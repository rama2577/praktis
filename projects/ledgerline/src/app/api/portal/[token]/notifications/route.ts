import { NextResponse } from "next/server";
import { validatePortalToken, listClientNotifications, markNotificationsRead } from "@/server/portal";

type Ctx = { params: Promise<{ token: string }> };

/** GET /api/portal/[token]/notifications — notifikasi proaktif (K4). */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const notifications = await listClientNotifications(result.client.id);
  const unread = notifications.filter((n) => !n.readAt).length;
  return NextResponse.json({ data: notifications, unread });
}

/** POST /api/portal/[token]/notifications — tandai semua sudah dibaca. */
export async function POST(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const count = await markNotificationsRead(result.client.id);
  return NextResponse.json({ data: { marked: count } });
}
