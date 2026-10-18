#!/usr/bin/env tsx

/**
 * Sync & Release Script
 *
 * Handles the CI/CD pipeline for pushing generated SDK code
 * to target repositories and optionally creating GitHub Releases.
 *
 * Required environment variables:
 *   GITHUB_TOKEN    - GitHub App installation token
 *   TARGET_REPO     - Target repository (e.g. komikhq/komikhq-typescript)
 *   SOURCE_DIR      - Path to generated SDK output (e.g. out/typescript)
 *
 * Optional environment variables:
 *   RELEASE_VERSION - Semver tag to create a release (e.g. v1.0.0)
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Configuration ───────────────────────────────────────────────

interface Config {
  githubToken: string;
  targetRepo: string;
  sourceDir: string;
  releaseVersion?: string;
  botName: string;
  botEmail: string;
}

function loadConfig(): Config {
  const githubToken = process.env.GITHUB_TOKEN;
  const targetRepo = process.env.TARGET_REPO;
  const sourceDir = process.env.SOURCE_DIR;
  const releaseVersion = process.env.RELEASE_VERSION || undefined;

  if (!githubToken) throw new Error('Missing GITHUB_TOKEN');
  if (!targetRepo) throw new Error('Missing TARGET_REPO');
  if (!sourceDir) throw new Error('Missing SOURCE_DIR');

  if (!existsSync(sourceDir)) {
    throw new Error(`SOURCE_DIR "${sourceDir}" does not exist`);
  }

  const bot = resolveBotIdentity(githubToken);

  return {
    githubToken,
    targetRepo,
    sourceDir,
    releaseVersion: releaseVersion || undefined,
    botName: bot.name,
    botEmail: bot.email,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function run(cmd: string, opts?: { cwd?: string; silent?: boolean }): string {
  const result = execSync(cmd, {
    cwd: opts?.cwd,
    encoding: 'utf-8',
    stdio: opts?.silent ? 'pipe' : 'inherit',
  });
  return (result ?? '').trim();
}

function log(emoji: string, message: string) {
  console.log(`${emoji}  ${message}`);
}

function resolveBotIdentity(token: string): { name: string; email: string } {
  const envName = process.env.GIT_USER_NAME;
  const envEmail = process.env.GIT_USER_EMAIL;
  if (envName && envEmail) {
    return { name: envName, email: envEmail };
  }

  log('🤖', 'Resolving bot identity from GitHub App token...');

  const appRaw = run(
    `curl -s -f -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" https://api.github.com/app`,
    { silent: true }
  );

  let appData: { slug?: string };
  try {
    appData = JSON.parse(appRaw);
  } catch {
    throw new Error(`Failed to parse GitHub App response: ${appRaw}`);
  }

  if (!appData.slug) {
    throw new Error('GitHub App API response did not contain a valid "slug"');
  }

  const slug = appData.slug;

  const userRaw = run(
    `curl -s -f -H "Accept: application/vnd.github+json" https://api.github.com/users/${slug}[bot]`,
    { silent: true }
  );

  let userData: { id?: number };
  try {
    userData = JSON.parse(userRaw);
  } catch {
    throw new Error(`Failed to parse bot user info for ${slug}[bot]: ${userRaw}`);
  }

  if (!userData.id) {
    throw new Error(`Could not find a valid user ID for bot "${slug}[bot]"`);
  }

  log('👤', `Bot committer: ${slug}[bot] <${userData.id}+${slug}[bot]@users.noreply.github.com>`);

  return {
    name: `${slug}[bot]`,
    email: `${userData.id}+${slug}[bot]@users.noreply.github.com`,
  };
}

// ─── Steps ───────────────────────────────────────────────────────

function cloneTargetRepo(config: Config): string {
  const workDir = join(tmpdir(), `sdk-sync-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  const cloneUrl = `https://x-access-token:${config.githubToken}@github.com/${config.targetRepo}.git`;

  log('📦', `Cloning ${config.targetRepo}...`);

  try {
    run(`git clone --depth 1 "${cloneUrl}" repo`, { cwd: workDir });
  } catch {
    // Repository might be empty (first push)
    log('⚠️', 'Clone failed — initializing fresh repository...');
    const repoDir = join(workDir, 'repo');
    mkdirSync(repoDir, { recursive: true });
    run('git init', { cwd: repoDir });
    run(`git remote add origin "${cloneUrl}"`, { cwd: repoDir });
  }

  return join(workDir, 'repo');
}

function syncFiles(config: Config, repoDir: string) {
  log('🔄', 'Syncing generated files...');

  // Remove all tracked files except .git
  const entries = readdirSync(repoDir);
  for (const entry of entries) {
    if (entry === '.git') continue;
    rmSync(join(repoDir, entry), { recursive: true, force: true });
  }

  // Copy generated output
  cpSync(config.sourceDir, repoDir, { recursive: true });
}

function commitAndPush(config: Config, repoDir: string): boolean {
  log('📝', 'Creating commit...');

  run(`git config user.name "${config.botName}"`, { cwd: repoDir });
  run(`git config user.email "${config.botEmail}"`, { cwd: repoDir });
  run('git add -A', { cwd: repoDir });

  // Check for changes
  try {
    run('git diff --cached --quiet', { cwd: repoDir, silent: true });
    log('ℹ️', 'No changes detected. Skipping push.');
    return false;
  } catch {
    // diff --quiet exits 1 when there ARE changes — that's what we want
  }

  const commitMsg = config.releaseVersion
    ? `chore: update SDK to ${config.releaseVersion}`
    : `chore: sync SDK from latest OpenAPI spec`;

  run(`git commit -m "${commitMsg}"`, { cwd: repoDir });

  log('🚀', `Pushing to ${config.targetRepo}...`);
  run('git push origin HEAD --force', { cwd: repoDir });

  return true;
}

function createRelease(config: Config, repoDir: string) {
  if (!config.releaseVersion) return;

  log('🏷️', `Creating tag ${config.releaseVersion}...`);
  run(`git tag "${config.releaseVersion}"`, { cwd: repoDir });
  run(`git push origin "${config.releaseVersion}"`, { cwd: repoDir });

  log('📋', `Creating GitHub Release ${config.releaseVersion}...`);

  const releasePayload = JSON.stringify({
    tag_name: config.releaseVersion,
    name: config.releaseVersion,
    generate_release_notes: true,
  });

  run(
    `curl -s -X POST \
      -H "Authorization: Bearer ${config.githubToken}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      -d '${releasePayload}' \
      "https://api.github.com/repos/${config.targetRepo}/releases"`,
    { silent: true },
  );

  log('✅', `Release ${config.releaseVersion} created!`);
}

function cleanup(repoDir: string) {
  const workDir = join(repoDir, '..');
  rmSync(workDir, { recursive: true, force: true });
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();

  log('🚀', `Sync & Release — ${config.targetRepo}`);
  log('📂', `Source: ${config.sourceDir}`);
  if (config.releaseVersion) {
    log('🏷️', `Release: ${config.releaseVersion}`);
  }

  console.log('');

  const repoDir = cloneTargetRepo(config);

  try {
    syncFiles(config, repoDir);
    const pushed = commitAndPush(config, repoDir);

    if (pushed) {
      createRelease(config, repoDir);
    }

    log('✅', 'Done!');
  } finally {
    cleanup(repoDir);
  }
}

main().catch((err) => {
  console.error('\n❌ Sync & Release failed:', err.message || err);
  process.exit(1);
});
