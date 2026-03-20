import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectCssFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".css")) {
      files.push(fullPath);
    }
  }

  return files;
}

const cssRoot = join(process.cwd(), ".next", "static");
const rootStats = statSync(cssRoot, { throwIfNoEntry: false });

if (!rootStats?.isDirectory()) {
  console.error(`[theme-check] CSS directory not found: ${cssRoot}`);
  process.exit(1);
}

const cssFiles = collectCssFiles(cssRoot);
if (cssFiles.length === 0) {
  console.error("[theme-check] No compiled CSS files found.");
  process.exit(1);
}

const cssContent = cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");

const checks = [
  {
    name: "bg-surface-2",
    regex: /\.bg-surface-2\{[^}]*background-color:var\(--color-surface-2\)/,
  },
  {
    name: "text-text-1",
    regex: /\.text-text-1\{[^}]*color:var\(--color-text-1\)/,
  },
  {
    name: "border-border-1",
    regex: /\.border-border-1\{[^}]*border-color:var\(--color-border-1\)/,
  },
  {
    name: "bg-overlay-1",
    regex: /\.bg-overlay-1\{[^}]*background-color:var\(--color-overlay-1\)/,
  },
  {
    name: "hover:bg-overlay-1",
    regex: /\.hover\\:bg-overlay-1:hover\{[^}]*background-color:var\(--color-overlay-1\)/,
  },
  {
    name: "hover:text-text-1",
    regex: /\.hover\\:text-text-1:hover\{[^}]*color:var\(--color-text-1\)/,
  },
];

const failed = checks.filter((check) => !check.regex.test(cssContent));
if (failed.length > 0) {
  console.error("[theme-check] Semantic utilities are still frozen in compiled CSS.");
  for (const item of failed) {
    console.error(`  - Missing dynamic mapping for: ${item.name}`);
  }
  process.exit(1);
}

console.log("[theme-check] OK: semantic utilities are runtime-theme-aware.");
