import fs from "fs";

const paths = ["C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html"];

for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.log("missing", p);
    continue;
  }
  const c = fs.readFileSync(p, "utf8");
  const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    console.log("no tpl", p);
    continue;
  }
  const t = JSON.parse(m[1].trim());
  let blob = "";
  if (t.html) blob += t.html;
  if (t.css) blob += t.css;
  if (t.js) blob += t.js;
  if (!blob) {
    const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    blob = keys.map((k) => t[k]).join("");
  }

  for (const term of ["roleMenuStyle", "roleTriggerStyle", "roleSwitchList", "navFootStyle", "toggleRoleMenu"]) {
    const i = blob.indexOf(term);
    console.log(term, i);
    if (i >= 0) {
      fs.writeFileSync(
        `c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract-new/js-${term}.txt`,
        blob.slice(Math.max(0, i - 200), i + 1800),
      );
    }
  }
}
