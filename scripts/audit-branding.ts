#!/usr/bin/env tsx

/**
 * Branding Audit Script
 *
 * Scans the compiled SDK output directory for any remaining
 * third-party generator references that should have been
 * white-labeled during template processing.
 *
 * Exit code 0 = PASSED (no violations found)
 * Exit code 1 = FAILED (violations detected)
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const PROHIBITED_PATTERNS = [
  /OpenAPI[\s-]?Generator/gi,
  /openapitools/gi,
  /openapi-generator/gi,
  /openapi-generator\.tech/gi,
];

const SCAN_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json',
  '.php', '.md', '.yml', '.yaml', '.xml',
  '.txt', '.cfg', '.ini', '.neon', '.dist',
]);

interface Violation {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.openapi-generator') continue;
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (entry.name === '.npmignore' || entry.name === '.gitignore' || entry.name === '.openapi-generator-ignore') continue;
        const ext = entry.name.includes('.')
          ? '.' + entry.name.split('.').pop()!.toLowerCase()
          : '';
        if (SCAN_EXTENSIONS.has(ext) || !ext) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return files;
}

async function auditFile(filePath: string, baseDir: string): Promise<Violation[]> {
  const violations: Violation[] = [];
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of PROHIBITED_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[i])) {
        violations.push({
          file: relative(baseDir, filePath),
          line: i + 1,
          content: lines[i].trim().substring(0, 120),
          pattern: pattern.source,
        });
      }
    }
  }

  return violations;
}

async function main() {
  const scanDir = process.argv[2] || 'out';
  const baseDir = process.cwd();
  const targetDir = join(baseDir, scanDir);

  try {
    await stat(targetDir);
  } catch {
    console.log(`⚠️  Directory "${scanDir}" not found. Skipping audit.`);
    process.exit(0);
  }

  console.log(`\n🔍 Scanning "${scanDir}/" for prohibited branding...\n`);

  const files = await collectFiles(targetDir);
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = await auditFile(file, baseDir);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log(`✅ PASSED — ${files.length} files scanned, 0 violations found.\n`);
    process.exit(0);
  }

  console.log(`❌ FAILED — ${allViolations.length} violation(s) found:\n`);
  for (const v of allViolations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    → ${v.content}`);
    console.log(`    Pattern: ${v.pattern}\n`);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error('Audit script error:', err);
  process.exit(1);
});
