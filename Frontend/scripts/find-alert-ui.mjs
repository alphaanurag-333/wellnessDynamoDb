import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");
for (const n of ["alertSeriousCount", "sevLabel", "tAnalytics", "Client updates", "{{ a.name }}", "alertDefs"]) {
  const idx = blob.indexOf(n);
  console.log(n, idx);
  if (idx >= 0 && idx < 120000) fs.writeFileSync(`src/updatedadmin/_ref-extract-new/ui-${n.replace(/[^a-z]/gi,"_")}.txt`, blob.slice(idx - 800, idx + 3000));
}
