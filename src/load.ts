import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const META_SCHEMA_PATH = resolve(here, "..", "meta-schema.json");

const SCHEMA_FILENAMES = ["event-schema.yaml", "event-schema.json"];

/**
 * Walk up from `cwd` until an `event-schema.yaml` or `event-schema.json` is
 * found. Throws with a helpful message if none exists.
 */
export function findSchemaFile(cwd: string = process.cwd()): string {
  let dir = cwd;
  while (true) {
    for (const filename of SCHEMA_FILENAMES) {
      const candidate = resolve(dir, filename);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "No event-schema.yaml (or .json) found in the current directory or any parent. " +
          "Pass a path explicitly, e.g. `event-schema validate path/to/event-schema.yaml`.",
      );
    }
    dir = parent;
  }
}

export type PropertyType = "string" | "number" | "boolean" | "enum" | "money";

export interface PropertyEntry {
  type: PropertyType;
  required?: boolean;
  description?: string;
  examples?: unknown[];
  values?: string[];
}

export interface EventEntry {
  intent?: string;
  properties: Record<string, PropertyEntry>;
}

export interface EventSchema {
  version: string;
  events: Record<string, EventEntry>;
}

export interface LoadResult {
  schema: EventSchema;
  errors: string[];
}

/** Returns an empty `schema` plus a fatal entry in `errors` when the file can't be parsed. */
export function loadSchema(filePath: string): LoadResult {
  const raw = readFileSync(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    return {
      schema: { version: "0", events: {} },
      errors: [`failed to parse ${filePath}: ${(err as Error).message}`],
    };
  }

  const metaSchema = JSON.parse(readFileSync(META_SCHEMA_PATH, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(metaSchema);
  const ok = validate(parsed);

  const errors = ok
    ? []
    : (validate.errors ?? []).map(
        (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
      );

  return { schema: parsed as EventSchema, errors };
}
