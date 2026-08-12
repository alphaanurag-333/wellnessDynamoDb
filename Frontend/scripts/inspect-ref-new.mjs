import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const template = JSON.parse(m[1].trim());

console.log("isArray", Array.isArray(template));
console.log("keys sample", Object.keys(template).slice(0, 10));
console.log("val0", template[0] ?? template["0"]);
console.log("has html", "html" in template, "css" in template);

// If numeric-key object, try joining values
const keys = Object.keys(template);
if (keys.length > 1000 && keys.every((k) => /^\d+$/.test(k))) {
  const joined = keys.sort((a, b) => Number(a) - Number(b)).map((k) => template[k]).join("");
  console.log("joined from numeric keys", joined.length);
  fs.writeFileSync("src/updatedadmin/_ref-extract-new/joined.txt", joined.slice(0, 1000000));
  const idx = joined.indexOf("Dashboard");
  console.log("Dashboard at", idx);
  if (idx >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/dashboard-chunk.txt", joined.slice(idx - 500, idx + 8000));
}
