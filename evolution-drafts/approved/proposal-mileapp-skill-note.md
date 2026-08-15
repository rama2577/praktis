# Evolution Proposal: Rama memberikan skill proposal-mileapp untuk dipasang ke skill agent — catat keberadaan dan kegunaan skill ini di memori agar saat Rama minta dibuatkan proposal, skill langsung dipakai.

- Proposal-ID: evo-2026-08-14-proposal-mileapp-skill-note
- Status: approved
- Signature: proposal-mileapp-skill-note
- Created-At: 2026-08-14 14:12
- Last-Seen-At: 2026-08-14 14:12
- Target-File: MEMORY.md
- Trigger-Type: preference
- Confidence: medium

## Why This Matters
- Rama memberikan skill proposal-mileapp untuk dipasang ke skill agent — catat keberadaan dan kegunaan skill ini di memori agar saat Rama minta dibuatkan proposal, skill langsung dipakai.

## Evidence
- Interactive proposal card was present in the session UI.
- The original pending draft file was unavailable at approval time.
- AutoClaw reconstructed this draft from the proposal payload so the review result can still be recorded.

## Duplicate Check
- Checked: pending draft path + signature/proposal fallback
- Result: original draft file missing
- Decision: create surrogate draft from proposal payload

## Proposed Change
### MEMORY.md — catatan skill proposal-mileapp

---
summary: "Long-term memory record"
autoclaw.schema: "agent-profile/v1"
human.name: "Rama Wijaya"
human.call: "Rama"
human.timezone: "Asia/Jakarta"
human.linkedin: "https://www.linkedin.com/in/rama-wijaya-supplychain/"
human.focus:
  - "supply chain"
  - "coding"
  - "writing"
  - "data"
  - "product"
  - "design"
agent.name: "AutoClaw"
agent.role: "AI coworker"
agent.style:
  - "sharp"
  - "resourceful"
  - "no-nonsense"
agent.emoji: "🦞"
notes.project:
  - "Current project not recorded yet"
notes.workflow:
  - "Capture recurring workflows here"
notes.memory:
  - "Summarize stable facts and working patterns"
notes.tools:
  - "Record important tools, services, and local setup here"
lessons:
  - "Confirm before making risky changes"
  - "Persist important facts so they survive the session"
---

# MEMORY.md — Long-Term Memory

## 主人信息
- **Nama lengkap**: Rama Wijaya
- **Panggilan**: Rama
- **Timezone**: Asia/Jakarta
- **Language**: English
- **LinkedIn**: https://www.linkedin.com/in/rama-wijaya-supplychain/
- **CV**: Rama_Wijaya_CV.pdf
- **Bidang profesional**: supply chain, coding, writing, data, product, design
- **First online**: 2026-08-07

### Profil Profesional
- **Posisi saat ini**: VP Business Development & Partnership di Mile.app
- **Pengalaman**: 20+ tahun di logistics, supply chain, retail, operations, finance
- **Keahlian inti**: Business Development, Strategic Partnerships, Supply Chain Management, Logistics, Digital Transformation, Negotiation, Financial Modeling, P&L Management, Last-Mile Delivery, Process Improvement (Six Sigma Black Belt)
- **Pencapaian**: turnaround delivery 50%→97%, bangun last-mile app 1M+ shipment/hari, pemangkasan biaya operasional 20%
- **Riwayat**: JNE (15 tahun), Boma Cargo (Co-Founder), Mile.app, ASPERINDO (West Java Chairman), First Security Services, Global Secont, Shields Indonesia, Sumitomo Electric
- **Pendidikan**: MASc Logistics MITx, S1 Fiskal UI, Matematika UT
- **Bahasa**: Indonesia (native), English (professional), French (limited), Dutch (elementary)

## 身份
- **AutoClaw** — AI coworker 🦞
- **Creature**: sharp, resourceful, no-nonsense
- **Emoji**: 🦞

## 当前项目
- **Praktis (LedgerLine) — AI bookkeeping utk firma akuntansi (Next.js 16.3, Prisma, Postgres) — LIVE demo di Railway (2026-08-13)**
- **Repo**: github.com/rama2577/praktis (ledgerline) · branch `main`
- **Demo production**: Web https://web-production-7a593.up.railway.app · service `web` + `worker` (pipeline BullMQ) · Postgres+Redis Railway plugins · volume web-volume → /app/uploads · Railway project `praktis-demo`
- **Login demo**: `admin@ledgerline.dev` / `password123` (firma KAP LedgerLine Demo, 3 klien, 35 KB items)
- **Deploy**: `railway up -d -y` (Dockerfile, output standalone, `prisma migrate deploy` tiap boot); seed via `railway ssh -s web "cd /app && npx prisma db seed"`
- **Deploy lessons Praktis**: DATABASE_URL/REDIS_URL harus di-set manual dari plugin (tidak auto-inject); `railway run` lokal tak bisa akses `*.railway.internal` → seed via SSH container; `RAILWAY_START_COMMAND` tidak efektif → `WORKER_MODE=1` env + branch CMD Dockerfile; SSH key Railway perlu register (`railway ssh keys add`) + host key berubah tiap deploy (`accept-new`)
- **Pricing final (disetujui Rama)**: kuota-only per klien — bulanan Mikro 100tx/Rp300rb · Low 500tx/Rp500rb · Middle 1.000tx/Rp700rb; tahunan Mikro 2.000tx/Rp1jt · Low 5.000tx/Rp3jt · Middle 14.000tx/Rp5jt; over-quota Rp350/tx; target GP 75–85% (asumsi AI Rp70/tx via model routing); paywall modul SPT Tahunan via `annualPaidAt`; analisa lengkap di `docs/analisis-komersial-pricing.md`
- **MBS (Mile Business Suite) — ERP multi-tenant UMKM; Wave A+B SELESAI + LIVE di produksi (2026-08-13)**
- **Repo**: github.com/rama2577/MBS (origin) · branch `main` · commit author `rama@mile.app`
- **Produksi**: Web https://mbs-sage.vercel.app (Vercel) · API https://mbs-production-52da.up.railway.app (Railway, Docker nginx+php-fpm, Postgres 16) · Railway project `alert-sparkle` (service MBS)
- **Login demo**: `admin@mbs.test` / `password`; tenant kargo `cargo@demo.test`
- **Wave A+B**: Fase 0 hardening, Kargo Shipment, Month-End cockpit, Dockable Workspace, PSAK 71 ECL, Global search ⌘K, Outline agreements+PO binding, E2E Playwright 7/7 (5 spec)
- **Deploy lesson**: migrasi prod di `api/docker/start.sh` (`migrate --force` tiap boot); Railway "Pre-deploy Command" tidak jalan utk git-triggered deploy; file >100MB di history → filter-branch + force push
- **Local preview**: API 127.0.0.1:8011 (sqlite, RATE_LIMIT_DISABLED=true) + web 127.0.0.1:3100
- **E2E**: `cd web && npm run test:e2e` (port 8011/3100; jangan 3000/8001 — bentrok app lain)
- **Sisa backlog**: cutover PostingRuleEngine shadow→live (multi-week)

## 系统架构
- _(待补充)_

## 工作流
- Capture recurring workflows here

## 记忆系统架构
OpenClaw 三层记忆：
1. **MEMORY.md** — 精选长期记忆（核心事实/偏好）
2. **memory/YYYY-MM-DD.md** — 每日记忆日志（append-only）
3. **sessions/** — 会话历史（JSONL 格式，仅短期）

## 开发工具链
- Record important tools, services, and local setup here

## 待探索
- _(待补充)_

## 重要教训
1. Confirm before making risky changes
2. Persist important facts so they survive the session

## 技能索引
见 workspace/.agents/skills/ 目录下的 SKILL.md 文件
- **proposal-mileapp**: skill membuat proposal (zip dari Rama, terpasang 2026-08-14 di ~/.openclaw-autoclaw/skills/proposal-mileapp/) — pakai saat Rama minta dibuatkan proposal (mis. untuk Mile.app)

## Apply Plan
1. Keep this reconstructed draft as the approval artifact.
2. Record the proposal content exactly as shown in the interactive card.
3. Append an audit note after approval or rejection.

## Audit Note
- Approved by Rama on 2026-08-14 14:12 (user message: "批准 evo-2026-08-14-proposal-mileapp-skill-note").
- Change applied to MEMORY.md on 2026-08-14 14:12: added `proposal-mileapp` bullet under 技能索引.

## User Approval
- Approve: 批准 evo-2026-08-14-proposal-mileapp-skill-note
- Reject: 拒绝 evo-2026-08-14-proposal-mileapp-skill-note