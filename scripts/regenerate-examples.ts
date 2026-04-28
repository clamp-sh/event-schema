import { readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSchema } from "../src/load.js";
import { generateTypes } from "../src/codegen.js";

const here = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = resolve(here, "..", "examples");

const dirs = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let failures = 0;

for (const name of dirs) {
  const dir = resolve(EXAMPLES_DIR, name);
  const yamlPath = resolve(dir, "event-schema.yaml");
  const dtsPath = resolve(dir, "event-schema.d.ts");

  const { schema, errors } = loadSchema(yamlPath);
  if (errors.length) {
    console.error(`✗ ${name} — invalid event-schema.yaml:`);
    for (const err of errors) console.error(`    ${err}`);
    failures++;
    continue;
  }

  const ts = generateTypes(schema, { source: `examples/${name}/event-schema.yaml` });
  writeFileSync(dtsPath, ts);
  console.log(`✓ ${name}`);
}

if (failures > 0) process.exit(1);
