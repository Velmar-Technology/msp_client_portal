# StrategyArchitect: MSP Business Model Ideation & Strategic Analysis Agent

## Problem Statement
How might we create a dedicated strategic thinking partner that helps Velmar Technology ideate, validate, and refine new business models, pricing strategies, and revenue streams — grounded in live operational data rather than gut instinct?

---

## Recommended Direction

A dedicated strategic agent persona and skill located in `.agents/skills/strategy-architect/SKILL.md` paired with a curated set of 15 MCP read-only tools for business intelligence, financial analysis, client portfolio analysis, and strategic planning.

The agent operates across five distinct modes:
1. **Revenue & Unit Economics Analysis:** Pulls financial stats, invoices, and expenses to model margins, cost-per-ticket, LTV/CAC, and optimization levers.
2. **Client Portfolio Health & Upsell Scan:** Profiles the client base using health scores, equipment footprints, and plan distribution to identify upsell-ready, at-risk, and expansion-ready accounts.
3. **Pricing & Plan Optimization:** Audits the current plan catalog and feature gating to model new pricing structures (per-device, per-user, hybrid, à la carte, usage-based).
4. **New Business Model Ideation:** Combines `interview-me` and `idea-refine` skill frameworks with live MCP data to generate, stress-test, and converge on 2-3 actionable business model directions.
5. **Competitive Positioning & Market Fit:** Maps Velmar's value chain against commodity MSP services to identify differentiation opportunities and niche positioning.

---

## Key Assumptions to Validate
- [ ] **Data Availability:** The 15 selected MCP tools provide sufficient financial, client, and operational data for grounded ideation. (Validated by running Workflow A with real tool calls.)
- [ ] **Read-Only Safety:** Restricting the agent to read-only tools prevents accidental business model mutations while still enabling data-driven analysis.
- [ ] **Skill Framework Integration:** Combining `interview-me` and `idea-refine` frameworks produces higher-quality ideation outcomes than ad-hoc brainstorming. (Validated by running Workflow D end-to-end.)
- [ ] **MSP Domain Knowledge:** Grounding recommendations in MSP industry benchmarks (pricing, margins, revenue mix) prevents naive suggestions that don't translate to managed services reality.

---

## MVP Scope

### What's In:
- 15 curated read-only MCP tools spanning financial, client, plan, ticket, infrastructure, and compliance domains.
- 5 structured workflows with clear triggers, data gathering steps, and deliverables.
- Business Model Canvas one-pager template for standardized output.
- Strategic Analysis Report template for financial and portfolio analyses.
- Integration with `interview-me` and `idea-refine` skill frameworks for structured ideation.
- MSP industry context (pricing benchmarks, margin targets, growth levers, churn drivers).
- Output artifacts saved to `docs/ideas/`.

### What's Out (Not Doing & Why):
- **Write/Mutation Tools:** The agent never provisions subscriptions, modifies plans, or creates invoices. Strategic recommendations are implemented by humans or operational agents.
- **CRM Lead Pipeline Tools:** CRM deal-stage management is not included in MVP. Future extension could add `msp_list_leads` when the CRM module matures.
- **Market Research APIs:** The agent uses built-in MSP industry benchmarks, not external market data APIs. External research can be added as a future skill extension.
- **Automated Implementation:** The agent produces artifacts, not code. Implementation of business model changes requires explicit human delegation.

---

## Open Questions & Future Extensions
- **CRM Integration:** Add `msp_list_leads` and `msp_get_deal` tools when the CRM module is production-ready for lead-to-revenue pipeline analysis.
- **External Market Data:** Integrate MSP industry reports (ConnectWise, Datto, Kaseya benchmarks) via web search for competitive intelligence.
- **Multi-Tenant Comparison:** Enable side-by-side client portfolio analysis for identifying best-fit verticals or client segments.
- **Revenue Forecasting Engine:** Build a lightweight forecasting model (time-series) on top of invoice data for 3/6/12-month projections.

---

## File Manifest

| Artifact | Location | Purpose |
| :--- | :--- | :--- |
| Canonical Agent | `.agents/agents/strategy-architect.md` | Full agent definition with MCP tool registry, workflows, safety rules, and output templates |
| Canonical Copy | `.agents/agents/strategy-architect/strategy-architect.md` | Byte-identical copy (repo convention) |
| Paired Skill | `.agents/skills/strategy-architect/SKILL.md` | Skill definition with ideation process, frameworks, and anti-patterns |
| Runtime Registration | `.opencode/agents/strategy-architect.md` | Condensed opencode runtime variant with `mode: all` |
| Design Doc | `docs/ideas/strategy-architect-agent.md` | This file — problem statement, assumptions, scope, and future extensions |
