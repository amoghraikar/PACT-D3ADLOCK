import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, "../src");
const ALLOWED_FILES = new Set([
  path.resolve(SRC_DIR, "app/globals.css"),
]);

// Hex regex matching #RGB, #RGBA, #RRGGBB, #RRGGBBAA
const HEX_REGEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

let violations = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?|css|html)$/.test(entry.name)) {
      if (ALLOWED_FILES.has(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        const matches = line.match(HEX_REGEX);
        if (matches) {
          violations.push({
            file: path.relative(path.resolve(__dirname, ".."), fullPath),
            line: index + 1,
            matches,
            text: line.trim(),
          });
        }
      });
    }
  }
}

scanDir(SRC_DIR);

if (violations.length > 0) {
  console.error(`\x1b[31m[ERROR] Raw hex colors found outside token file (globals.css):\x1b[0m\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> ${v.matches.join(", ")}`);
    console.error(`    ${v.text}\n`);
  }
  console.error(`Found ${violations.length} raw hex violations. Use PACT design tokens instead.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS] No raw hex colors found outside globals.css!\x1b[0m`);
}
