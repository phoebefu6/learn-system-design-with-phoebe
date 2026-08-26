# learn-system-design-with-phoebe

**Eight sessions, 45 minutes each, one platform you architect the whole way through.**

Live: https://phoebefu6.github.io/learn-system-design-with-phoebe/

Every other course on the shelf teaches you to build a thing. This one teaches you to decide
which thing, on evidence, under a budget, in front of people who will have to live with the
answer. The running project is **Daybreak**, the coffee-subscription brand from
`learn-sql-with-phoebe` and `learn-data-warehouse-with-phoebe`: three years old, one Postgres,
dashboards querying production.

## What this course is not

| If your question is | Go here |
|---|---|
| What layers does a data platform have, and what do they cost? | `learn-ai-infra-with-phoebe` |
| How do I build the ingestion-to-serving pipeline? | `learn-data-engineering-with-phoebe` |
| How do I test, deploy and operate it? | `learn-dataops-with-phoebe` |
| What should the schema look like? | `learn-data-modeling-with-phoebe` |
| **Which of these do I choose, and how do I defend it?** | **here** |

## Sessions

1. Requirements to constraints
2. Boundaries and contracts
3. Storage and serving
4. Orchestration topology
5. **Designing for failure** - the tradeoff board simulator
6. The governed shell
7. AI as a system component
8. The design review - ADRs and the capstone

## The tradeoff board

`assets/sysdesign-live.js` puts nine architecture levers against four meters - p95 latency,
monthly cost, data freshness and blast radius - under two requirement profiles. The teaching
move: the full design-lever set scores 4/4 on a morning dashboard and 3/4 on minute-level
alerting, with no lever changed. There is no best architecture, only one that is correct for a
requirement.

Every constant is written down in `materials/official-course-map.md`. It is a teaching model,
not a benchmark, and the board says so on its own footer.

## Structure

```
index.html                        landing, mindmap, paths
courses/01..08-*.html             the eight sessions
assets/style.css                  editorial-bold, blueprint navy + drafting amber
assets/app.js                     accordions, quizzes, passport, widget kit
assets/mindmap.js                 radial knowledge map
assets/sysdesign-live.js          the tradeoff board
materials/official-course-map.md  source map, coverage tables, every simulator constant
materials/widget-kit.md           markup contracts for the interactive components
```

Static HTML, no build step. Serve any way you like:

```bash
python3 -m http.server 8000
```

by Phoebe Fu · part of [Learn with Phoebe](https://phoebefu6.github.io/learn-with-phoebe/)
