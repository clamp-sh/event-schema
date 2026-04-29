# @clamp-sh/event-schema

## 0.3.0

### Minor Changes

- [`1763b4a`](https://github.com/clamp-sh/clamp/commit/1763b4a7e61380958ee69569284fe75cc57987e4) Thanks [@sbj-o](https://github.com/sbj-o)! - Add derived metrics to the spec (v0.3). New top-level `metrics:` section declares named counts and ratios over the event stream — questions you ask of your analytics, declared once so codegen, agents, and consuming tools share the same definition. Two metric types: `count` (single event with optional property filter) and `ratio` (numerator / denominator over the same period). Codegen emits `MetricName` and `MetricSpec<M>` types. Cohort-windowed metrics deliberately out of scope for `0.3`.

## 0.2.0

### Minor Changes

- [`caa5258`](https://github.com/clamp-sh/clamp/commit/caa5258b50ece968f7dca6b6924cb8f2e5626096) Thanks [@sbj-o](https://github.com/sbj-o)! - Add experiments to the spec (v0.2). Declare A/B tests by name with a list of variants in a top-level `experiments:` section; codegen emits `ExperimentName` and `Variant<E>` types so exposure-event tracking can be type-checked the same way regular events are. Existing v0.1 schemas remain valid.
