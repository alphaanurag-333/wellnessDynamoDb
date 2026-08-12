import fs from "fs";
import path from "path";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const template = JSON.parse(m[1].trim());
const keys = Object.keys(template).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => template[k]).join("");
const outDir = "src/updatedadmin/_ref-extract-new";

const needles = [
  "coachTiers",
  "userInsightDefs",
  "appUserDefs",
  "dashHasTier",
  "ctTitle",
  "tTeam",
  "Program progress",
  "progCats",
  "champPodium",
  "champCollapsed",
  "Maintenance",
  "Individual",
  "Onboarding queue",
];
for (const n of needles) {
  const idx = blob.indexOf(n);
  console.log(n, idx);
  if (idx >= 0) fs.writeFileSync(path.join(outDir, `find-${n.replace(/[^a-z0-9]/gi,"_")}.txt`), blob.slice(idx - 200, idx + 8000));
}
