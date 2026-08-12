import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

// Find HTML occurrences (before script section)
const htmlEnd = blob.indexOf("<script");
const html = blob.slice(0, htmlEnd);

const needles = ["userInsightsA", "userInsightsB", "uiGroupA", "Total users", "PWC pending"];
for (const n of needles) {
  let idx = 0;
  let count = 0;
  while ((idx = html.indexOf(n, idx)) >= 0 && count < 3) {
    console.log(n, "at", idx);
    if (count === 0) fs.writeFileSync(`src/updatedadmin/_ref-extract-new/html-${n.replace(/\s/g,"_")}.txt`, html.slice(idx - 500, idx + 3000));
    idx++;
    count++;
  }
}
