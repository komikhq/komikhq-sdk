import fs from "node:fs";
import path from "node:path";

/**
 * Render a Mustache template file with context data and write to target path.
 * Supports triple-brace unescaped `{{{key}}}` and standard `{{key}}` syntax.
 */
export function renderTemplateFile(
  templatePath: string,
  outputPath: string,
  context: Record<string, string | number | boolean>
): void {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at: ${templatePath}`);
  }

  let content = fs.readFileSync(templatePath, "utf-8");

  // Replace triple braces {{{key}}}
  for (const [key, value] of Object.entries(context)) {
    const triplePattern = new RegExp(`\\{\\{\\{${key}\\}\\}\\}`, "g");
    content = content.replace(triplePattern, String(value));
  }

  // Replace double braces {{key}}
  for (const [key, value] of Object.entries(context)) {
    const doublePattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    content = content.replace(doublePattern, String(value));
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content, "utf-8");
}
