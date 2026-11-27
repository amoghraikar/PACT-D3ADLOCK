import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");
const allowed = new Set([path.resolve(srcDir, "index.css")]);
const hexRe = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

const violations = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (/\.(tsx?|jsx?|css)$/.test(entry.name) && !allowed.has(full)) {
      const lines = fs.readFileSync(full, "utf8").split("\n");
      lines.forEach((line, idx) => {
        const m = line.match(hexRe);
        if (m) violations.push(`${path.relative(srcDir, full)}:${idx + 1}: ${m.join(", ")}`);
      });
    }
  }
}
scan(srcDir);

if (violations.length > 0) {
  console.error("Raw hex colors outside index.css:\n" + violations.join("\n"));
  process.exit(1);
}
console.log("[PASS] Zero raw hex colors outside index.css");
