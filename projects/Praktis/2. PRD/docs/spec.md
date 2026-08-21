# Spec: LedgerLine — AI Bookkeeping Operations Platform

Status: **DRAFT — menunggu review Rama**
Versi: 0.1 (2026-08-07)
Sumber: mockup Operations Dashboard (chat.z.ai/space/m1ak5692s8r1-art) + knowledge base `ledgerline-ai-bookkeeper`

---

## ASSUMPTIONS YANG SAYA AMBIL

1. Ini **web application** (bukan native mobile), diakses via browser desktop & mobile.
2. **Single-firm first** (dikonfirmasi Rama 2026-08-07): satu tenant = satu kantor akuntan. "Active clients" (47 di mockup) = klien kantor tersebut, bukan multi-firm SaaS. Schema tetap tenant-aware agar bisa naik ke multi-firm nanti.
3. **Full-stack Next.js** (App Router) + PostgreSQL + Prisma + Redis/BullMQ untuk job queue pipeline.
4. **UI Full Bahasa Indonesia** (dikonfirmasi Rama 2026-08-07); dark navy theme mengikuti mockup. Istilah teknis (dashboard, SLA, queue) tetap dipakai dalam konteks Indonesia.
5. **AI pipeline**: dokumen mentah → OCR → deteksi business event → draft journal entries (PSAK/PPN/PPh-aware, berdasar knowledge base `ledgerline-ai-bookkeeper`) → confidence score + exception flag → antrian review manusia.
6. **Human-in-the-loop wajib**: tidak ada journal yang masuk tanpa review & approval (traceability & audit liability).
7. Target MVP: **single kantor akuntan, multi-client**, 4 role reviewer (Junior, Senior, Tax Specialist, Partner) + Admin.
8. Dokumen didukung: **invoice + rekening koran, format PDF/JPG/XLSX** (semua, dikonfirmasi). PDF → ekstraksi teks; XLSX → parse sel (SheetJS); JPG/PDF-scan → OCR/LLM vision.
9. **Login per-reviewer** (dikonfirmasi): tiap user (junior/senior/tax/partner) punya akun sendiri; plus **1 akun admin dev** untuk menguji semua modul & flow.
10. **Deployment awal: lokal** (dikonfirmasi) — `npm run dev` untuk demo; VPS/cloud menyusul.

→ Koreksi saya sekarang kalau ada yang salah, atau saya lanjut dengan asumsi ini.

---

## 1. Objective

Membangun platform AI bookkeeping untuk kantor akuntan Indonesia: klien upload data mentah → sistem menghasilkan **draft journal entries** yang sesuai PSAK & perpajakan (PPN/PPh) → direview manusia lewat pipeline berjenjang → journal final yang traceable. Dashboard operasional memonitor seluruh pipeline, SLA, dan kualitas AI secara real-time.

**User & perannya:**
| User | Peran |
|---|---|
| Senior Accountant (mis. Rina Hartono) | Review antrian senior, lihat dashboard, approve |
| Junior Accountant | Review draft awal, tandai urgent |
| Tax Specialist | Review aspek perpajakan (PPN/PPh) |
| Partner | Approval final sebelum delivery |
| Admin/Owner | Kelola klien & pengaturan sistem |

**User stories (dari mockup):**
- Sebagai Senior Accountant, saya bisa melihat seluruh pipeline produksi + KPI (active clients, AI automation, jobs in progress, transactions, SLA breaches) di satu dashboard.
- Sebagai Junior Accountant, saya punya review queue dengan indikator urgent.
- Sebagai Partner, saya melihat antrian approval dan menyetujui sebelum delivery.
- Sebagai sistem, AI menghasilkan draft journal dengan confidence score dan menandai exception (mis. "Missing VAT invoice").
- Sebagai sistem, setiap stage pipeline diukur terhadap target SLA (upload 5 menit, AI draft 3 menit, junior 2 jam, senior 4 jam, tax 4 jam, partner 2 jam, delivery same-day).

**Definisi sukses (product level):** mockup dashboard berjalan dengan **data produksi nyata** — bukan data statis.

## 2. Tech Stack

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + React + TypeScript (strict) | SSR + API routes dalam satu app |
| Styling | Tailwind CSS | Dark theme mengikuti mockup |
| Chart | Recharts | SLA bars, AI confidence distribution |
| ORM/DB | Prisma + PostgreSQL | Multi-tenant siap (`tenantId`/`firmId`) |
| Queue | BullMQ + Redis | Pipeline processing (OCR → draft) |
| Auth | Auth.js (NextAuth) + RBAC | Session cookie; 4 role + admin |
| Storage | Local filesystem (dev) → S3-compatible (prod, nanti) | Dokumen klien |
| AI/OCR | **GLM (Z.ai) — primary**; OpenAI — fallback (keduanya API OpenAI-compatible); parsing: pdf-parse, SheetJS, LLM vision untuk scan | Drafting + parsing |
| Test | Vitest + React Testing Library, Playwright (E2E) | |

## 3. Commands

```bash
npm install          # install dependencies
npm run dev          # dev server (http://localhost:3000)
npm run build        # production build
npm test             # unit + component tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run lint         # ESLint
npx prisma migrate dev   # schema migration
npx prisma db seed   # seed data (demo: 1 firm, 6 users: admin dev + 4 role, 3 clients)
```

## 4. Project Structure

```
projects/ledgerline/
├── docs/
│   └── spec.md          → dokumen ini (living document)
├── tasks/
│   ├── plan.md          → rencana implementasi
│   └── todo.md          → daftar tugas checklist
├── src/
│   ├── app/             → Next.js App Router (halaman + API routes)
│   │   ├── (auth)/login
│   │   ├── (dashboard)/ → dashboard, pipeline, queues, clients, settings
│   ├── components/      → React components (ui/, dashboard/, pipeline/, queues/)
│   ├── lib/             → utilitas shared (db, auth, rbac, sla, audit)
│   ├── server/          → logic server: pipeline, rule-engine, queues
│   ├── ai/              → AI pipeline: OCR, event detection, drafting
│   └── styles/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── tests/               → unit & component tests
├── e2e/                 → Playwright tests
└── .env.example
```

## 5. Code Style

- TypeScript **strict** mode; tidak ada `any` tanpa alasan terdokumentasi.
- Komponen React: function components + hooks; satu komponen per file.
- Naming: `camelCase` (variabel/fungsi), `PascalCase` (komponen/tipe), `snake_case` (kolom DB).
- Semua nilai uang: `Decimal`/integer minor unit (sen), bukan `float` — akuntansi tidak boleh kena floating point.
- Contoh gaya:

```tsx
// src/server/sla.ts — hitung status SLA per stage
export function computeSlaStatus(stage: PipelineStage, elapsedMs: number): SlaStatus {
  const target = SLA_TARGETS[stage]; // ms
  if (elapsedMs <= target) return "met";
  if (elapsedMs <= target * 1.25) return "at-risk";
  return "breached";
}
```

## 6. Testing Strategy

| Level | Framework | Fokus |
|---|---|---|
| Unit | Vitest | **Rule engine & journal validation (paling kritikal)**, SLA calculation, business event detection |
| Component | Vitest + RTL | KPI cards, queue list, pipeline viz |
| E2E | Playwright | Alur lengkap: upload → draft → review (4 role) → approve |

- Coverage wajib **≥ 80%** pada rule engine, validation rules, dan SLA logic.
- Test data pakai factory/seed terpisah; jangan test terhadap DB produksi.

## 7. Boundaries

**Always:**
- Jalankan test sebelum commit; app harus selalu dalam keadaan buildable.
- Validasi semua input (upload file: tipe, ukuran; form: required, format).
- Setiap journal entry **wajib traceable**: business event → referensi PSAK → COA → siapa yang review/approve (audit trail).
- Semua keputusan accounting mengacu knowledge base `ledgerline-ai-bookkeeper` (references/), sesuai prinsip "JANGAN PERNAH invent accounting treatment".

**Ask first:**
- Perubahan schema database.
- Menambah dependency baru.
- Mengubah konfigurasi CI.
- Keputusan accounting treatment di luar yang sudah ada di references.

**Never:**
- Commit secrets (`.env`, kredensial).
- Bypass human review (semua journal wajib lewat pipeline review).
- Menghapus test yang gagal tanpa approval.
- Mengubah data klien tanpa jejak audit.

## 8. Success Criteria (dari mockup, diukur)

- [ ] Upload dokumen → draft journal dengan confidence score: **< 3 menit** (SLA AI Draft Generation).
- [ ] **100% draft** punya traceability lengkap.
- [ ] Alur review 4 role (Junior → Senior → Tax → Partner) jalan end-to-end.
- [ ] Dashboard menampilkan KPI **real**: active clients, AI automation rate, jobs in progress, transactions today, SLA breaches.
- [ ] SLA timer aktif per stage; breach memunculkan alert (2 breach di mockup: 1 Junior, 1 Tax).
- [ ] Exception flagging jalan (contoh: "Missing VAT invoice for CV Berkah").
- [ ] Activity feed mencatat aksi nyata (AI selesai draft, exception, approval).

## 9. Keputusan (dikonfirmasi Rama, 2026-08-07)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Multi-firm SaaS atau single-firm? | **Single-firm first**; schema tenant-aware |
| 2 | Dokumen pertama & format? | **Invoice + rekening koran; PDF, JPG, XLSX** (semua) |
| 3 | Autentikasi? | **Login per-reviewer** + **akun admin dev** (uji semua modul/flow) |
| 4 | Deployment awal? | **Lokal** (`npm run dev`); VPS/cloud menyusul |
| 5 | Bahasa UI? | **Full Bahasa Indonesia** |
| 6 | LLM provider? | **GLM (Z.ai) primary, OpenAI fallback**, lokal (Ollama) opsional — lihat catatan di bawah |

**Catatan LLM (rekomendasi):**
- **Primary GLM (Z.ai)** — biaya lebih rendah, performa kuat untuk Bahasa Indonesia & dokumen Asia, API OpenAI-compatible (ganti provider cukup ubah env), ekosistem sudah dipakai (mockup dibuat di Z.ai).
- **Fallback OpenAI** — standar industri, kualitas konsisten; aktif via env switch tanpa ubah kode (pipeline modular `src/ai/`).
- **Lokal (Ollama)** — opsional untuk mode offline/uji coba; kualitas parsing dokumen beragam belum sebaik cloud.
- Model vision (GLM-4V/4.6 atau setara) wajib untuk JPG & PDF scan.
- Keamanan: data klien sensitif — untuk MVP lokal tidak masalah; saat naik ke cloud, pastikan region & kebijakan data sesuai UU PDP.
