const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../../Frontend/src/admin/pages/user/clientHub");
const missing = [];

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".jsx")) continue;
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  for (const m of s.matchAll(/from ["']([^"']+)["']/g)) {
    const rel = m[1];
    if (!rel.startsWith(".")) continue;
    const abs = path.resolve(dir, rel);
    const candidates = [
      abs,
      abs + ".js",
      abs + ".jsx",
      abs.replace(/\.jsx$/, "") + ".js",
    ];
    if (!candidates.some((c) => fs.existsSync(c))) {
      missing.push(`${f}: ${rel} -> ${abs}`);
    }
  }
}
console.log(missing.length ? missing.join("\n") : "ALL IMPORTS OK");
