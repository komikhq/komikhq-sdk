#!/usr/bin/env tsx

/**
 * OpenAPI Spec Health & Validation Check
 *
 * Verifies that the remote OpenAPI specification endpoint is reachable,
 * returns HTTP 200, and contains a valid OpenAPI version field.
 *
 * Usage:
 *   pnpm check:spec [optional_spec_url]
 */

import { execSync } from 'node:child_process';

const DEFAULT_SPEC_URL = 'https://api.komikhq.com/openapi.json';
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function main() {
  const specUrl = process.argv[2] || DEFAULT_SPEC_URL;

  console.log(`🔍 Checking OpenAPI Spec health at: ${specUrl}`);

  // 1. Check HTTP Status Code
  let httpStatus: string;
  try {
    httpStatus = run(`curl -s -o /dev/null -w "%{http_code}" -A "${BROWSER_USER_AGENT}" "${specUrl}"`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`❌ Network error while reaching spec URL: ${error.message}`);
    process.exit(1);
  }

  if (httpStatus !== '200') {
    console.error(`❌ OpenAPI endpoint returned HTTP status ${httpStatus} (expected 200)`);
    try {
      const dump = run(`curl -s -i -A "${BROWSER_USER_AGENT}" -H "Accept: application/json, text/plain, */*" "${specUrl}" | head -n 30`);
      console.error(`Response details:\n${dump}`);
    } catch {}
    process.exit(1);
  }

  console.log(`✓ HTTP status: ${httpStatus} OK`);

  // 2. Fetch and Validate JSON Structure
  let rawJson: string;
  try {
    rawJson = run(`curl -sS -A "${BROWSER_USER_AGENT}" "${specUrl}"`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`❌ Failed to fetch OpenAPI payload: ${error.message}`);
    process.exit(1);
  }

  let parsed: { openapi?: string; info?: { title?: string; version?: string } };
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error('❌ Failed to parse response as valid JSON.');
    process.exit(1);
  }

  if (!parsed.openapi) {
    console.error('❌ Missing "openapi" version property in specification document.');
    process.exit(1);
  }

  console.log(`✓ OpenAPI version : ${parsed.openapi}`);
  console.log(`✓ Title           : ${parsed.info?.title || 'Unknown'}`);
  console.log(`✓ API version     : ${parsed.info?.version || 'Unknown'}`);
  console.log('\n✅ OpenAPI specification is healthy and valid!\n');
}

main().catch((err) => {
  console.error('Unexpected error during spec check:', err);
  process.exit(1);
});
