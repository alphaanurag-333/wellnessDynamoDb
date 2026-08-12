import fs from "fs";
const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const template = JSON.parse(m[1].trim());
const keys = Object.keys(template).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => template[k]).join("");

const idx = blob.indexOf("userInsightsA");
console.log("userInsightsA", idx);
if (idx >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/users-row-html.txt", blob.slice(idx - 800, idx + 6000));

const idx2 = blob.indexOf("dashCardDefs");
console.log("dashCardDefs", idx2);
if (idx2 >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/dashCardDefs.txt", blob.slice(idx2, idx2 + 1500));

const idx3 = blob.indexOf("eDefs=");
console.log("eDefs", idx3);
if (idx3 >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/eDefs.txt", blob.slice(idx3, idx3 + 800));
