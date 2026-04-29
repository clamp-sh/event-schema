#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { findSchemaFile, loadSchema } from "./load.js";
import { generateTypes } from "./codegen.js";

const USAGE = `event-schema — reference CLI for the Event Schema spec

Usage:
  event-schema validate [file]
  event-schema generate [file]

Commands:
  validate    Validate the schema against the spec's meta-schema. Exits non-zero on errors.
  generate    Emit a TypeScript .d.ts from the schema. Writes a file alongside the source by default.

If [file] is omitted, walks up from the current directory looking for an
event-schema.yaml or event-schema.json, similar to how git locates .git.

Options for generate:
  -o, --output <path>     Override the output path. Pass "-" to write to stdout.
  --type-name <name>      Name of the exported events type. Defaults to "AnalyticsEvents".
`;

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function parseArgs(args: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      flags.output = args[++i] ?? "";
    } else if (arg === "--type-name") {
      flags.typeName = args[++i] ?? "";
    } else if (arg.startsWith("--")) {
      fail(`unknown flag: ${arg}\n\n${USAGE}`);
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function resolveSource(srcArg: string | undefined): { filePath: string; displaySource: string } {
  if (srcArg) {
    return { filePath: resolve(srcArg), displaySource: srcArg };
  }
  const found = findSchemaFile();
  return { filePath: found, displaySource: relative(process.cwd(), found) || "event-schema.yaml" };
}

function runValidate(srcArg: string | undefined) {
  const { filePath } = resolveSource(srcArg);
  const { errors } = loadSchema(filePath);
  if (errors.length === 0) {
    console.log(`OK — ${filePath} conforms to the spec`);
    return;
  }
  console.error(`${filePath} has ${errors.length} validation error(s):`);
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

function runGenerateTypes(srcArg: string | undefined, output: string | undefined, typeName: string | undefined) {
  const { filePath, displaySource } = resolveSource(srcArg);
  const { schema, errors } = loadSchema(filePath);
  if (errors.length > 0) {
    console.error(`${filePath} is invalid; fix validation errors before generating:`);
    for (const err of errors) console.error(`  ${err}`);
    process.exit(1);
  }
  const ts = generateTypes(schema, { typeName, source: displaySource });
  if (output === "-") {
    process.stdout.write(ts);
    return;
  }
  const outPath = output ? resolve(output) : resolve(filePath, "..", "event-schema.d.ts");
  writeFileSync(outPath, ts);
  console.log(`Wrote ${outPath}`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    console.log(USAGE);
    return;
  }

  const command = argv[0];
  const { positional, flags } = parseArgs(argv.slice(1));

  if (command === "validate") {
    try {
      runValidate(positional[0]);
    } catch (err) {
      fail((err as Error).message);
    }
    return;
  }

  if (command === "generate") {
    try {
      runGenerateTypes(positional[0], flags.output, flags.typeName);
    } catch (err) {
      fail((err as Error).message);
    }
    return;
  }

  fail(`unknown command: ${command}\n\n${USAGE}`);
}

main();
