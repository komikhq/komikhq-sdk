import { DEFAULT_EXCLUDED_PATTERNS } from "../config/index.ts";

export interface ProcessSpecOptions {
  excludePatterns?: string[];
}

export interface ProcessSpecResult {
  sanitizedSpec: any;
  excludedPaths: string[];
}

/**
 * Checks if an OpenAPI path matches a glob or exact exclusion pattern.
 * Supports:
 * - "/prefix/**" (matches "/prefix" and anything under "/prefix/...")
 * - exact matches (e.g. "/_openapi.json", "/")
 */
export function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return path === prefix || path.startsWith(prefix + "/");
  }
  return path === pattern;
}

/**
 * Sanitizes an OpenAPI 3.x specification by stripping excluded endpoints,
 * internal wildcards, and orphaned tags.
 */
export function processAndSanitizeSpec(
  rawSpec: any,
  options: ProcessSpecOptions = {}
): ProcessSpecResult {
  const excludePatterns = options.excludePatterns || DEFAULT_EXCLUDED_PATTERNS;
  const excludedPaths: string[] = [];
  const sanitizedPaths: Record<string, any> = {};

  const pathsObj = rawSpec.paths || {};

  for (const [pathKey, pathItem] of Object.entries(pathsObj)) {
    const shouldExclude = excludePatterns.some((pattern) =>
      matchesPattern(pathKey, pattern)
    );

    if (shouldExclude) {
      excludedPaths.push(pathKey);
    } else {
      sanitizedPaths[pathKey] = pathItem;
    }
  }

  // Identify all tags currently used in remaining operations
  const usedTags = new Set<string>();
  for (const pathItem of Object.values(sanitizedPaths)) {
    for (const method of ["get", "post", "put", "delete", "patch", "options", "head"]) {
      const op = (pathItem as any)[method];
      if (op && Array.isArray(op.tags)) {
        op.tags.forEach((tag: string) => usedTags.add(tag));
      }
    }
  }

  // Filter out tags from root spec.tags that have no corresponding endpoints
  const sanitizedTags = Array.isArray(rawSpec.tags)
    ? rawSpec.tags.filter((tagObj: any) => usedTags.has(tagObj.name))
    : rawSpec.tags;

  const sanitizedSpec = {
    ...rawSpec,
    paths: sanitizedPaths,
    tags: sanitizedTags,
  };

  return {
    sanitizedSpec,
    excludedPaths,
  };
}
