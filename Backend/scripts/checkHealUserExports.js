const fs = require("fs");
const path = require("path");

const routeDir = path.join(__dirname, "../routes/adminRoutes");
const mismatches = [];
const files = fs.readdirSync(routeDir).filter(
  (f) =>
    f === "adminReminderRoutes.js" ||
    (f.startsWith("adminHeal") && !f.startsWith("adminHealth"))
);

for (const f of files) {
  const src = fs.readFileSync(path.join(routeDir, f), "utf8");
  const blocks = [...src.matchAll(/const \{([\s\S]*?)\} = require\("([^"]+)"\)/g)];
  for (const block of blocks) {
    const reqPathRaw = block[2];
    if (!reqPathRaw.includes("adminController/healUser") && !reqPathRaw.includes("healUser/")) {
      continue;
    }
    const names = block[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    let reqPath = reqPathRaw;
    if (!reqPath.endsWith(".js")) reqPath += ".js";
    const abs = path.resolve(routeDir, reqPath);
    if (!fs.existsSync(abs)) {
      mismatches.push(`${f}: missing ${abs}`);
      continue;
    }
    const ctrl = fs.readFileSync(abs, "utf8");
    for (const name of names) {
      if (!ctrl.includes(`exports.${name}`)) {
        mismatches.push(`${f} -> missing export ${name}`);
      }
    }
  }
}

console.log(mismatches.length ? mismatches.join("\n") : "ALL OK");
console.log("checked", files.length, "route files");
