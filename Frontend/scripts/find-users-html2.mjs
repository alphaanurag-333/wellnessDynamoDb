import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

const idx = blob.indexOf("Expiring in 15 days");
console.log("expiring", idx);
// read more after expiring section
fs.writeFileSync("src/updatedadmin/_ref-extract-new/users-row-after-exp.txt", blob.slice(idx, idx + 8000));

const idx2 = blob.indexOf("list=\"{{ userInsights");
console.log("list userInsights", idx2);
if (idx2 >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/user-insights-html.txt", blob.slice(idx2 - 1000, idx2 + 4000));
