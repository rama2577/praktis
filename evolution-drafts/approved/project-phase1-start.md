# Evolution Proposal: Mencatat dimulainya proyek baru (Phase 1) di MEMORY.md agar sesi berikutnya langsung tahu konteks proyek yang sedang dikerjakan Rama.

- Proposal-ID: evo-2026-08-07-project-phase1
- Status: approved
- Signature: project-phase1-start
- Created-At: 2026-08-07 11:46
- Last-Seen-At: 2026-08-07 11:46
- Target-File: MEMORY.md
- Trigger-Type: preference
- Confidence: medium

## Why This Matters
- Mencatat dimulainya proyek baru (Phase 1) di MEMORY.md agar sesi berikutnya langsung tahu konteks proyek yang sedang dikerjakan Rama.

## Evidence
- Interactive proposal card was present in the session UI.
- The original pending draft file was unavailable at approval time.
- AutoClaw reconstructed this draft from the proposal payload so the review result can still be recorded.

## Duplicate Check
- Checked: pending draft path + signature/proposal fallback
- Result: original draft file missing
- Decision: create surrogate draft from proposal payload

## Proposed Change
### MEMORY.md

---
summary: "Long-term memory record"
autoclaw.schema: "agent-profile/v1"
human.name: "Rama"
human.call: "Rama"
human.timezone: "Asia/Jakarta"
human.focus:
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
- **Name**: Rama
- **Timezone**: Asia/Jakarta
- **Language**: English
- **First online**: 2026-08-07

## 身份
- **AutoClaw** — AI coworker 🦞
- **Creature**: sharp, resourceful, no-nonsense
- **Emoji**: 🦞

## 当前项目
- **Proyek aktif: build aplikasi dari mockup (chat.z.ai/space/m1ak5692s8r1-art) — Phase 1 dimulai 2026-08-07**
- **代码仓库**: _(待补充)_
- **主要分支**: _(待补充)_

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

## Apply Plan
1. Keep this reconstructed draft as the approval artifact.
2. Record the proposal content exactly as shown in the interactive card.
3. Append an audit note after approval or rejection.

## User Approval
- Approve: 批准 evo-2026-08-07-project-phase1
- Reject: 拒绝 evo-2026-08-07-project-phase1