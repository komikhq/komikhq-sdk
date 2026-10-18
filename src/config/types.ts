export type TargetKey = "typescript" | "php";

export interface GeneratorTarget {
  /** Human readable name of the target SDK */
  name: string;
  /** OpenAPI generator identifier (e.g. typescript-fetch, php) */
  generator: string;
  /** Relative or absolute path where the generated SDK is written */
  outputDir: string;
  /** Template directory containing full mustache templates */
  templateDir: string;
  /** Git host metadata */
  gitHost?: string;
  /** Git user/organization ID */
  gitUserId?: string;
  /** Git repository name */
  gitRepoId?: string;
  /** Additional generator properties passed via --additional-properties */
  additionalProperties: Record<string, string>;
  /** Description for CLI help */
  description: string;
}
