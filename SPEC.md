# Event Schema

A declarative, typed schema for product analytics events. Lives in `event-schema.yaml` at your project root. Codegen, validation, and agents read this file to understand what events your app fires and what each carries.

This document defines spec version **0.2**. Versioning rules are in [§9](#9-versioning).

## 1. Goals

- **Discoverability.** Make event property names knowable without grepping source code. An agent should be able to ask "what does `cta_click` carry?" and get an answer from the schema, not from `git grep track\(`.
- **Refactor safety.** Make renaming a property a one-line change in YAML with mechanical downstream updates via codegen — TypeScript surfaces every broken callsite at build time.
- **Durable context.** Give agents and developers semantic context for what events mean, not just what shape they have. The `intent` field is what makes the difference between "an event" and "an event you can reason about".
- **Drift prevention.** Make docs, code, and agent advice converge on the same canonical declaration. The schema is the contract.

## 2. Non-goals

The spec stays deliberately narrow. It does not define:

- **Provenance fields.** No `fires_from` or similar. Where in source code an event fires is a runtime concern — some runtimes (browser JS) can capture it cheaply, others (mobile, server-side, dynamic event names) can't portably. Implementations may attach origin metadata at runtime; the spec leaves that to them.
- **Validation or ingest behavior.** When an event arrives that doesn't match the declared schema, what happens is up to the implementation — reject, annotate, warn, log, or ignore. The spec describes the schema; runtime enforcement is a tool decision.

## 3. File location and format

A project SHOULD have one event schema file at `event-schema.yaml` in the project root. YAML is canonical because of comment support; JSON variants (`event-schema.json`) MAY be used and are equivalent.

Implementations MUST accept either extension. When both are present, behavior is undefined — repositories should commit to one.

When a schema file is present, it is canonical for the structure it declares. Implementations MAY layer additional concerns (validation, sync to a service, codegen, GUI tools, drift detection at ingest), but the file format defined in §4–§7 is the contract.

## 4. Top-level shape

```yaml
version: 0.2
events:
  ...
experiments:    # optional, added in 0.2
  ...
```

| Field | Required | Type | Description |
|---|---|---|---|
| `version` | Yes | string | Spec version this schema conforms to. Currently `0.2`. |
| `events` | Yes | object | Map of event name → event entry. Event names MUST match `^[a-z][a-z0-9_]*$` (snake_case ASCII). |
| `experiments` | No | object | Map of experiment name → experiment entry. See [§8](#8-experiments). Added in 0.2. |

Top-level fields prefixed with `x-` are reserved for tool-specific extensions and MUST be ignored by implementations that don't recognize them. See [§10](#10-extension-fields).

## 5. Event entry shape

```yaml
events:
  cta_click:
    intent: |
      Top-of-funnel engagement signal — which CTA earned the click.
    properties:
      location:
        type: string
        required: true
```

| Field | Required | Type | Description |
|---|---|---|---|
| `intent` | Recommended | string | One sentence (or short paragraph) on why this event exists. Used by agents and humans to reason about it. Multi-line YAML strings are fine. |
| `properties` | Yes | object | Map of property name → property entry. May be `{}` if the event carries no custom properties. Property names MUST match `^[a-z][a-z0-9_]*$`. |

## 6. Property entry shape

```yaml
location:
  type: string
  required: true
  description: Where on the page the CTA lives.
  examples: [hero_primary, nav_signup, final_cta_secondary]
```

| Field | Required | Type | Description |
|---|---|---|---|
| `type` | Yes | string | One of: `string`, `number`, `boolean`, `enum`, `money`. See [§7](#7-type-system). |
| `required` | No | boolean | Defaults to `false`. If `true`, the property MUST be present on every event of this type. |
| `description` | No | string | Human-readable description of what the property carries. |
| `examples` | No | array | Sample values, useful for agents to know what's typical. Ignored at validation time. |
| `values` | Required if `type=enum` | array of strings | Allowed values when type is enum. |

## 7. Type system

| Type | Value shape |
|---|---|
| `string` | UTF-8 string. |
| `number` | Numeric value (integer or float). |
| `boolean` | `true` or `false`. |
| `enum` | One of the values listed in the property's `values` array. Implementations SHOULD treat enums as discriminated string types in generated code. |
| `money` | An object: `{ amount: number, currency: string }` where `currency` is an ISO 4217 code. Borrowed from common analytics-tool conventions for revenue aggregation. |

The type system is deliberately small. Resist the temptation to add `oneOf`, `allOf`, regex patterns, conditional schemas, etc. — those are JSON Schema's job. If a property genuinely needs richer typing, declare it as `string` and link to a JSON Schema in an `x-json-schema` extension field.

## 8. Experiments

Optional. Declares A/B tests / experiments by name and lists their valid variants, so exposure-event tracking can be type-checked the same way regular events are.

```yaml
experiments:
  pricing_redesign_2026:
    intent: |
      A/B test on the /pricing hero — long-form copy vs short-form
      with a video.
    variants: [control, long_copy, short_video]
    started: "2026-04-15"
```

| Field | Required | Type | Description |
|---|---|---|---|
| `intent` | Recommended | string | One sentence on what's being tested. Same role as event `intent`. |
| `variants` | Yes | array of strings | Variant names. MUST include exactly one named `control` plus at least one treatment. Each name MUST match `^[a-z][a-z0-9_]*$`. |
| `started` | No | string (ISO date) | Date the experiment went live. |
| `ended` | No | string (ISO date) | Date the experiment was archived. Codegen still emits its types — historical exposure events still reference it. |

The spec stays out of runtime concerns: assignment, randomization, exposure ingestion, holdouts, and result analysis are the experimentation platform's responsibility. Implementations SHOULD generate type-safe references to experiment names and per-experiment variant unions; how those types get wired into a specific platform's exposure event (Amplitude's `$exposure`, Mixpanel's `$experiment_started`, in-house equivalents) is left to the user.

## 9. Versioning

Spec versioning follows semver-flavored conventions. The `version` field in a schema declares the *spec version* it conforms to, not the schema's own version (history is git's job).

- **Patch (`0.1.0` → `0.1.1`):** clarifications, documentation updates, additional examples. No format changes.
- **Minor (`0.1` → `0.2`):** additive — new optional fields. Existing schemas remain valid against the new version.
- **Major (`0.x` → `1.0`):** breaking changes. Implementations MUST refuse to load schemas declaring an unsupported major version.

Implementations SHOULD declare the spec versions they support and SHOULD warn when loading a schema declaring a newer minor version than they recognize.

## 10. Extension fields

Any field name starting with `x-` is reserved for tool-specific extensions. Implementations MUST ignore unknown extension fields rather than failing to load.

This lets implementations layer features without breaking portability:

```yaml
events:
  checkout_completed:
    intent: ...
    x-clamp-stripe-event: invoice.paid     # ignored by other tools
    properties:
      ...
```

Recommended namespace conventions:
- `x-clamp-*` — Clamp-specific extensions.
- `x-vendor-*` — replace `vendor` with the implementing tool's name.
- `x-` (bare prefix, organization-local) — for in-house extensions.

## 11. Implementations

This document is the canonical spec. The reference CLI ([`@clamp-sh/event-schema`](https://github.com/clamp-sh/event-schema)) implements `validate` and `generate` against this spec.

See [`examples/`](examples/) for canonical schemas covering the minimal case, a typical SaaS surface, and an ecommerce surface with the money type. Each folder contains the input YAML and the TypeScript output the reference CLI produces — useful for confirming an alternate implementation matches the reference.

Other tool authors are welcome to implement the spec; please open an issue on the spec repo to be listed here.
