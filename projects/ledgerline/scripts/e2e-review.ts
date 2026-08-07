/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * E2E Task 7 — review queue engine.
 * Alur: JUNIOR approve → SENIOR approve → TAX approve → PARTNER approve → APPROVED,
 * plus: reject dengan catatan, return ke stage sebelumnya, dan cek RBAC (403).
 * Password di file ini (bukan command line) agar tidak ter-mask oleh shell layer.
 * Jalankan: npx tsx scripts/e2e-review.ts
 */
const BASE = "http://localhost:3000";
const PASSWORD = "password123";

type QueueItem = {
  id: string;
  stage: string;
  urgent: boolean;
  journalEntry: { id: string; description: string; status: string; client: { name: string } };
};

class Session {
  private jar = new Map<string, string>();

  private cookieHeader(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async login(email: string): Promise<boolean> {
    this.jar.clear();
    const csrf = (await (await this.req("/api/auth/csrf")).json()) as { csrfToken: string };
    const res = await this.req("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: PASSWORD }).toString(),
    });
    return res.status === 302;
  }

  private async req(path: string, init: RequestInit = {}) {
    const res = await fetch(BASE + path, {
      ...init,
      redirect: "manual",
      headers: { ...(init.headers ?? {}), cookie: this.cookieHeader() },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.jar.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
    return res;
  }

  async api(path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
    const res = await this.req(path, init);
    const text = await res.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 200) };
    }
    return { status: res.status, body };
  }

  async queues(): Promise<QueueItem[]> {
    const { body } = await this.api("/api/queues");
    return body.data ?? [];
  }

  async review(taskId: string, action: string, note?: string) {
    return this.api(`/api/reviews/${taskId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
  }
}

async function main() {
  const budi = new Session();
  const dwi = new Session();
  const rina = new Session();
  const sari = new Session();
  const andi = new Session();

  if (!(await budi.login("budi@ledgerline.dev"))) throw new Error("login budi gagal");
  if (!(await dwi.login("dwi@ledgerline.dev"))) throw new Error("login dwi gagal");
  if (!(await rina.login("rina@ledgerline.dev"))) throw new Error("login rina gagal");
  if (!(await sari.login("sari@ledgerline.dev"))) throw new Error("login sari gagal");
  if (!(await andi.login("andi@ledgerline.dev"))) throw new Error("login andi gagal");
  console.log("login 5 user: OK");

  // 1. Queue budi (JUNIOR) — hanya task miliknya
  const budiQ = await budi.queues();
  console.log("queue budi (JUNIOR):", budiQ.length, "task | stages:", [...new Set(budiQ.map((t) => t.stage))].join(","));
  const target = budiQ.find((t) => t.urgent) ?? budiQ[0];
  if (!target) throw new Error("tidak ada task JUNIOR pending");
  console.log("target:", target.journalEntry.client.name, "| urgent:", target.urgent, "| jurnal:", target.journalEntry.id.slice(0, 8));

  // 2. RBAC: dwi coba review task milik budi → 403
  const rbac = await dwi.review(target.id, "approve");
  console.log("RBAC dwi→task budi:", rbac.status === 403 ? "403 OK" : `GAGAL (${rbac.status})`);

  // 3. Reject tanpa catatan → 400
  const noNote = await budi.review(target.id, "reject");
  console.log("reject tanpa catatan:", noNote.status === 400 ? "400 OK" : `GAGAL (${noNote.status})`);

  // 4. Alur lengkap: JUNIOR → SENIOR → TAX → PARTNER → APPROVED
  const journalId = target.journalEntry.id;  const approveAt = async (s: Session, expectStage: string, label: string) => {
    const q = await s.queues();
    const item = q.find((t) => t.journalEntry.id === journalId);
    if (!item) throw new Error(`${label}: jurnal ${journalId.slice(0, 8)} tidak ada di antrian`);
    if (item.stage !== expectStage) throw new Error(`${label}: stage ${item.stage} ≠ ${expectStage}`);
    const r = await s.review(item.id, "approve", `Setuju — review ${label}`);
    console.log(`${label}: ${r.status} | ${r.body.message ?? r.body.error ?? ""}`);
    return item;
  };

  await approveAt(budi, "JUNIOR", "Junior");
  await approveAt(rina, "SENIOR", "Senior");
  await approveAt(sari, "TAX", "Tax");
  const last = await approveAt(andi, "PARTNER", "Partner");
  console.log("alur penuh → APPROVED:", last.journalEntry.id.slice(0, 8));

  // 5. Return path: JUNIOR return → DRAFT
  const retTarget = (await budi.queues())[0];
  const ret = await budi.review(retTarget.id, "return", "Perlu koreksi akun");
  console.log("return JUNIOR:", ret.status, "|", ret.body.message ?? ret.body.error ?? "");

  // 6. Reject path dengan catatan
  const rejTarget = (await budi.queues())[0];
  const rej = await budi.review(rejTarget.id, "reject", "Dokumen pendukung tidak lengkap");
  console.log("reject JUNIOR:", rej.status, "|", rej.body.message ?? rej.body.error ?? "");

  // 7. Cek queue dwi tetap bisa melihat task miliknya sendiri
  const dwiQ = await dwi.queues();
  console.log("queue dwi:", dwiQ.length, "task");
}

main()
  .then(() => {
    console.log("E2E REVIEW: SELESAI ✓");
    process.exit(0);
  })
  .catch((e) => {
    console.error("E2E REVIEW GAGAL:", e.message);
    process.exit(1);
  });
