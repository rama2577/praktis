import { NextResponse } from "next/server";
import { validatePortalToken, getPortalJournals } from "@/server/portal";

type Ctx = { params: Promise<{ token: string }> };

/** GET /api/portal/[token]/journals — jurnal read-only + penjelasan sederhana (K3). */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const journals = await getPortalJournals(result.client.id);
  return NextResponse.json({ data: journals });
}
