import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, type GeneratorTarget } from "../config/index.ts";

/**
 * Pre-generation hook: runs before openapi-generator executes.
 */
export function beforeGenerate(target: GeneratorTarget): void {
  // Ensure target output directory exists
  if (!fs.existsSync(target.outputDir)) {
    fs.mkdirSync(target.outputDir, { recursive: true });
    return;
  }

  // Clean previous tests/artifacts if target is PHP
  if (target.generator === "php") {
    const testDir = path.resolve(target.outputDir, "test");
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

/**
 * Post-generation hook: runs after openapi-generator finishes successfully.
 */
export function afterGenerate(target: GeneratorTarget): void {
  // Copy Apache-2.0 LICENSE file into the SDK output directory
  const rootLicense = path.resolve(ROOT_DIR, "LICENSE");
  if (fs.existsSync(rootLicense)) {
    fs.copyFileSync(rootLicense, path.resolve(target.outputDir, "LICENSE"));
  }
}
