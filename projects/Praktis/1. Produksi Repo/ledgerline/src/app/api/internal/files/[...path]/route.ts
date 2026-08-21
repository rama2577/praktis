import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * GET /api/internal/files/[...path] — ambil file upload MENTAH (terenkripsi)
 * untuk service worker. Dilindungi token internal (bukan session), karena worker
 * tidak punya cookie auth. Dipakai storage.readStoredFile saat WORKER_MODE=1.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = req.headers.get("x-internal-token");
  if (!token || !process.env.STORAGE_INTERNAL_TOKEN || token !== process.env.STORAGE_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { path: segs } = await params;
  const rel = segs.join("/").replace(/^uploads[\\/]/, "");
  const abs = path.resolve(UPLOAD_ROOT, rel);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  try {
    const raw = await readFile(abs);
    return new NextResponse(new Uint8Array(raw), {
      headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
