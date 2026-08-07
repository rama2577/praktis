# ADR-001: Monolith Next.js full-stack

- **Status:** Accepted (2026-08-07)
- **Konteks:** Tim kecil (1–3 developer), MVP perlu rilis cepat; dokumen & logika akuntansi saling terkait erat (upload → pipeline → review → dashboard).
- **Keputusan:** Satu aplikasi Next.js (App Router) berisi halaman, API route, dan logika server (Prisma, BullMQ worker sebagai proses terpisah `npm run worker`). Tidak ada service terpisah untuk API.
- **Konsekuensi:**
  - (+) Satu deploy, satu bahasa, refactor lintas-lapisan mudah.
  - (+) Worker pipeline tetap proses terpisah agar antrian panjang tidak memblokir web.
  - (−) Skala horizontal terbatas; jika perlu, pisahkan worker dulu (sudah terpisah), lalu API.
- **Alternatif ditolak:** microservices (overhead ops), BFF terpisah (belum perlu).

# ADR-002: State machine jurnal eksplisit + transisi terpusat

- **Status:** Accepted (2026-08-07)
- **Konteks:** Jurnal adalah aset akuntansi; transisi status sembarangan = risiko integritas & audit.
- **Keputusan:** `JOURNAL_TRANSITIONS` mendefinisikan semua transisi valid (`DRAFT → JUNIOR_REVIEW → SENIOR_REVIEW → TAX_REVIEW → PARTNER_APPROVAL → APPROVED`, + EXCEPTION/REJECTED/ARCHIVED, return satu stage). Semua transisi (review approve/reject/return, resolve exception) hanya lewat fungsi terpusat `transitionJournal`/`resolveException` di `src/server/journal-machine.ts` — tiap transisi menulis ActivityLog + SlaEvent.
- **Konsekuensi:** (+) Integritas terjamin; audit trail lengkap; (−) fungsi baru harus lewat state machine (disengaja).
- **Alternatif ditolak:** update status langsung dari route handler.

# ADR-003: Tenant-aware sejak awal (firmId)

- **Status:** Accepted (2026-08-07)
- **Konteks:** MVP single kantor akuntan, tapi roadmap multi-firm; migrasi tenant belakangan mahal.
- **Keputusan:** Semua tabel punya `firmId`; seluruh query API memfilter `firmId` dari session (tanpa IDOR).
- **Konsekuensi:** (+) Aman untuk multi-firm nanti; (−) setiap query menyertakan filter (standar).
- **Alternatif ditolak:** single-tenant tanpa kolom (migrasi besar nanti).

# ADR-004: AI pipeline modular, rule engine primer + LLM opsional

- **Status:** Accepted (2026-08-07)
- **Konteks:** Draft jurnal butuh konsistensi PSAK/PPN; LLM API tidak selalu tersedia/termurah; provider bisa berubah.
- **Keputusan:** Pipeline `OCR → Event Detection → Drafting → Validation → Scoring` di `src/ai/`. Rule engine deterministik (knowledge base `src/ai/knowledge/`) adalah jalur utama; LLM (OpenAI-compatible, GLM default) hanya dipakai jika `LLM_API_KEY` diset DAN confidence rule engine rendah. Provider diganti via env (`LLM_BASE_URL`/`LLM_MODEL`).
- **Konsekuensi:** (+) Jalan tanpa API key; biaya terkendali; provider swappable; (−) rule engine perlu pemeliharaan untuk dokumen kompleks.
- **Alternatif ditolak:** LLM sebagai jalur utama (biaya, non-determinisme, dependensi eksternal).

# ADR-005: Enkripsi at-rest dokumen (AES-256-GCM)

- **Status:** Accepted (2026-08-07)
- **Konteks:** Dokumen klien = data sensitif (PII, keuangan); file di filesystem tidak boleh terbaca langsung.
- **Keputusan:** `src/lib/crypto.ts` — AES-256-GCM, IV acak per file, format `[iv(12)][tag(16)][ciphertext]`; kunci dari `STORAGE_ENCRYPTION_KEY` (hex 64); fallback dev ber-warning. Dekripsi hanya saat worker membaca.
- **Konsekuensi:** (+) File aman at-rest; (−) kehilangan kunci = file tak terbaca (backup kunci wajib).
