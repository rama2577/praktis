import { NextResponse } from "next/server";
import { validatePortalToken, getPortalTimeline } from "@/server/portal";

type Ctx = { params: Promise<{ token: string }> };

/** GET /api/portal/[token]/timeline — status dokumen berjenjang (K1/EN-08). */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const timeline = await getPortalTimeline(result.client.id);
  return NextResponse.json({ data: timeline });
}
