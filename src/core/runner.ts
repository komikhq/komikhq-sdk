import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, DEFAULT_SPEC_URL, TARGETS, type TargetKey } from "../config/index.ts";
import { beforeGenerate, afterGenerate } from "./hooks.ts";

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

  const props = Object.entries(target.additionalProperties)
    .map(([key, val]) => `${key}=${val}`)
    .join(",");

  const cliBin = path.resolve(ROOT_DIR, "node_modules/.bin/openapi-generator-cli");
  const binCommand = fs.existsSync(cliBin) ? cliBin : "openapi-generator-cli";

  const args = [
    "generate",
    "-i",
    specUrl,
    "-g",
    target.generator,
    "-o",
    target.outputDir,
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
