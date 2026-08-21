# Definition of Done — LedgerLine

Diterapkan untuk **setiap perubahan** sebelum dinyatakan selesai (mengikuti `references/definition-of-done.md`).

## Checklist Proyek

### Correctness
- [x] Semua acceptance criteria task terpenuhi (Task 1–13 ✅, terverifikasi E2E tiap task)
- [x] Kode diverifikasi runtime (bukan hanya compile): E2E nyata tiap task (login, upload, pipeline, review, exception, dashboard)
- [x] Perilaku baru tertutup test (89 unit test; rule engine 96,5% coverage)
- [x] Tidak ada regresi (full suite hijau tiap task)
- [x] Edge & error path tertangani (upload palsu 400, rate limit 429, RBAC 403, reject tanpa catatan 400, transisi invalid 409)

### Quality
- [x] Naming & struktur jelas; logika bisnis tidak duplikat (state machine terpusat, builder pure)
- [x] Tidak ada dead code / debug output tersisa (auth-debug & debug-login dihapus)
- [x] Perubahan scoped per task
- [x] Lint & format hijau

### Integration
- [x] Bekerja dengan sistem utuh (vertical slice end-to-end: upload → draft AI → review 4 lapis → APPROVED)
- [x] Migrasi DB accounted (1 migration init; seed idempoten)
- [x] Kompatibilitas: Prisma 6 (bukan 7 — driver adapter), Next 16 App Router

### Documentation
- [x] API & perilaku terdokumentasi (README + docs/spec.md + tasks/todo.md)
- [x] Keputusan arsitektur dicatat (docs/adr/ ADR-001..005)
- [x] README quickstart ≤ 15 menit untuk developer baru

### Ship-readiness
- [x] Security: enkripsi at-rest, RBAC semua route, rate limit upload, magic bytes, security headers, bcrypt, no secrets di repo
- [ ] Login rate limit (NextAuth) — **terbuka**, butuh adapter custom
- [ ] Email alert SLA breach — **terbuka**, butuh provider SMTP
- [x] Observability: pino JSON + traceId, /api/health, alert in-app, metrik dasar (duration, error rate, SLA)
- [ ] Rollback path: DB migration reversibel — **sebagian** (migrasi maju; backup manual)
- [ ] **Review manusia (Rama) sebelum deploy** — pending

## Red flags yang dihindari
- Tidak ada "done tapi belum dijalankan" — tiap task punya bukti E2E.
- "Tests pass" tidak menggantikan docs/runtime — keduanya selalu ada.
- Batas berbeda per deadline — tidak berlaku (semua task lewat bar yang sama).

## Gate rilis (shipping-and-launch)
1. Tutup 3 item terbuka di atas (opsional untuk MVP lokal).
2. Rama menyetujui checkpoint dashboard & complete.
3. CI hijau di push (workflow `.github/workflows/ci.yml`).
4. Deploy: dokumentasi di README (Vercel/Node + PostgreSQL + Redis + worker).
