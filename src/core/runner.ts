import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, DEFAULT_SPEC_URL, TARGETS, type TargetKey } from "../config/index.ts";
import { beforeGenerate, afterGenerate } from "./hooks.ts";
import { processAndSanitizeSpec } from "./spec-processor.ts";

export interface RunOptions {
  specUrl?: string;
  outputDir?: string;
}

export async function runGenerator(
  targetKey: TargetKey,
  options: RunOptions = {}
): Promise<void> {
  const baseTarget = TARGETS[targetKey];
  if (!baseTarget) {
    throw new Error(
      `Unknown generator target: "${targetKey}". Available targets: ${Object.keys(TARGETS).join(", ")}`
    );
  }

  const specUrl = options.specUrl || DEFAULT_SPEC_URL;
  const target = {
    ...baseTarget,
    outputDir: options.outputDir ? path.resolve(process.cwd(), options.outputDir) : baseTarget.outputDir,
  };

  console.log(`\n======================================================`);
  console.log(`>> Target SDK   : ${target.name} [${targetKey}]`);
  console.log(`>> Spec Source  : ${specUrl}`);
  console.log(`>> Template Dir : ${target.templateDir}`);
  console.log(`>> Output Dir   : ${target.outputDir}`);
  console.log(`======================================================`);

  // Execute pre-generation lifecycle hooks
  beforeGenerate(target);

  let rawSpecContent = "";
  if (specUrl.startsWith("http://") || specUrl.startsWith("https://")) {
    console.log(`>> Fetching OpenAPI spec with KomikHQ-Bot User-Agent from ${specUrl}...`);
    const userAgent = "KomikHQ-Bot";
    const res = await fetch(specUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json, text/plain, */*",
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to download OpenAPI spec from ${specUrl}: HTTP ${res.status} ${res.statusText}`);
    }
    rawSpecContent = await res.text();
  } else {
    rawSpecContent = fs.readFileSync(path.resolve(process.cwd(), specUrl), "utf-8");
  }

  // Parse and sanitize specification with path exclusion filter
  const parsedJson = JSON.parse(rawSpecContent);
  const { sanitizedSpec, excludedPaths } = processAndSanitizeSpec(parsedJson);

  if (excludedPaths.length > 0) {
    console.log(`>> [Spec Processor] Excluded ${excludedPaths.length} non-REST path(s):`);
    excludedPaths.forEach((p) => console.log(`   - ${p}`));
  }

  const tempSpecPath = path.resolve(ROOT_DIR, ".openapi-spec.json");
  fs.writeFileSync(tempSpecPath, JSON.stringify(sanitizedSpec, null, 2), "utf-8");
  const resolvedSpec = tempSpecPath;

  const props = Object.entries(target.additionalProperties)
    .map(([key, val]) => `${key}=${val}`)
    .join(",");

  const cliBin = path.resolve(ROOT_DIR, "node_modules/.bin/openapi-generator-cli");
  const binCommand = fs.existsSync(cliBin) ? cliBin : "openapi-generator-cli";

  const args = [
    "generate",
    "-i",
    resolvedSpec,
    "-g",
    target.generator,
    "-o",
    target.outputDir,
    "--skip-validate-spec",
  ];

  if (target.gitHost) {
    args.push("--git-host", target.gitHost);
  }
  if (target.gitUserId) {
    args.push("--git-user-id", target.gitUserId);
  }
  if (target.gitRepoId) {
    args.push("--git-repo-id", target.gitRepoId);
  }

  if (props) {
    args.push(`--additional-properties=${props}`);
  }

  // Use full template directory directly
  if (fs.existsSync(target.templateDir)) {
    args.push("-t", target.templateDir);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(binCommand, args, {
      cwd: ROOT_DIR,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    proc.on("error", (err: Error) => {
      console.error(`[Error] Failed to execute generator for ${target.name}:`, err);
      reject(err);
    });

    proc.on("close", (code: number | null) => {
      if (code === 0) {
        // Execute post-generation lifecycle hooks
        afterGenerate(target);

        console.log(`✓ Successfully generated ${target.name} at: ${target.outputDir}\n`);
        resolve();
      } else {
        const error = new Error(`Generator for ${target.name} exited with code ${code}`);
        console.error(`✗ ${error.message}`);
        reject(error);
      }
    });
  });
}
