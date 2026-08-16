# Rencana Kerja — Tech Debt & Production Readiness Praktis

> Disusun 2026-08-16. Sumber: `docs/TECHDEBT.md` + backlog terbaru + sesi "apa lagi tech debt kita".
> Prinsip: **quick win dulu** (cepat, risiko rendah, dampak terasa) → fondasi produksi → post-GA.
> Setiap item: ID · apa · dampak · effort · kriteria selesai.

## Status (2026-08-16)

- ✅ **Wave 1 selesai** (QW-1..QW-6) — kecuali rotasi password prod (ditahan sampai POC selesai, keputusan Rama).
- 🚧 **Wave 2 berjalan**: F-5 (billing+paywall) ✅ · F-2 (backup runbook) ✅ · F-4 (IaC-lite) ✅ · F-6 (smoke LLM) ✅ · F-1 (storage abstraction) ✅ · F-3 (key rotation) ✅ — sisa: pindah kunci ke secret manager (provider belum dipilih).

---


## Wave 1 · Quick Wins (target: minggu ini, total ±8 jam)

Fokus: menutup lubang keamanan kecil + merapikan repo. Tidak butuh keputusan besar dari Rama.

### QW-1 · Disable akun demo `password123` di produksi (TD-16)
- **Apa:** ganti password akun demo jadi nilai dari env (`DEMO_PASSWORD`), atau nonaktifkan seed user demo saat `NODE_ENV=production`.
- **Dampak:** 🔴 keamanan — mencegah login tanpa izin di demo live.
- **Effort:** ~1 jam. **Selesai bila:** login demo di prod pakai password dari env; test auth tetap hijau.

### QW-2 · Secret scanning (gitleaks) + audit .gitignore (SE-06)
- **Apa:** pasang gitleaks di CI (GitHub Actions) + audit repo pastikan tidak ada key/token tercommit (history `filter-branch` bila perlu).
- **Dampak:** 🔴 mencegah kebocoran kredensial.
- **Effort:** ~1 jam. **Selesai bila:** gitleaks step jalan di CI; 0 temuan kritis.

### QW-3 · Rapikan tooling deck nyasar di repo app (TD-11)
- **Apa:** pindah `scripts/screenshot-mockups.ts`, `scripts/screenshot-modules.ts`, `playwright.config.ts` yang berbau deck ke `projects/praktis-deck/scripts/`; sisakan yang murni E2E app.
- **Dampak:** 🟡 repo bersih, `scripts/` app hanya berisi E2E.
- **Effort:** ~2 jam. **Selesai bila:** tooling deck tidak lagi di repo app; build/test app tidak terganggu.

### QW-4 · Dokumentasikan pinned Playwright (TD-12)
- **Apa:** ganti hardcode `channel: "chrome"` → baca `CHROMIUM_PATH` env (default ke path `chromium-1234/.../Google Chrome for Testing`); catat di README/TOOLS.
- **Dampak:** 🟡 E2E portabel antar mesin.
- **Effort:** ~1 jam. **Selesai bila:** E2E jalan tanpa hardcode path; ada catatan setup.

### QW-5 · Audit `any` & cast di src (SQ-03)
- **Apa:** hapus cast `any` di `db.ts`; aktifkan `@typescript-eslint/no-explicit-any` warn; bersihkan `any` yang gampang.
- **Dampak:** 🟡 type-safety, mencegah bug runtime.
- **Effort:** ~2 jam. **Selesai bila:** 0 `any` di jalur kritis; tsc 0; lint 0.

### QW-6 · Coverage badge + naikkan threshold bertahap (SQ-01, SQ-06)
- **Apa:** tampilkan badge coverage di README; naikkan threshold vitest dari baseline (33%) ke target moderat (40% statements).
- **Dampak:** 🟡 sinyal kualitas terlihat.
- **Effort:** ~1 jam. **Selesai bila:** badge tampil; `vitest run` tetap hijau di threshold baru.

---

## Wave 2 · Fondasi Produksi (target: sebelum GA, butuh keputusan Rama)

Fokus: durability data & monilisasi. Beberapa butuh pilihan provider/ops.

### F-1 · Object storage untuk dokumen (TD-04)
- **Apa:** abstraksi `storage.ts` → provider object storage (S3/R2/MinIO), enkripsi tetap di atasnya, backup policy.
- **Dampak:** 🔴 dokumen klien tidak bergantung pada disk container (hilang saat redeploy).
- **Effort:** 2–3 hari. **Selesai bila:** dokumen tersimpan di object storage + restore teruji.
- **⚠ Butuh keputusan:** provider (Cloudflare R2 vs AWS S3 vs MinIO self-host).

### F-2 · Backup/restore Postgres (TD-15)
- **Apa:** jadwal `pg_dump` harian + prosedur restore terdokumentasi & teruji.
- **Dampak:** 🔴 recovery point.
- **Effort:** 1 hari. **Selesai bila:** backup harian aktif + restore teruji sekali.

### F-3 · Secret manager + rotasi kunci (TD-05)
- **Apa:** pindah `STORAGE_ENCRYPTION_KEY` ke secret manager; key versioning + prosedur rotasi.
- **Dampak:** 🔴 tata kelola kunci.
- **Effort:** 1–2 hari. **Selesai bila:** kunci di secret manager + dokumen rotasi.

### F-4 · Redis config ke IaC (TD-03)
- **Apa:** konfigurasi Redis versi-controlled (Railway plugin → config file/variable terdokumentasi).
- **Dampak:** 🟠 konsistensi env.
- **Effort:** 0,5 hari. **Selesai bila:** setup Redis bisa di-reproduce dari repo.

### F-5 · Billing + paywall SPT (backlog lama)
- **Apa:** `billingMode` kuota-only, UsageMeter dari JournalLine APPROVED, gate `annualPaidAt` (paywall SPT Tahunan), alert kuota.
- **Dampak:** 🟠 monilisasi sesuai kebijakan final (kuota-only).
- **Effort:** 3–5 hari. **Selesai bila:** kuota terhitung & paywall jalan; sesuai `docs/analisis-komersial-pricing.md`.

### F-6 · Test LLM key nyata + smoke vision (TD-06)
- **Apa:** integration test pakai saldo Z.ai asli (1 kasus teks + 1 kasus vision JPG), tanpa masuk CI reguler.
- **Dampak:** 🟠 memastikan path LLM produksi benar-benar hidup.
- **Effort:** 0,5 hari. **Selesai bila:** smoke test sukses manual/opsional.

---

## Wave 3 · Post-GA (bertahap, tidak menghambat rilis)

Fokus: makin pintar + skala + operasional.

- **P-1 · Feedback loop AI (EN-03):** rekam koreksi user → insight → update rule. (Insight sudah ada di `getCorrectionInsights`; auto-update rule belum.)
- ✅ **P-2 · RBAC multi-segmen** — selesai (2026-08-16): enum Segment + matriks modul + sidebar per segmen.
- ✅ **P-4 · Konektor bank (EN-09)** — parsing BCA/Mandiri/BRI + route sudah ada.
- ✅ **P-5 · Metrik clerk/firm (EN-10)** — `getClerkMetrics`/`getQualityMetrics` sudah ada.
- **P-6 · Playwright CI penuh + SAST (SQ-02, SQ-07):** E2E otomatis di CI + security hotspots per PR.
- **P-7 · Migrasi data-fetching ke TanStack Query/SWR** (dari rule lint `set-state-in-effect` yang di-off).

> Catatan: "Cutover PostingRuleEngine shadow→live" DIBUANG dari daftar ini — itu backlog
> proyek **Mio ERP (MBS)**, bukan Praktis/LedgerLine (lihat MEMORY.md baris MBS).
> Rule-engine LedgerLine (`src/ai/rule-engine.ts`) sudah live: deterministik-dulu, LLM-fallback.

---

## Urutan yang disarankan

```
QW-1 → QW-2 → QW-3/4/5/6 (paralel)  →  F-1 (storage) → F-2 (backup) → F-5 (billing) → F-3/F-4 → GA
                                                                                          ↘ P-1..P-6 post-GA
```

**Blocker aktif:** F-1 butuh keputusan provider storage; F-3 butuh pilihan secret manager. Sisanya bisa jalan tanpa keputusan.
