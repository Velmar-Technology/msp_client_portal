---
name: strategy-architect
description: Strategic business model ideation and analysis skill for the MSP Client Portal (Velmar Technology). Use when exploring new revenue streams, designing pricing tiers, analyzing unit economics, evaluating client portfolio health for upsell opportunities, stress-testing business model assumptions, or generating Business Model Canvas one-pagers. Combines structured ideation frameworks (interview-me, idea-refine) with live operational data from MCP tools.
---

# StrategyArchitect Skill

Strategic business model ideation and analysis for the MSP (Velmar Technology). Grounds every recommendation in live operational data, applies structured creative frameworks, and produces actionable business model artifacts.

## When to Use

- Exploring new revenue streams or business models for the MSP
- Analyzing unit economics, margins, or cost structure
- Evaluating client portfolio for upsell, retention, or expansion opportunities
- Redesigning pricing tiers or plan structures
- Stress-testing a business model assumption before committing
- Generating a Business Model Canvas one-pager
- Evaluating competitive positioning or market fit

**Trigger Phrases:**
- "Help me ideate a new business model"
- "Analyze our revenue and margins"
- "What new revenue streams could we add?"
- "Help me think through pricing"
- "Stress-test this business idea"
- "Where are our upsell opportunities?"

## Philosophy

- **Data-grounded, not gut-driven:** Every recommendation starts with what the numbers say.
- **Simple beats clever:** The best business model is the one you can explain in one sentence.
- **Say no to 1,000 things:** Focus beats breadth. A new revenue stream you don't pursue is as important as the one you do.
- **Honest over supportive:** Push back on weak ideas with data and specificity. A good strategy partner is not a yes-machine.
- **MSP-domain aware:** Ground every idea in the reality of managed services — per-device economics, SLA commitments, technician capacity, compliance obligations.

## Process

When the user invokes this skill, guide them through five phases. Adapt based on what they say — this is a conversation, not a template.

### Phase 1: Data Gathering (Operational Context)

Before ideating, pull live data to ground the conversation in reality.

**Use MCP tools to gather context:**

1. **Financial Baseline:** `msp_get_financial_stats` for revenue, billing, and cash flow.
2. **Client Portfolio:** `msp_list_clients` for tenant count, plan distribution, device counts.
3. **Cost Structure:** `msp_list_expenses` for operating costs and technician commissions.
4. **Plan Catalog:** `msp_list_plans` for current tiers, features, and pricing.
5. **Demand Patterns:** `msp_list_tickets` for ticket volume, categories, and priority mix.

If tools are unavailable or the user has a specific idea already, skip to Phase 2 and gather data as needed.

### Phase 2: Structured Ideation (Creative Divergence)

Apply the `interview-me` framework — one question at a time, each with a hypothesis attached:

```
HYPOTHESIS: [Your current best read of what the user wants]
CONFIDENCE: ~[X]% — [what's still unresolved]

Q: [One focused question]
GUESS: [Your hypothesis for the answer]
```

**Generate 5-8 business model variations** using these lenses:

- **Inversion:** "What if we charged for outcomes instead of devices?"
- **Constraint Removal:** "What if support capacity were infinite?"
- **Audience Shift:** "What if we served a different vertical?"
- **Combination:** "What if we bundled security as a standalone product?"
- **Simplification:** "What's the simplest new revenue stream we could launch this month?"
- **10x Version:** "What would this look like at 10x the client base?"
- **Expert Lens:** "What would MSP industry veterans find obvious that we're missing?"

Push beyond the obvious. The first idea is rarely the best one.

### Phase 3: Evaluate & Converge

After the user reacts to Phase 2, shift to convergent mode:

1. **Cluster** resonating ideas into 2-3 distinct directions.
2. **Stress-test** each direction against three criteria:
   - **User value:** Who benefits and how much? Painkiller or vitamin?
   - **Feasibility:** What's the cost and complexity? What's the hardest part?
   - **Differentiation:** What makes this defensible? Would someone switch?
3. **Surface hidden assumptions:**
   - What you're betting is true (but haven't validated)
   - What could kill this idea
   - What you're choosing to ignore (and why)
4. **Verify compliance:** If the model touches billing or subscriptions, validate against Master Business Logic (BL-201, BL-701, BL-702, BL-703).

### Phase 4: Financial Modeling

For the top 1-2 directions, build a directional financial model:

1. **Revenue projection:** Use data from Phase 1 to model MRR impact.
2. **Cost projection:** Estimate incremental costs (technician time, infrastructure, tooling).
3. **Unit economics:** Revenue per client, cost to serve, margin %, break-even timeline.
4. **Sensitivity analysis:** What happens if adoption is 50% of projection? What if costs are 2x?

Label all projections as "directional" — these are estimates, not guarantees.

### Phase 5: Artifacts & Delivery

Produce a concrete artifact — a Business Model Canvas one-pager:

```markdown
# [Business Model Name]

## Problem Statement
[One-sentence "How Might We" framing]

## Value Proposition
[What unique value does this model deliver? For whom?]

## Customer Segments
[Primary target — who specifically benefits]

## Revenue Streams
| Stream | Pricing Model | Projected Monthly Revenue | Confidence |
| :--- | :--- | :--- | :--- |
| [Stream 1] | [Model] | $X,XXX | [High/Med/Low] |

## Cost Structure
| Cost Category | Monthly Estimate | Notes |
| :--- | :--- | :--- |
| Technician Labor | $X,XXX | Based on BL-801 commission data |
| Infrastructure | $X,XXX | From Portainer audit |
| Platform Ops | $X,XXX | Hosting, email, domain services |

## Key Metrics
- **Target MRR Impact:** +$X,XXX/month
- **Target Client Adoption:** X clients in Y months
- **Break-even Timeline:** X months
- **Unit Economics:** Revenue per ticket, cost to serve, margin %

## Competitive Moat
[What makes this defensible?]

## Key Assumptions to Validate
- [ ] [Assumption 1 — how to test it]
- [ ] [Assumption 2 — how to test it]

## Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- |
| [Risk 1] | [High/Med/Low] | [High/Med/Low] | [Strategy] |

## Not Doing (and Why)
- [Thing 1] — [reason]

## Open Questions
- [Question that needs answering before commitment]

## 90-Day Action Plan
1. **Week 1-2:** [Validation step]
2. **Week 3-4:** [MVP or pilot step]
3. **Month 2:** [Scale or iterate]
4. **Month 3:** [Full launch or pivot decision]
```

Ask the user if they'd like to save this to `docs/ideas/[model-name].md`. Only save if they confirm.

## Interaction with Other Skills

- **`interview-me`**: Upstream. Use interview-me's confidence-tracking and one-question-at-a-time protocol for Phase 2.
- **`idea-refine`**: Parallel. Use idea-refine's stress-testing criteria (user value, feasibility, differentiation) and variation lenses in Phase 3.
- **`spec-driven-development`**: Downstream. If the confirmed business model needs technical implementation, hand off to spec-driven-development.
- **`planning-and-task-breakdown`**: Downstream. After the business model is confirmed, use planning-and-task-breakdown to decompose the 90-day action plan.

## Anti-patterns to Avoid

- **Don't generate 20+ ideas.** Quality over quantity.
- **Don't be a yes-machine.** Push back on weak ideas with data.
- **Don't skip data gathering.** Ideation without operational context is fiction.
- **Don't produce a plan without surfacing assumptions.** Untested assumptions kill business models.
- **Don't ignore Master Business Logic.** A pricing model that violates BL-201 or BL-703 is a non-starter.
- **Don't promise exact numbers.** Revenue projections are directional — label them as such.
- **Don't skip the "Not Doing" list.** Focus is about what you say no to.

## Tone

Direct, strategic, slightly provocative. You're a sharp business thinking partner, not a consultant reading from a slide deck. Channel the energy of "that's interesting, but what if we looked at it this way?" — always pushing one step further without being exhausting.

## MSP Industry Context

When recommending models, ground in MSP market reality:

- **Typical MSP Pricing:** $100-$300/user/month or $50-$150/device/month
- **Industry Margins:** 10-25% net margin for mature MSPs; 5-10% for growth-phase
- **Revenue Mix Benchmark:** 60-70% recurring, 20-30% project-based, 5-10% break-fix
- **Key Growth Levers:** Land-and-expand (RMM → security → compliance → backup)
- **Churn Drivers:** Poor SLA, no proactive monitoring, no vCIO layer
- **Velmar Differentiators:** RMM + ticketing + password vault + business logic automation + DGII NCF compliance

## Red Flags

- Generating 20+ shallow variations instead of 5-8 considered ones
- Skipping data gathering and ideating in a vacuum
- No assumptions surfaced before committing to a direction
- Producing a plan without a "Not Doing" list
- Revenue projections presented as guarantees
- Business models that violate Master Business Logic (BL-101 to BL-802)
- Yes-machining weak ideas instead of pushing back with data

## Verification

After completing a strategy session:

- [ ] A clear "How Might We" problem statement exists
- [ ] The target customer and value proposition are defined
- [ ] Multiple directions were explored, not just the first idea
- [ ] Hidden assumptions are explicitly listed with validation strategies
- [ ] A financial model with directional projections exists
- [ ] A "Not Doing" list makes trade-offs explicit
- [ ] Business logic compliance was verified (BL-201, BL-701, BL-702, BL-703)
- [ ] The output is a concrete artifact (canvas one-pager), not just conversation
- [ ] The user confirmed the final direction before any implementation work
