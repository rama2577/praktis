# OpenClaw: An In-Depth Research Report

**Prepared:** August 10, 2026
**Subject:** OpenClaw — the open-source personal AI agent platform (formerly Warelay / Clawdbot / Moltbot)
**Method:** Multi-source desk research. Primary sources (GitHub repository & API, official docs, creator's blog, OpenClaw Foundation blog, official newsletters) were retrieved directly; secondary/tertiary coverage (Wikipedia, CNBC, Bloomberg, TechCrunch, Reuters, SCMP, The Register, security-vendor research) was gathered via live web search. Facts are marked by confidence where sources conflict. All claims below were verified in sources opened or searched during this research session.

---

## Executive Summary

OpenClaw is the fastest-growing open-source project in GitHub history: from first commit (November 24, 2025) to **385,717 stars and 81,073 forks** as of August 10, 2026 — roughly 386K stars in under nine months. It is a self-hosted, MIT-licensed "personal AI assistant" that connects any LLM (Claude, GPT, DeepSeek, local models) to the messaging apps people already use (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, 20+ channels), and gives the agent tools to act: email, calendar, browser, files, voice, cron, and a skills/plugin ecosystem.

Its trajectory is a genuine industry event, not just a developer fad:

- **Viral launch & naming drama.** Built by Austrian developer Peter Steinberger (ex-PSPDFKit founder) after 43 failed projects, the project went through five names in two months (Warelay → CLAWDIS → Clawdbot → Moltbot → OpenClaw), including a forced rename under trademark pressure from Anthropic.
- **Creator joined OpenAI; project went to a foundation.** In February 2026, Steinberger joined OpenAI to build "the next generation of personal agents," while OpenClaw was placed in an independent non-profit, the OpenClaw Foundation (501(c)(3), formally announced July 8, 2026), with a full-time team and sponsors including OpenAI, NVIDIA, GitHub, Microsoft, Vercel, and the University of Michigan.
- **Big-tech adoption.** Microsoft shipped "Scout" (an "Autopilot" personal agent) built on OpenClaw at Build 2026; NVIDIA launched NemoClaw (OpenClaw + Nemotron open models + secure runtime) at GTC 2026, with Jensen Huang declaring "every company in the world today needs to have an OpenClaw strategy" and calling it "the new Linux." Google is reportedly building a rival agent ("Remy").
- **China is a second epicenter.** China-based usage reportedly overtook US usage by March 2026; Tencent and Z.ai announced OpenClaw-based services; Shenzhen's Longgang district issued subsidies for OpenClaw-based "one-person companies" — even as Beijing restricted state agencies, banks, and SOEs from using it.
- **Serious security liabilities.** Broad default permissions, prompt-injection susceptibility, an unvetted third-party skill marketplace, and a wave of exposed instances (BitSight counted 679 exposed on Jan 27, 2026 → 31,674 by Feb 8) have made OpenClaw the poster child — and warning label — for autonomous-agent security.

**Bottom line:** OpenClaw has become the de facto open-source *layer* for personal agents — the "Linux moment" for agent infrastructure — but its biggest challenges (security, governance, hype-vs-reality gap, platform dependency) are also the defining problems of the entire agent era it helped ignite.

---

## 1. Definition, Background, and Current Development

### 1.1 What it is

OpenClaw is a free, open-source (MIT), self-hosted **personal AI assistant and agent runtime**. Its defining design choices:

- **Runs on your machine** (macOS, Linux, Windows; Node.js 22+/24+/25+), not in a vendor cloud. Configuration and interaction history stay local.
- **Single-operator** design: one assistant per user, meeting them in the chat apps they already use (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, Matrix, Teams, QQBot, and more).
- **Model-agnostic**: works with hosted models (Claude, GPT, Gemini, DeepSeek) and local models alike.
- **Agentic, not conversational**: it doesn't just answer — it executes tasks via tools, skills, cron schedules, browser control, voice, and device nodes.
- **Gateway architecture**: a local "Gateway" control plane (sessions, tools, events, channels) plus an agent runtime (planner + skills), with companion apps for voice, canvas, camera, and screen on supported platforms.

### 1.2 Background and origin story

- **Creator:** Peter Steinberger, an Austrian developer who sold his previous company PSPDFKit (a PDF SDK) for €100M+, disappeared from the industry for ~3 years, then built 43 failed projects before project #44, the one that became OpenClaw. He describes himself as a "vibe coder" who "ships code he doesn't read."
- **Genesis:** First published **November 24, 2025** under the name **Warelay** (confirmed by GitHub API `created_at`). It evolved from "Clawd" (now "Molty"), an AI assistant character he built, named after Anthropic's Claude — with a lobster mascot and lore ("space lobster," "the claw is the law").
- **The naming saga (5 names in ~2 months):**

| Name | From | Note |
|---|---|---|
| Warelay | Nov 24, 2025 | Original repo name |
| CLAWDIS | Dec 3, 2025 | Interim rename |
| Clawdbot | Jan 2, 2026 | Name under which it went most viral |
| Moltbot | Jan 27, 2026 | Renamed under "polite pressure" / trademark complaints from Anthropic (phonetic similarity to Claude, lobster "Clawd" mascot) |
| OpenClaw | Jan 30, 2026 | Chosen because "Moltbot never quite rolled off the tongue" and it "cleared trademark checks" while reflecting open-source nature |

- **Viral trajectory:** It trended #1 on GitHub within weeks; set a record of **25,310 stars in a single day** (Jan 26, 2026); crossed **200K stars in 84 days** (Feb 16, 2026); **~250K by early March 2026**, overtaking React as the most-starred *non-aggregator* software project; and sits at **385,717 stars / 81,073 forks today**. Note: several headlines claim "most-starred project in GitHub history" — that is accurate only among non-aggregator projects; freeCodeCamp (a learning aggregator) still holds a higher absolute count. The uncontested claim is **fastest-growing repository in GitHub history**.

### 1.3 Current development status (as of August 2026)

- **Governance:** The OpenClaw Foundation — a US 501(c)(3) non-profit — formally launched **July 8, 2026** (blog post by Dave Morin and Peter Steinberger). It runs the project with a paid full-time team (Chief Architect Vincent Koc; engineers Josh Avant, Patrick Erichsen, Dallin Romney, Jason Sy, Gideon Adegbesan; ops: partnerships, finance, community, talent) plus a global volunteer maintainer community. The foundation's stated ambition: make OpenClaw "the Switzerland of AI" — neutral ground where every model lab plugs in and collaborates on standards.
- **Funding & partners:** Institutional donors include the University of Michigan (largest donor, which also launched an "Institute for Agentic Computing"), OpenAI (major donor; also funds "Claw Labs," a team inside OpenAI led by Steinberger working on shared product improvements), plus sponsors NVIDIA, GitHub, Vercel, Blacksmith, Convex, Microsoft, Red Hat, Tencent, Atlassian, Cloudflare. 311 individuals fund it via GitHub Sponsors. (Early on, donations were reported around $10K–20K/month; the foundation model changed this materially.)
- **Release cadence:** Very fast. npm `openclaw` is at version **2026.7.1-2** (July 2026), MIT-licensed; the official newsletter reported **1.5M weekly npm downloads** in early March 2026 (with Homebrew at ~4.4K installs/30 days then). The Foundation claims **4.5 million "new claws" (instances) created per week** — a figure to treat as an internal-telemetry claim rather than an audited metric.
- **Ecosystem:** ClawHub, the public skills registry, grew from ~2,800 skills (early 2026) to 10,000+ (March 2026) and reportedly 44,000+ by mid-2026 (sources vary by date; the latter is a single third-party count). ClawCon community events: 34 events across 16 countries in five months, ~30,000 signups. Internal tooling (ClawSweeper, Crabbox, Crabfleet) powers an "agentic engineering" workflow.

---

## 2. Core Issues, Key Components, and Major Stakeholders

### 2.1 Key components (architecture)

- **Gateway** — the local control plane: routing, connectivity, authentication (pairing), session management, events, tool dispatch, and channel connections.
- **Agent runtime** — reasoning and execution: a planner that selects and calls "skills"; supports hosted + local model providers (Claude, GPT, Gemini, DeepSeek, Nemotron, etc.).
- **Channels** — 20+ messaging-platform adapters (WhatsApp via the unofficial Baileys library, Telegram, Discord, Slack, Signal, iMessage, Matrix, Microsoft Teams, QQBot, Google Chat, etc.). Text everywhere; media/reactions vary by platform.
- **Skills** — the core extensibility unit: directories containing a `SKILL.md` with metadata + instructions on how to perform tasks and call tools. Bundled, global, or workspace-scoped (workspace takes precedence). Skills are shared through **ClawHub**; plugins (via a plugin SDK) extend capabilities further.
- **Tools & nodes** — browser control, voice, Canvas, camera, screen, device-local actions on companion apps.
- **Control surfaces** — Control UI (web dashboard), CLI, TUI; scheduling (cron), memory, and session persistence across channels.
- **Deployment** — installer for macOS/Linux/Windows, npm global package, Docker/Nix paths; runs as a daemon.

The architecture is frequently described as "hub-and-spoke": channel adapters → gateway control plane → agent runtime → tools/execution.

### 2.2 Core issues (technical & product challenges)

1. **Security is the defining issue.** The agent needs broad permissions (email, calendar, messaging, files, shell) to be useful, which makes misconfiguration catastrophic. See §5.
2. **Hype vs. reality gap.** Massive star counts vs. thin verified usage; skeptics note few people actually run it day-to-day; documentation and guides lag the hype ("245K stars and zero real guides for PMs"; setup is repeatedly described as not beginner-friendly; one practitioner reported "the only reliable use case I've found is daily news digests").
3. **Complexity and reliability.** Quiet failures, unpredictable autonomous behavior, breaking changes in a very fast release cadence, and non-trivial install friction (a comparative test reported OpenClaw failing to install where CrewAI ran in 40 minutes).
4. **Platform dependency.** WhatsApp integration rides on unofficial protocols (Baileys) → account-ban risk; Google banned OpenClaw users from Antigravity/Gemini for ToS/OAuth abuse; model-API ToS compliance is a recurring gray area.
5. **Sustainability post-founder.** The founder moved to OpenAI; the foundation structure is young (July 2026) and must prove it can fund and govern a project of this scale neutrally (see §6).

### 2.3 Major stakeholders

| Stakeholder | Role / Interest |
|---|---|
| **Peter Steinberger** | Creator; now at OpenAI (Claw Labs) but "keeps making the calls, especially the technical ones" per the foundation |
| **OpenClaw Foundation** | Non-profit steward; governance, funding, full-time team, standards councils (agent identity, agent profiles, evals, enterprise deployment) |
| **OpenAI** | Employer of the creator; major donor; inference support; Codex Security hardening; strategic interest in personal agents |
| **Microsoft** | Built **Scout** on OpenClaw (Build 2026); contributes upstream; Windows companion app collaboration (despite Nadella's earlier "virus" remark) |
| **NVIDIA** | NemoClaw stack (GTC 2026); wants OpenClaw to run on its hardware/models ("OpenClaw strategy" for every company) |
| **Google** | Competitor (building "Remy"); enforcer of model ToS (Antigravity bans) |
| **Anthropic** | Trademark complainant (forced rename); model provider; indirect competitor |
| **Tencent, Z.ai, Red Hat, Atlassian, U. Michigan, Vercel, Cloudflare, GitHub, Convex, Blacksmith** | Foundation partners: maintainers, infra, enterprise credibility |
| **China (state + local)** | Central government restricts it (banks/SOEs); Shenzhen Longgang subsidizes OpenClaw-based one-person companies |
| **Security researchers** (BitSight, Cisco Talos/Unit 42, Immersive Labs, Backslash, Giskard) | Document vulnerabilities; shape enterprise perception |
| **Community** | Tens of thousands of contributors; skill authors; ClawCon organizers; the "clawtributors" |
| **Users** | Developers, power users, freelancers, small businesses, Chinese early adopters, enterprise pilots via Scout/enterprise partners |

---

## 3. Main Use Cases and Target Users

### 3.1 Use cases (documented)

**Personal productivity**
- Email triage, drafting/sending, inbox zero; calendar management and scheduling; reminders (cron); bill paying and subscription renewals; travel planning/bookings; meal planning and grocery lists; news digests.

**Business operations (SMB/freelancer)**
- Lead generation workflows: prospect research, website auditing, CRM integration (explicitly cited by Steinberger's own bio); client onboarding; nonprofit grant writing and donor outreach.

**Development & technical**
- GitHub issues/PRs, code workflows, server monitoring and alerting, browser automation, custom tools and integrations; running agents as "digital employees."

**Life/novelty (especially China, per Business Insider/SCMP)**
- Stock-trading assistants, "blind-date wingmen" (dating-app agents — which produced the MoltMatch consent controversy), digital pets ("raise a lobster"), agent-to-agent social networking (Moltbook).

**Commercial layer forming around it**
- Done-for-you setup services ($2K–5K/client), custom skills, agency automation services; the emergent "skills as the new SaaS" economy.

### 3.2 Target users

- **Primary:** developers and technically capable power users who can run a Node.js daemon, manage API keys, and configure a gateway. The maintainers themselves warn this is not for non-technical users (a maintainer's Discord warning: "if you can't understand how to run a command line, this is far too dangerous of a project for you to use safely").
- **Secondary:** freelancers and small businesses automating operations; Chinese early adopters and "one-person companies" (OPC) now explicitly encouraged by Shenzhen's subsidy policy; enterprises (via Microsoft Scout, Red Hat, and foundation "enterprise deployment" council); researchers and academics (U. Michigan Institute for Agentic Computing).
- **Explicitly not (yet):** casual consumers — reviewers (Platformer) consistently cite complexity and security risk as disqualifying for mainstream users. "An agent my mum can use" is the stated goal of the OpenAI work, not the current state.

---

## 4. Market, Industry, Technology, and Competitive Landscape

### 4.1 Market & industry context

OpenClaw sits at the center of the 2025–2026 **"personal agent" wave** — the shift from chatbots that answer to agents that act. Signals:

- Big Tech validated the category by building *on* OpenClaw (Microsoft Scout) or *in response* to it (Google Remy, per Business Insider, May 2026; Microsoft's earlier "Project Lobster"/"ClawPilot" experiments per GeekWire, May 2026).
- **China** is a co-epicenter: CNBC (March 12, 2026) reported China-based usage topping the US, driving demand for cheaper Chinese models (DeepSeek); Tencent and Z.ai announced OpenClaw-based services; Shenzhen Longgang's "Ten Measures" (draft, March 7, 2026) offer up to ¥2M per key project and packages up to ~¥10M (subsidies, equity, free compute, office space) for OpenClaw/OPC developers; a "lobster trade" of AI-linked stocks emerged (SCMP).
- **Regulatory environment:** The EU AI Act contains no explicit "agent" concept, but from **August 2, 2026** transparency obligations (Art. 50) apply to AI systems that interact with natural persons, and member-state AI sandboxes were due by the same date. China's approach is contradictory: central restrictions on state use (March 2026, citing data leaks/deletion and energy concerns) alongside local government subsidies.

### 4.2 Technology landscape

- **Category definition:** OpenClaw is a *personal agent gateway/runtime* — closer to a self-hosted "AI operating system" for one user than to a workflow tool or a coding agent.
- **Adjacent open-source categories:** agent frameworks/orchestration (AutoGPT, CrewAI, LangGraph, AutoGen, Dify, Mastra), workflow automation (n8n), local agent products (AgentGPT, SuperAGI, OpenHands), and agent runtimes it has influenced (e.g., Mario Zechner's "pi"). The common framing: LangGraph/CrewAI for developers building multi-agent systems; OpenClaw for a "personal AI agent that just works" through chat.
- **Commercial alternatives:** ChatGPT/Operator (OpenAI), Claude apps/computer-use (Anthropic), Google's Gemini/assistant line, plus new entrants (Microsoft Scout, Google Remy) that are increasingly *built on* OpenClaw rather than competing with it.
- **Ecosystem economics:** ClawHub (tens of thousands of skills) makes skills a distribution surface — "skills are becoming the new SaaS" — while simultaneously being the main supply-chain attack surface.

### 4.3 Competitive landscape summary

| Player | Type | Relationship to OpenClaw |
|---|---|---|
| Microsoft Scout | Commercial personal agent (Autopilot) | **Built on OpenClaw**; contributes upstream |
| NVIDIA NemoClaw | Open model stack + secure runtime | **Built on OpenClaw**; competing on model/infra layer |
| Google Remy (reported) | Commercial agent | Direct competitor, built in-house |
| OpenAI (Claw Labs / personal agents) | Commercial agents | Employs creator; sponsors foundation; OpenClaw stays independent |
| Anthropic | Model provider + consumer agents | Trademark antagonist; model partner |
| AutoGPT / CrewAI / LangGraph / AutoGen / Dify / n8n | OSS frameworks | Conceptual competitors; different layer (build vs. use) |
| Chinese ecosystem (Tencent, Z.ai, DeepSeek adaptations) | Localized services | Fork/adapt OpenClaw for WeChat + domestic models |

---

## 5. Opportunities, Challenges, Risks, and Limitations

### 5.1 Opportunities

- **First-mover infrastructure position.** If "every company needs an OpenClaw strategy" is even half-true, the foundation controls a strategic chokepoint: the neutral, MIT-licensed substrate for personal agents, akin to Linux for servers.
- **Standards-setting power.** Foundation councils on agent identity, profiles, evals, and enterprise deployment could define how agents identify and interoperate — a role with enormous leverage.
- **Model-neutral aggregation.** As the "Switzerland of AI," it can route demand across labs (Claude, GPT, DeepSeek, Nemotron) and capture value from the model wars rather than picking a side.
- **Enterprise wedge.** Microsoft Scout, Red Hat, Atlassian, and the enterprise council open a path from hobbyist tool to corporate standard.
- **Monetization layer for the ecosystem** (not the foundation): setup services, managed hosting, vertical products, skill marketplaces.

### 5.2 Challenges

- **Turning hype into durable, verifiable usage** — the single biggest credibility gap.
- **Security-by-default** — retrofitting least-privilege, sandboxing, and skill vetting into a tool designed for maximum capability.
- **Neutrality under pressure** — remaining "Swiss" while OpenAI is a major donor and employs the founder; Microsoft, NVIDIA, and Tencent all contribute upstream. Conflicts of interest are structural, not hypothetical.
- **Governance maturity** — a 501(c)(3) that is months old stewarding a project with 385K stars and 80K forks; maintainer burnout risk; bus-factor (mitigated by the paid team, but young).

### 5.3 Risks (documented, high confidence)

- **Prompt injection & data exfiltration.** Cisco's AI security team demonstrated a third-party skill performing exfiltration and prompt injection "without user awareness"; Giskard documented cross-session data leakage; prompt injection is the canonical attack on agentic systems.
- **Exposed instances at scale.** BitSight: 679 publicly exposed instances on Jan 27, 2026 → 31,674 by Feb 8, 2026 (some scans report 40K+; third-party counts range up to 220K depending on methodology). Community reports describe "active hacking campaigns" against unauthenticated instances. A maintainer's own warning acknowledges the danger for non-technical users.
- **Supply-chain attacks.** Compromised npm tooling (a Cline CLI token compromise) was used to silently install OpenClaw on developer machines (CSO Online); Palo Alto Unit 42 found and reported malicious skills on ClawHub (removed after report); ~15% of community skills were claimed suspicious by one researcher (community claim, not independently verified).
- **Platform enforcement.** Google suspended OpenClaw users from Antigravity/Gemini over "malicious usage" (OAuth token routing) — hundreds of paying users, later partially addressed via reinstatement discussions; WhatsApp accounts risk permanent bans via the unofficial Baileys bridge; model-API ToS compliance is a gray zone.
- **Autonomous-agent harms.** The MoltMatch incident (an agent created a dating profile and screened matches without the user's explicit direction) and agent impersonation cases highlight consent/accountability gaps that regulators and courts will eventually define.
- **Regulatory whiplash.** China's state-use ban (data deletion/leak and energy concerns, per The Economist) shows how fast governments can move against the category; EU transparency rules from Aug 2, 2026 are the first compliance wave.

### 5.4 Limitations

- **Not for non-technical users** (setup, security burden, CLI-first).
- **Single-operator design** — not a multi-tenant/multi-user platform by default.
- **Reliability of autonomous execution** — unpredictable behavior, quiet failures; reviewers describe it as powerful for *structured* automation but "expensive and not plug-and-play" (LLM API costs are the hidden price).
- **Documentation/onboarding lag** relative to its popularity.
- **Metric opacity** — key adoption numbers (instances, "claws born," skill counts) come from the foundation or fan sites and vary widely between sources.

---

## 6. Future Direction and Trends to Watch

### 6.1 Likely directions

1. **OpenAI's personal-agent push ("an agent my mum can use").** Steinberger's stated mission is consumer-grade agents; Claw Labs inside OpenAI works on shared product improvements. Expect OpenAI's personal-agent product to bear OpenClaw's DNA — and watch for tensions with the foundation's neutrality claim.
2. **Foundation-driven standardization.** The councils on **agent identity, agent profiles, evals, and enterprise deployment** are the most important things to watch: if OpenClaw defines how agents prove identity and are evaluated, it sets the protocol layer of the agent era (the "HTML moment," per NVIDIA's framing).
3. **Enterprise distribution.** Microsoft Scout (Autopilot category), Red Hat's dedicated team, and Atlassian's enterprise hardening point to a corporate rollout path; the "always-on agent with its own identity" is becoming a product category.
4. **Security hardening as a product.** Codex Security (OpenAI), OpenShell (NVIDIA's secure runtime), sandboxing, and skill vetting will increasingly differentiate safe deployments — and security incidents will drive the roadmap.
5. **China divergence.** Expect Chinese forks/ecosystems (WeChat, DeepSeek, domestic hosting) to grow semi-independently, with local subsidies and central restrictions coexisting — a de-facto split of the "global standard" ambition.

### 6.2 Trends to watch (signals, not predictions)

- **Agent-to-agent networks.** Moltbook (a social network for AI agents) and the dating-agent incident preview a world where agents interact with agents — with identity, consent, and impersonation as open legal/social questions.
- **Skills as an economic layer.** ClawHub's growth and the "skills are the new SaaS" thesis suggest a marketplace economy forming around agent capabilities — and a corresponding malware economy (already visible).
- **Model-neutrality vs. capture.** Whether the foundation can stay neutral while its biggest sponsor employs its founder is the defining governance test.
- **The star-count authenticity debate.** Community claims of bot-inflated stars were never conclusively resolved; as with many viral repos, treat star counts as attention metrics, not usage metrics. Watch for independent usage data (npm downloads, telemetry disclosures, enterprise case studies) as the real signal.
- **Regulation of autonomous action.** EU Art. 50 transparency (Aug 2, 2026), China's restrictions, and any future "agent accountability" rules will shape how much autonomy products like OpenClaw can offer.
- **Big Tech responses.** Google's "Remy," Apple's eventual move, and whether Microsoft expands Scout into a platform all determine whether OpenClaw remains the neutral substrate or becomes one vendor's component.

---

## 7. Key Facts Reference (with confidence)

| Fact | Value | Confidence |
|---|---|---|
| Repository created | 2025-11-24 (GitHub API) | High |
| Stars / forks (live) | 385,717 / 81,073 (Aug 10, 2026) | High |
| 200K milestone | Feb 16, 2026 (84 days) | High |
| 250K / surpasses React | ~Mar 3, 2026 | High (sources vary on exact date) |
| Single-day star record | 25,310 (Jan 26, 2026) | Medium (fan-site source) |
| License | MIT | High |
| Latest npm version | 2026.7.1-2 | High (npm registry) |
| Weekly npm downloads | ~1.5M (Mar 2026, official newsletter) | Medium-High |
| "New claws" per week | 4.5M (Foundation claim, Jul 2026) | Low-Medium (unverified telemetry) |
| Exposed instances | 679 (Jan 27) → 31,674 (Feb 8, 2026), BitSight | High (multiple corroborations; absolute counts vary by methodology) |
| Malicious/risky skills | Multiple confirmed cases (Cisco, Unit 42); ~15% claim unverified | Medium |
| Creator joins OpenAI | Feb 14–15, 2026 (Altman/CNBC/Bloomberg; creator's own post) | High |
| Foundation launched | July 8, 2026 (official blog) | High |
| Microsoft Scout (OpenClaw-based) | Announced June 2, 2026, Build | High |
| NVIDIA NemoClaw | Announced GTC 2026 (March) | High |
| China state-use ban | March 2026 | High |
| Shenzhen Longgang subsidies | Draft "Ten Measures," Mar 7 – Apr 6, 2026 consultation | High |

---

## 8. Primary Sources

- Official site: <https://openclaw.ai> · Docs: <https://docs.openclaw.ai> · Repo: <https://github.com/openclaw/openclaw> · Foundation: <https://openclaw.org>
- Creator's announcement (Feb 14, 2026): <https://steipete.me/posts/2026/openclaw>
- Foundation launch post (Jul 8, 2026): <https://openclaw.ai/blog/introducing-openclaw-foundation>
- Wikipedia: <https://en.wikipedia.org/wiki/OpenClaw>
- Microsoft Scout: <https://www.microsoft.com/en-us/microsoft-365/blog/2026/06/02/introducing-microsoft-scout-your-always-on-personal-agent/> · InfoQ: <https://www.infoq.com/news/2026/06/microsoft-scout-openclaw-build/>
- NVIDIA NemoClaw: <https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw> · Fierce Network (GTC commentary): <https://www.fierce-network.com/broadband/nvidia-gtc-openclaw-new-linux-and-every-company-needs-strategy-says-jensen-huang>
- CNBC (renames/rise, Feb 2, 2026): <https://www.cnbc.com/2026/02/02/openclaw-open-source-ai-agent-rise-controversy-clawdbot-moltbot-moltbook.html> · CNBC (joins OpenAI, Feb 15, 2026): <https://www.cnbc.com/2026/02/15/openclaw-creator-peter-steinberger-joining-openai-altman-says.html> · CNBC (China, Mar 12, 2026): <https://www.cnbc.com/2026/03/12/china-openclaw-ai-agent-adoption-tech-companies-government-support-lobster-shrimp.html>
- Bloomberg (China restriction): <https://www.bloomberg.com/news/articles/2026-03-11/china-moves-to-limit-use-of-openclaw-ai-at-banks-government-agencies>
- Reuters (Shenzhen subsidies): <https://www.reuters.com/world/asia-pacific/chinas-shenzhen-backs-openclaw-ai-with-subsidies-despite-beijings-security-2026-03-09/>
- SCMP (lobster trade): <https://www.scmp.com/business/china-business/article/3346307/openclaw-frenzy-diverts-chinese-investors-lobster-trade-amid-us-iran-war>
- Business Insider (China craze; Google Remy): <https://www.businessinsider.com/china-openclaw-craze-lobster-stock-trading-blind-dates-cyber-pets-2026-3> · <https://www.businessinsider.com/google-ai-agent-openclaw-remy-gemini-assistant-2026-5>
- GeekWire (Microsoft ClawPilot): <https://www.geekwire.com/2026/microsofts-openclaw-team-takes-on-the-personal-assistant-challenge/>
- Security: BitSight <https://www.bitsight.com/blog/openclaw-ai-security-risks-exposed-instances> · Cisco <https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare> · Unit 42 <https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk/> · Immersive Labs <https://www.immersivelabs.com/resources/c7-blog/openclaw-what-you-need-to-know-before-it-claws-its-way-into-your-organization> · TechTarget <https://www.techtarget.com/cybersecurity/tip/The-OpenClaw-security-risks-every-CISO-needs-to-know> · CSO Online (npm supply chain) <https://www.csoonline.com/article/4135449/compromised-npm-package-silently-installs-openclaw-on-developer-machines.html>
- Platform enforcement: VentureBeat (Antigravity) <https://venturebeat.com/orchestration/google-clamps-down-on-antigravity-malicious-usage-cutting-off-openclaw-users> · Google Gemini CLI discussion: <https://github.com/google-gemini/gemini-cli/discussions/20632>
- Adoption: OpenClaw newsletter (Mar 3, 2026) <https://buttondown.com/openclaw-newsletter/archive/openclaw-newsletter-2026-03-03/> · Foundation donors page <https://www.openclaw.org/donors>
- EU AI Act: <https://ai-act-service-desk.ec.europa.eu/en/faq> · Tech Policy Press <https://techpolicy.press/the-eu-ai-act-is-not-ready-for-agents>

---

*Note on conflicting claims: (1) OpenAI did not "acquire" OpenClaw — the creator was hired and the project moved to an independent non-profit; several outlets conflate the two. (2) Star-count authenticity (bot inflation claims) remains an unresolved community controversy — no independent audit has been published. (3) Adoption metrics (instances, skills, downloads) vary by source and date; the figures above are labeled accordingly.*
