# event-schema

A portable, typed YAML format for declaring product analytics events — what events your app fires, what they carry, and what each one means. Codegen, validation, and agents read this file to understand your event schema without grepping source code.

This package contains:
- The format **specification** ([`SPEC.md`](SPEC.md)) — what an `event-schema.yaml` looks like.
- A **meta-schema** ([`meta-schema.json`](meta-schema.json)) — JSON Schema validating event schemas against the spec.
- The reference **CLI** — `validate` and `generate` commands.
- **Examples** ([`examples/`](examples/)) — input YAML + generated TypeScript for the minimal case, a typical SaaS surface, and an ecommerce surface with the money type.

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
version: "0.1"

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

Spec version `0.1`. The format is in active dogfood; the design may change before reaching `1.0`. The reference CLI implements the full spec.

This is the reference implementation. Other tools are encouraged to implement the spec — open an issue to be listed.

## License

MIT.
