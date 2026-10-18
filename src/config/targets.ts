import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GeneratorTarget, TargetKey } from "./types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of komikhq-sdk
export const ROOT_DIR = path.resolve(__dirname, "../../");

// Default OpenAPI Specification URL from production
export const DEFAULT_SPEC_URL =
  process.env.OPENAPI_SPEC_URL || "https://api.komikhq.com/openapi.json";

export const TARGETS: Record<TargetKey, GeneratorTarget> = {
  typescript: {
    name: "TypeScript (Fetch)",
    generator: "typescript-fetch",
    outputDir: path.resolve(ROOT_DIR, "out/typescript"),
    templateDir: path.resolve(ROOT_DIR, "templates/typescript-fetch"),
    gitHost: "github.com",
    gitUserId: "komikhq",
    gitRepoId: "komikhq-typescript",
    additionalProperties: {
      npmName: "@komikhq/komikhq-typescript",
      npmVersion: "1.0.0",
      typescriptThreePlus: "true",
      supportsES6: "true",
      modelPropertyNaming: "camelCase",
      licenseName: "Apache-2.0",
      gitHost: "github.com",
      gitUserId: "komikhq",
      gitRepoId: "komikhq-typescript",
    },
    description: "Pure TypeScript/JavaScript Fetch SDK for npm distribution",
  },
  php: {
    name: "PHP",
    generator: "php",
    outputDir: path.resolve(ROOT_DIR, "out/php"),
    templateDir: path.resolve(ROOT_DIR, "templates/php"),
    gitHost: "github.com",
    gitUserId: "komikhq",
    gitRepoId: "komikhq-php",
    additionalProperties: {
      invokerPackage: "KomikHQ",
      packageName: "komikhq-php",
      composerPackageName: "komikhq/komikhq-php",
      developerOrganization: "KomikHQ",
      developerOrganizationUrl: "https://komikhq.com",
      artifactUrl: "https://komikhq.com",
      variableNamingConvention: "camelCase",
      srcBasePath: "lib",
      licenseName: "Apache-2.0",
      gitHost: "github.com",
      gitUserId: "komikhq",
      gitRepoId: "komikhq-php",
    },
    description: "PHP SDK (PSR-18 / Composer) for Packagist distribution",
  },
};
