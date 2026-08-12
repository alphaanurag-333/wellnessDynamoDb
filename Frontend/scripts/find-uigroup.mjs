import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");
const templatePart = blob.slice(0, 500000);

let i = 0;
while ((i = templatePart.indexOf("uiGroup", i)) >= 0) {
  console.log(i, templatePart.slice(i - 120, i + 200).replace(/\n/g, " "));
  i++;
}

const ct = templatePart.indexOf("{{ ctTitle }}");
console.log("ctTitle in template", ct);
if (ct >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/full-users-section.txt", templatePart.slice(ct - 3000, ct + 15000));
