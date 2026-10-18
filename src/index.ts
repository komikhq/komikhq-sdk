import { TARGETS, DEFAULT_SPEC_URL, type TargetKey } from "./config/index.ts";
import { runGenerator, type RunOptions } from "./core/runner.ts";

const rawArgs = process.argv.slice(2);

function printHelp(): void {
  console.log(`
KomikHQ Multi-Language SDK Generator CLI
=========================================
Usage:
  pnpm generate [target] [options]
  or:
  tsx src/index.ts [target] [options]

Available Targets:
  all           Generate all configured SDKs (typescript, php)
  typescript    TypeScript Fetch SDK -> out/typescript (@komikhq/komikhq-typescript)
  php           PHP SDK -> out/php (komikhq/komikhq-php)

Options:
  --spec <url>  OpenAPI JSON specification URL or local file path
                Default: ${DEFAULT_SPEC_URL}
  --out <dir>   Custom output directory
  -h, --help    Show this help message

Examples:
  pnpm generate typescript
  pnpm generate php
  pnpm generate all
  pnpm generate all --spec https://api.komikhq.com/openapi.json
  pnpm generate typescript --out ../komikhq-typescript
`);
}

function parseCliArgs(args: string[]): { targetArg?: string; options: RunOptions } {
  let targetArg: string | undefined;
  const options: RunOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--spec" && args[i + 1]) {
      options.specUrl = args[++i];
    } else if (arg === "--out" && args[i + 1]) {
      options.outputDir = args[++i];
    } else if (!targetArg && !arg.startsWith("-")) {
      targetArg = arg;
    } else if (!options.specUrl && !arg.startsWith("-")) {
      options.specUrl = arg;
    }
  }

  return { targetArg, options };
}

async function main(): Promise<void> {
  const { targetArg, options } = parseCliArgs(rawArgs);

  if (!targetArg) {
    printHelp();
    return;
  }

  if (targetArg === "all") {
    const targetKeys = Object.keys(TARGETS) as TargetKey[];
    console.log(`>> Generating all SDK targets...`);
    for (const key of targetKeys) {
      await runGenerator(key, options);
    }
    console.log(`\n🎉 All SDK targets generated successfully!`);
    return;
  }

  if (!(targetArg in TARGETS)) {
    console.error(`[Error] Invalid target: "${targetArg}".`);
    printHelp();
    process.exit(1);
  }

  await runGenerator(targetArg as TargetKey, options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
