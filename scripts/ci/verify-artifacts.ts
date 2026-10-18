#!/usr/bin/env tsx

/**
 * Downstream Artifacts Verification Script
 *
 * Verifies that all essential files, templates, and configurations
 * are properly generated in the output directory before release.
 *
 * Usage:
 *   pnpm verify:artifacts <typescript|php>
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface CheckRule {
  path: string;
  description: string;
  isDirectory?: boolean;
}

const TARGET_RULES: Record<string, CheckRule[]> = {
  typescript: [
    { path: 'package.json', description: 'NPM package configuration' },
    { path: 'tsconfig.json', description: 'TypeScript compiler configuration' },
    { path: 'tsconfig.esm.json', description: 'ESM TypeScript compiler configuration' },
    { path: '.npmignore', description: 'NPM publish ignore rules' },
    { path: '.gitattributes', description: 'Git export-ignore attributes' },
    { path: '.gitignore', description: 'Git ignore rules' },
    { path: '.github/workflows/publish-npm.yml', description: 'NPM Trusted Publisher workflow' },
    { path: 'README.md', description: 'SDK documentation' },
    { path: 'src', description: 'TypeScript source directory', isDirectory: true },
    { path: 'src/index.ts', description: 'Main SDK barrel entrypoint' },
    { path: 'src/runtime.ts', description: 'HTTP fetch runtime engine' },
    { path: 'src/apis', description: 'API client classes directory', isDirectory: true },
    { path: 'src/models', description: 'Data models directory', isDirectory: true },
  ],
  php: [
    { path: 'composer.json', description: 'Composer package configuration' },
    { path: '.gitattributes', description: 'Composer archive export-ignore rules' },
    { path: '.gitignore', description: 'Git ignore rules' },
    { path: 'README.md', description: 'SDK documentation' },
    { path: 'phpunit.xml.dist', description: 'PHPUnit test configuration' },
    { path: 'lib', description: 'PHP source directory', isDirectory: true },
    { path: 'lib/Configuration.php', description: 'Client configuration class' },
    { path: 'lib/ApiException.php', description: 'API Exception wrapper' },
    { path: 'lib/ObjectSerializer.php', description: 'Object serialization helper' },
    { path: 'lib/Api', description: 'API controllers directory', isDirectory: true },
    { path: 'lib/Model', description: 'Models and DTOs directory', isDirectory: true },
    { path: 'test', description: 'Unit test suite directory', isDirectory: true },
  ],
};

async function main() {
  const target = process.argv[2];

  if (!target || !TARGET_RULES[target]) {
    console.error(`❌ Missing or invalid target argument. Allowed targets: ${Object.keys(TARGET_RULES).join(', ')}`);
    process.exit(1);
  }

  const outputDir = join(process.cwd(), 'out', target);

  if (!existsSync(outputDir)) {
    console.error(`❌ Output directory does not exist: "${outputDir}"`);
    process.exit(1);
  }

  console.log(`\n📋 Verifying generated artifacts for [${target}] in: out/${target}/`);

  const rules = TARGET_RULES[target];
  const missing: string[] = [];

  for (const rule of rules) {
    const fullPath = join(outputDir, rule.path);
    if (!existsSync(fullPath)) {
      missing.push(`Missing ${rule.description}: ${rule.path}`);
      continue;
    }

    if (rule.isDirectory) {
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        missing.push(`Expected directory but found file: ${rule.path}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`\n❌ Verification failed with ${missing.length} missing artifact(s):`);
    for (const m of missing) {
      console.error(`  - ${m}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${rules.length} essential artifacts verified successfully for [${target}]!\n`);
}

main().catch((err) => {
  console.error('Unexpected error during artifact verification:', err);
  process.exit(1);
});
