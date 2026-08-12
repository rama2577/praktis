import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/supabaseServer";
import { parseBody } from "@/lib/schemas";
import { z } from "zod";
import { zId, zAmount } from "@/lib/validate";

const returnItemSchema = z.object({
  sale_item_id: zId,
  qty: z.number().int().positive(),
});

const createReturnSchema = z.object({
  sale_id: zId,
  reason: z.string().max(500).optional(),
  items: z.array(returnItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  const tenant = await resolveTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, createReturnSchema);
  if (!parsed.ok) return parsed.response;

  const { sale_id, reason, items } = parsed.data;

  try {
    const { data, error } = await tenant.supabase
      .rpc("create_return", {
        p_tenant_id: tenant.id,
        p_sale_id: sale_id,
        p_reason: reason || null,
        p_items: items,
      });

    if (error) {
      console.error("create_return error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ return_id: data }, { status: 201 });
  } catch (err: any) {
    console.error("create_return exception:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
