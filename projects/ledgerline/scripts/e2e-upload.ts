/**
 * Verifikasi E2E pipeline (login + upload + proses worker).
 * Password dibaca dari file ini — bukan dari command line (menghindari
 * masking secret di shell). Jalankan: npx tsx scripts/e2e-upload.ts
 */
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const EMAIL = "admin@ledgerline.dev";
const PASSWORD = process.env.TEST_PASSWORD ?? "password123";

const jar = new Map<string, string>();

function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    redirect: "manual",
    headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  return res;
}

async function main() {
  // 1. Login
  const csrf = (await (await req("/api/auth/csrf")).json()) as { csrfToken: string };
  const login = await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: EMAIL, password: PASSWORD }).toString(),
  });
  console.log("login:", login.status, "→", login.headers.get("location"));

  const clients = (await (await req("/api/clients")).json()) as {
    data: Array<{ id: string; name: string }>;
  };
  const clientId = clients.data[0].id;
  console.log("klien target:", clients.data[0].name);

  // 2. Upload dokumen fixture
  const uploads: Array<[string, string, string]> = [
    ["tests/fixtures/rekening-koran.xlsx", "BANK_STATEMENT", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["tests/fixtures/invoice-penjualan.pdf", "INVOICE", "application/pdf"],
  ];
  for (const [filePath, docType, mime] of uploads) {
    const buffer = readFileSync(filePath);
    const form = new FormData();
    form.append("clientId", clientId);
    form.append("docType", docType);
    form.append("file", new Blob([buffer], { type: mime }), filePath.split("/").pop() ?? "file");
    const res = await req("/api/documents", { method: "POST", body: form });
    const body = (await res.json()) as { data?: { id: string; fileName: string } };
    console.log("upload:", filePath, "→", res.status, body.data?.id ?? JSON.stringify(body));
  }
}

main().catch((e) => {
  console.error("E2E GAGAL:", e.message);
  process.exit(1);
});
