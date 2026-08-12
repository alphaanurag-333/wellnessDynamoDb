import fs from "fs";

const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");
console.log("blob len", blob.length);

for (const term of ["roleMenuStyle", "roleTriggerStyle", "navFootStyle", "roleSwitchList", "roleMenuOpen", "toggleRoleMenu"]) {
  let idx = 0;
  let count = 0;
  while (count < 5) {
    const i = blob.indexOf(term, idx);
    if (i < 0) break;
    console.log(term, i, JSON.stringify(blob.slice(i, i + 80)));
    fs.writeFileSync(
      `c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract-new/ref-${term}-${count}.txt`,
      blob.slice(Math.max(0, i - 150), i + 1200),
    );
    idx = i + term.length;
    count += 1;
  }
}
