# event-schema

A portable, typed YAML format for declaring product analytics events — what events your app fires, what they carry, what each one means, which experiments they may be exposed to (since `0.2`), and what derived metrics they roll up into (since `0.3`). Codegen, validation, and agents read this file to understand your event schema without grepping source code.

This package contains:
- The format **specification** ([`SPEC.md`](SPEC.md)) — what an `event-schema.yaml` looks like.
- A **meta-schema** ([`meta-schema.json`](meta-schema.json)) — JSON Schema validating event schemas against the spec.
- The reference **CLI** — `validate` and `generate` commands.
- **Examples** ([`examples/`](examples/)) — input YAML + generated TypeScript for the minimal case, a typical SaaS surface, an ecommerce surface with the money type, a schema with experiments declared, and one with derived metrics.

## Install

```bash
# One-off
npx @clamp-sh/event-schema generate

# Or as a dev dependency
npm install --save-dev @clamp-sh/event-schema
npx event-schema generate
```

Auto-discovers `event-schema.yaml` from the current directory or any parent and writes the generated types alongside it. See [Commands](#commands) to point elsewhere.

## Quick example

`event-schema.yaml`:

```yaml
version: "0.2"

events:
  signup_completed:
    intent: |
      Primary conversion event — account creation succeeded.
    properties:
      plan:
        type: enum
        values: [free, pro, growth]
        required: true
      method:
        type: enum
        values: [email, github]
        required: true

  cta_click:
    intent: |
      Top-of-funnel engagement signal — which CTA earned the click.
    properties:
      location:
        type: string
        required: true
        examples: [hero_primary, nav_signup, final_cta]
      destination:
        type: string
        required: true
```

Generate types:

```bash
npx event-schema generate
```

Writes `event-schema.d.ts` next to the source.

Use them in your code:

```typescript
import { track } from "@clamp-sh/analytics";
import type { AnalyticsEvents } from "./event-schema";

track<AnalyticsEvents>("signup_completed", { plan: "pro", method: "email" });
//                       ^ event name + properties type-checked at compile time
```

Any analytics SDK that exposes a generic on its `track` function works the same way.

## Experiments

Since `0.2`, schemas can declare A/B tests in a top-level `experiments:` section. Codegen emits typed names and per-experiment variant unions so exposure-event tracking is type-checked the same way regular events are.

```yaml
experiments:
  pricing_redesign_2026:
    intent: |
      Long-form copy vs short-form with an embedded video on /pricing.
    variants: [control, long_copy, short_video]
    started: "2026-04-15"
```

Generated:

```typescript
export type ExperimentName = "pricing_redesign_2026"

export type Variant<E extends ExperimentName> = {
  pricing_redesign_2026: "control" | "long_copy" | "short_video"
}[E]
```

Wire those into whichever exposure-event shape your platform uses (`$exposure` on Amplitude, `$experiment_started` on Mixpanel, your own canonical event). The spec stays out of runtime concerns: assignment, randomization, holdouts, and result analysis are the experimentation platform's responsibility. See [`examples/experiments/`](examples/experiments/) for a complete schema with both events and experiments declared.

## Metrics

Since `0.3`, schemas can declare derived metrics in a top-level `metrics:` section — the *questions* you ask of the event stream, named once and shared across every consumer (codegen, agents, dashboards). Two types: `count` and `ratio`.

```yaml
metrics:
  daily_signups:
    type: count
    intent: New signups per day. Top-of-funnel volume.
    event: signup_completed
    grain: day

  weekly_signup_to_paid_cvr:
    type: ratio
    intent: % of weekly signups that converted to paid.
    grain: week
    numerator:   { event: subscription_started }
    denominator: { event: signup_completed }
```

Generated:

```typescript
export type MetricName = "daily_signups" | "weekly_signup_to_paid_cvr"

export type MetricSpec<M extends MetricName> = {
  daily_signups:             { type: "count"; grain: "day" }
  weekly_signup_to_paid_cvr: { type: "ratio"; grain: "week" }
}[M]
```

The spec defines the metric; how to compute it at query time is left to the consuming tool. Cohort-windowed metrics ("of users who fired X within 30 days, how many fired Y?") are deliberately out of `0.3` — they need user-journey logic that's a heavier addition. See [`examples/metrics/`](examples/metrics/) for a full schema with derived metrics.

## Commands

```
event-schema validate
event-schema generate
```

`validate` checks the schema against the spec's meta-schema. Exits non-zero on errors.

`generate` emits a TypeScript declaration. Writes `event-schema.d.ts` next to the source by default.

Both commands auto-discover `event-schema.yaml` (or `.json`) by walking up from the current directory. Pass an explicit path to override: `event-schema generate path/to/other.yaml`.

### Options for `generate`

| Flag | What it does | Default |
|---|---|---|
| `-o, --output <path>` | Write to a different path. Pass `-` to write to stdout. | `event-schema.d.ts` next to the source |
| `--type-name <name>` | Name of the exported events type | `AnalyticsEvents` |

## Why a spec?

Most product analytics tools treat event schema as tribal knowledge. Property names live in code comments, internal wikis, or Slack threads. AI agents asking "what does `cta_click` carry?" have to grep your codebase. Renames mean manual sweeps across hundreds of call sites.

A declarative event-schema file fixes all three:

- **Discoverable** — agents and humans read the file instead of grepping.
- **Refactor-safe** — rename a property in one place, regenerate types, TypeScript surfaces every broken call site.
- **Durable** — explanations of why each event exists survive past the conversation that produced them.

## Status

Spec version `0.3`. The format is in active dogfood; the design may change before reaching `1.0`. The reference CLI implements the full spec.

This is the reference implementation. Other tools are encouraged to implement the spec — open an issue to be listed.

## License

MIT.
