import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");
const idx = blob.indexOf("Needs attention");
console.log("Needs attention", idx);
if (idx >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/needs-attention-ui.txt", blob.slice(idx - 2000, idx + 5000));

// also search tClient or updates section header
for (const n of ["{{ tClientUpdates }}", "tClientUpdates", "client updates", "alertSeriousCount }}"]) {
  console.log(n, blob.indexOf(n));
}
