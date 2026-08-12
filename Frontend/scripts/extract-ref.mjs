import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console.html";
const out = "c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin";
const c = fs.readFileSync(src, "utf8");

function extract(type) {
  const re = new RegExp(`<script type="${type.replace("/", "\\/")}"[^>]*>([\\s\\S]*?)<\\/script>`);
  const m = c.match(re);
  return m ? m[1].trim() : null;
}

const templateRaw = extract("__bundler/template");
if (!templateRaw) {
  console.error("No __bundler/template found");
  process.exit(1);
}

const template = JSON.parse(templateRaw);
console.log("template keys", Object.keys(template));

if (template.html) fs.writeFileSync(`${out}/_ref.html`, template.html);
if (template.css) fs.writeFileSync(`${out}/_ref.css`, template.css);
if (template.js) fs.writeFileSync(`${out}/_ref.js`, template.js);

console.log("sizes", {
  html: (template.html || "").length,
  css: (template.css || "").length,
  js: (template.js || "").length,
});

// Pull key CSS tokens
if (template.css) {
  const css = template.css;
  const keys = ["fadein", "cdact", "stat-card", "sidebar", "shimmer", "@keyframes"];
  for (const k of keys) {
    const i = css.indexOf(k);
    if (i >= 0) console.log(`\n--- ${k} ---\n`, css.slice(i, i + 400));
  }
}
