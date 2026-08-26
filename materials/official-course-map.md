# Official course map - learn-system-design-with-phoebe

Eight sessions, 45 minutes each, one running project: **architect the Daybreak platform**.
Daybreak is the coffee-subscription brand from `learn-sql-with-phoebe`, `learn-data-warehouse-with-phoebe`
and `learn-data-engineering-with-phoebe`. In those courses you built pieces of its stack. In this one
you decide what the pieces should have been, and you defend the decision.

Written and verified 2026-08-26. Re-check the DORA and data-contract links before delivering, both
move yearly.

---

## What this course is NOT, and where that material lives

This is the single most important table on this page, because the sibling courses genuinely
overlap in vocabulary and not at all in job.

| If the question is | The course is | Not this one, because |
|---|---|---|
| "What layers does a data platform have, and who pays for them?" | `learn-ai-infra-with-phoebe` | That is an inventory and an investment case. This is a decision method. |
| "How do I actually build the ingestion-to-serving pipeline?" | `learn-data-engineering-with-phoebe` | That is construction. This is what to construct and why. |
| "How do I test, deploy and operate it once it exists?" | `learn-dataops-with-phoebe` | That is CI/CD and MLOps. This stops at the design review. |
| "What should the schema look like?" | `learn-data-modeling-with-phoebe` | Table design is one decision inside session 3, not the course. |
| "How do I know the model is any good?" | `learn-model-evaluation-with-phoebe` | Session 7 treats evals as an infrastructure component, not a metric course. |
| **"Which of these do I choose, and how do I defend it to people who will have to live with it?"** | **this course** | |

The one-line version for the landing page: *ai-infra is what the layers are, data-engineering is
how to build the pipe, dataops is how to run it, this is how to **choose**.*

---

## Session coverage

Legend: ✓ taught in full · ◐ touched, with the depth pointed elsewhere

### Session 1 - Requirements to constraints
| Source | | Covered |
|---|---|---|
| Non-functional requirements as the actual input to design | ✓ | latency, freshness, cost, correctness, blast radius, and who is on the hook at 04:00 |
| Back-of-envelope capacity and cost estimation | ✓ | rows per day, bytes per row, queries per minute, dollars per month - done on paper before any tool is named |
| Little's Law as the sanity check | ✓ | L = λW, used to catch a queue design that cannot possibly hold its throughput |
| The one-page design doc | ✓ | problem, constraints, options, decision, consequences. The artifact the whole course builds toward |
| Google SRE: SLI, SLO, error budgets | ◐ | used as the vocabulary for "how good is good enough". Full treatment stays with the SRE book |

### Session 2 - Boundaries and contracts
| Source | | Covered |
|---|---|---|
| Coupling and cohesion applied to data, not just code | ✓ | the three couplings that actually hurt: schema, semantic, and operational |
| Data contracts, and what belongs in one | ✓ | schema, semantics, ownership, quality expectations, and a breaking-change notice period |
| Contract enforcement in CI | ✓ | the producer's build fails, not the consumer's dashboard. Industry guidance is a compatibility test that simulates consumer behaviour before deploy |
| Breaking-change notice periods | ✓ | common published guidance is at least 90 days for consumers with long release cycles |
| Schema evolution: additive, widening, and the ones that break | ✓ | add-nullable is safe, rename is not, int-to-string is not, and "we will just backfill" is a promise nobody keeps |
| Data Mesh four principles (Dehghani) | ◐ | domain ownership and data-as-a-product are used as the ownership argument. The full mesh treatment stays with the book |

### Session 3 - Storage and serving
| Source | | Covered |
|---|---|---|
| OLTP vs OLAP vs lake vs lakehouse, decided by access pattern | ✓ | row store for point writes, column store for wide scans, and why the answer is usually both |
| Batch, micro-batch and streaming as a freshness-cost curve | ✓ | the curve is the lesson. Streaming is not more advanced, it is more expensive and fresher |
| Replicas, materialized aggregates and the read path | ✓ | the two cheapest latency levers on the simulator, and the two people skip |
| CAP, and PACELC as the version that survives contact with reality | ✓ | Brewer's CAP, extended by Abadi: even with no partition, you trade latency against consistency |
| The Tail at Scale (Dean and Barroso, CACM 2013) | ✓ | why p50 lies and one slow component dominates a fan-out. Design to p95 and p99, never to the mean |
| Physical modeling, partitioning, file formats | ◐ | shown as a decision with consequences. The hands-on build is `learn-data-warehouse-with-phoebe` |

### Session 4 - Orchestration topology
| Source | | Covered |
|---|---|---|
| Cron vs a dependency-aware orchestrator | ✓ | cron knows what time it is, an orchestrator knows what finished. The whole session hangs on that sentence |
| Idempotency as a design property, not a coding trick | ✓ | why a retry that is not idempotent is a data corruption feature |
| Backfills, late-arriving data and the reprocessing window | ✓ | designing so that "run last Tuesday again" is boring |
| Task-centric vs asset-centric orchestration | ✓ | Airflow's DAG-of-tasks model against Dagster's DAG-of-assets model, and what each makes easy |
| SLAs on data, not just services | ✓ | "the 07:00 dashboard is correct by 07:00" is an SLA and it can be missed silently |
| Airflow / Dagster product specifics | ◐ | the vendor docs own the click-through. This session owns the choice between the two shapes |

### Session 5 - Designing for failure · **the simulator lands here**
| Source | | Covered |
|---|---|---|
| Blast radius as a first-class design meter | ✓ | measured in downstream assets, not in feelings |
| Retries, dead-letter queues, circuit breakers, bulkheads | ✓ | each one names the failure class it handles, and the ones it does not |
| The transient / permanent distinction | ✓ | the sharpest single idea in the session: retries fix timeouts and do nothing for a rename |
| Staleness contracts and silent failure | ✓ | a job that reports success and wrote nothing is the failure mode that costs the most |
| DORA four keys, and change failure rate | ✓ | deployment frequency, lead time, change failure rate, failed-deployment recovery time. Elite change failure rate sits near 5 percent. The 2025 report replaced the four performance tiers with seven team profiles |
| Chaos engineering | ◐ | named as the practice that tests the design. Running it is out of scope |

### Session 6 - The governed shell
| Source | | Covered |
|---|---|---|
| Access control as an architecture decision | ✓ | row, column and purpose-based access designed at the boundary, not bolted on |
| Lineage as a design output | ✓ | if you cannot answer "what breaks if I change this", you do not have an architecture, you have a pile |
| PII boundaries, minimization and the copy problem | ✓ | every copy is a new obligation. The design question is how few copies you can get away with |
| Audit, retention and deletion by design | ✓ | deletion has to be designed in, because a lake makes it nearly impossible to retrofit |
| Cost attribution and the unowned-spend failure | ✓ | a platform nobody is billed for is a platform nobody prunes |
| PDPA / GDPR specifics | ◐ | the obligations are stated, not taught. Full treatment: `learn-pdpa-dnc-with-phoebe`, `learn-gdpr-with-phoebe`, `learn-data-governance-with-phoebe` |

### Session 7 - AI as a system component
| Source | | Covered |
|---|---|---|
| Hidden technical debt in ML systems (Sculley et al., NeurIPS 2015) | ✓ | the model box is the small one. Everything around it is the system, and this diagram is why this session exists |
| Model serving as just another latency and cost budget | ✓ | a call that takes 900 ms and costs a cent is a design constraint like any other |
| Retrieval as an index, with a freshness and blast-radius profile of its own | ✓ | a vector index is a derived asset. It goes stale, it breaks, and nobody monitors it |
| Agent loops as unbounded components | ✓ | non-deterministic latency, non-deterministic cost, and a retry story that must be designed |
| Evals and guardrails as infrastructure | ✓ | a gate on the path, with an owner and an SLA, not a notebook someone ran once |
| DORA 2025 on AI adoption | ✓ | AI adoption is associated with higher throughput and higher delivery instability at the same time; epics completed per developer up 66.2 percent. Value comes from the surrounding practices, not the tool |
| Model quality metrics, RAG construction, agent frameworks | ◐ | `learn-model-evaluation-with-phoebe`, `learn-rag-with-phoebe`, `learn-ai-agents-with-phoebe` |

### Session 8 - The design review
| Source | | Covered |
|---|---|---|
| Architecture Decision Records | ✓ | status, context, decision, consequences. One page, immutable, superseded rather than edited |
| Writing the design doc so it survives the room | ✓ | options you actually considered, the one you rejected and why, and the consequence you are choosing to accept |
| Running and surviving a design review | ✓ | the four questions a good reviewer asks, and how to answer "what happens when this fails" without bluffing |
| Reversibility as the deciding factor | ✓ | one-way and two-way doors, and why the reversible option deserves less argument, not more |
| Capstone: review a deliberately flawed Daybreak architecture | ✓ | find the five defects, write the ADR set, present the trade you are choosing |

---

## The simulator: `assets/sysdesign-live.js`

Four meters over one architecture, under two requirement profiles. Everything below is the
model's own arithmetic, verified in the browser on 2026-08-26. **These are the numbers the
session pages quote.** If the model changes, re-run and re-quote.

**Baseline (Daybreak on day one - one Postgres, cron, dashboards querying production):**
p95 9,400 ms · $1,180/mo · 5 min old · 82 percent blast radius.

Note the baseline has the *best* freshness in the model. It is production. That is not a bug,
it is the point: the naive architecture is the freshest thing you will ever have, and every
good decision after this makes freshness worse in exchange for something else.

**The ladder (each row adds one lever to the row above):**

| Lever added | p95 | Cost | Freshness | Blast | Daily | Live |
|---|---|---|---|---|---|---|
| day one | 9,400 ms | $1,180 | 5 min | 82% | 2/4 | 2/4 |
| + read replica | 5,170 ms | $1,440 | 7 min | 76% | 2/4 | 1/4 |
| + columnar warehouse, nightly | 1,551 ms | $1,860 | 1,440 min | 62% | 2/4 | 1/4 |
| + incremental micro-batch | 1,551 ms | $2,040 | 18 min | 62% | 3/4 | 1/4 |
| + pre-aggregated marts | 543 ms | $2,180 | 24 min | 62% | 3/4 | 2/4 |
| + data contracts in CI | 543 ms | $2,240 | 24 min | 28% | 3/4 | 2/4 |
| + retries, DLQ, idempotency | 543 ms | $2,330 | 27 min | 16% | 4/4 | 3/4 |
| + orchestrator with SLAs | 543 ms | $2,480 | 23 min | 4% | **4/4** | 3/4 |
| + stream the whole path | 489 ms | $3,380 | 1 min | 12% | 3/4 | **4/4** |
| all levers + buy a bigger box | 445 ms | $3,460 | 23 min | 4% | 3/4 | 3/4 |

**Budgets.** Morning dashboard: p95 under 2,000 ms, cost under $2,800/mo, data under 12 hours
old, blast under 20 percent. Minute alerting: p95 under 800 ms, cost under $3,500/mo, data under
5 minutes old, blast under 20 percent.

**The two teaching moves this simulator exists for:**

1. **The profile flip.** The full design-lever set scores 4/4 on the morning dashboard and 3/4
   on alerting. Switching streaming on flips it: 3/4 daily, 4/4 live. Nothing about the
   architecture is better or worse. The requirement changed. This is why "what is the best
   architecture" has no answer and why every design review starts with the requirement.
2. **The honest trap.** "Just buy a bigger box" costs $980 a month for 98 ms of p95 and moves no
   other meter. Marts cost $140 and take 1,008 ms off. The trap is not a scold - it is honest
   arithmetic that happens to be embarrassing.

**The failure drill** (`Ship a schema change upstream`) is gated on the *contracts* lever, never
on the fixing lever itself, so the catch is visible rather than the failure just disappearing:

| State | Result |
|---|---|
| contracts on | CI blocked it. 0 of 42 assets broke, and the producer's build went red |
| contracts off, cron only | 34 of 42 broke. Cron reported success. Dashboard served 27-hour-old numbers |
| contracts off, orchestrator + retries + incremental | 17 of 42 broke, 46 min stale, and the retries failed five identical times |

That last row is the sharpest line in the course: **retries do not fix a contract break.**

---

## Verified external anchors

- **DORA, State of DevOps 2025.** AI adoption is associated with higher software delivery
  throughput *and* higher delivery instability; epics completed per developer up 66.2 percent;
  the report replaced the four performance tiers with seven team profiles. Value is attributed to
  surrounding practices rather than the tools.
  https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report ·
  https://dora.dev/insights/balancing-ai-tensions/
- **DORA four keys.** Deployment frequency, lead time for changes, change failure rate, failed
  deployment recovery time. Elite change failure rate near 5 percent.
  https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance
- **Data contracts.** Published guidance: at least 90 days notice for breaking changes, and CI
  compatibility tests that simulate consumer behaviour before deploy.
  https://dlthub.com/blog/schema-evolution-guide
- **Architecture Decision Records.** Status, context, decision, consequences; superseded rather
  than edited. https://adr.github.io/ ·
  https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record
- **Hidden Technical Debt in Machine Learning Systems**, Sculley et al., NeurIPS 2015. The ML code
  box is a small fraction of a real ML system.
- **The Tail at Scale**, Dean and Barroso, CACM 2013. Fan-out means the slowest component sets the
  user-visible latency.
- **PACELC**, Abadi 2012, extending Brewer's CAP: even with no partition, you trade latency
  against consistency.
- **Designing Data-Intensive Applications**, Kleppmann. The background text for sessions 2-5.
- **Site Reliability Engineering**, Google. SLI, SLO and error budgets, used here as vocabulary.
- **Data Mesh**, Dehghani. Domain ownership and data-as-a-product, used as the ownership argument
  in session 2.

Certificates, videos and graded assessments stay with the official providers. This course teaches
the working content and says plainly where it stops.
