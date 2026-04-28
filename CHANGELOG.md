# @clamp-sh/event-schema

## 0.2.0

### Minor Changes

- [`caa5258`](https://github.com/clamp-sh/clamp/commit/caa5258b50ece968f7dca6b6924cb8f2e5626096) Thanks [@sbj-o](https://github.com/sbj-o)! - Add experiments to the spec (v0.2). Declare A/B tests by name with a list of variants in a top-level `experiments:` section; codegen emits `ExperimentName` and `Variant<E>` types so exposure-event tracking can be type-checked the same way regular events are. Existing v0.1 schemas remain valid.
