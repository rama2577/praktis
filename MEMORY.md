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
- **Gateway**: _(待补充)_
- **模型**: _(待补充)_
- **渠道**: _(待补充)_
- **浏览器**: _(待补充)_

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