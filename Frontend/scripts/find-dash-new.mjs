import fs from "fs";
import path from "path";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const template = JSON.parse(m[1].trim());
const keys = Object.keys(template).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => template[k]).join("");

const outDir = "src/updatedadmin/_ref-extract-new";
fs.mkdirSync(outDir, { recursive: true });

const needles = [
  "Global dashboard",
  "showDash",
  "dashPage",
  "mIsDash",
  "curPage==='dashboard'",
  "Users</div>",
  "Tap a card",
  "Broadcast",
  "Program categories",
  "Fat Loss</div>",
  "Community message",
  "Birthdays",
  "Wellness Coach",
  "App users",
  "PWC pending",
  "Seek users",
];

for (const n of needles) {
  const idx = blob.indexOf(n);
  console.log(JSON.stringify(n), idx);
  if (idx >= 0) {
    const safe = n.replace(/[^a-z0-9_-]/gi, "_").slice(0, 30);
    fs.writeFileSync(path.join(outDir, `find-${safe}.txt`), blob.slice(idx - 300, idx + 5000));
  }
}
