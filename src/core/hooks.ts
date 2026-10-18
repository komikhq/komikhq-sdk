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

  // Write tailored .gitattributes (crucial for Composer export-ignore and clean git releases)
  if (target.generator === "php") {
    const phpGitAttributes = `# Gitattributes for KomikHQ PHP Client SDK
# Exclude non-essential dev/test files when downloaded via Composer archive
/.github export-ignore
/.gitattributes export-ignore
/.gitignore export-ignore
/.travis.yml export-ignore
/.php-cs-fixer.dist.php export-ignore
/phpunit.xml.dist export-ignore
/test export-ignore
/docs export-ignore
/git_push.sh export-ignore
`;
    fs.writeFileSync(path.resolve(target.outputDir, ".gitattributes"), phpGitAttributes);
  } else if (target.generator === "typescript-fetch") {
    const tsGitAttributes = `# Gitattributes for KomikHQ TypeScript Client SDK
/.github export-ignore
/.gitattributes export-ignore
/.gitignore export-ignore
/.npmignore export-ignore
/docs export-ignore
`;
    fs.writeFileSync(path.resolve(target.outputDir, ".gitattributes"), tsGitAttributes);
  }
}
