import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console.html";
const outDir = "c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract";
const c = fs.readFileSync(src, "utf8");

const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
if (!m) {
  console.error("No __bundler/template found");
  process.exit(1);
}

const raw = m[1].trim();
let template;
try {
  template = JSON.parse(raw);
} catch {
  template = null;
}

fs.mkdirSync(outDir, { recursive: true });

if (template && typeof template === "object" && !Array.isArray(template)) {
  if (template.html) fs.writeFileSync(`${outDir}/ref.html`, template.html);
  if (template.css) fs.writeFileSync(`${outDir}/ref.css`, template.css);
  if (template.js) fs.writeFileSync(`${outDir}/ref.js`, template.js);
  console.log("Wrote object template", { html: (template.html || "").length, css: (template.css || "").length });
} else {
  fs.writeFileSync(`${outDir}/template-raw.json`, raw.slice(0, 500000));
  console.log("Template is array or non-object, saved prefix");
}

// Search full file for user detail strings
const needles = [
  "Client profile",
  "At a Glance",
  "ua-cp",
  "client-profile",
  "clientProfile",
  "userdetail",
  "user-detail",
  "Metabolic snapshot",
  "Onboarding status",
  "MENU LIST",
];
for (const n of needles) {
  const i = c.indexOf(n);
  console.log(n, i >= 0 ? `found @ ${i}` : "NOT FOUND");
}

// Extract chunks around Client profile in raw html file
for (const n of ["Client profile", "Metabolic snapshot", "Onboarding status"]) {
  const i = c.indexOf(n);
  if (i >= 0) {
    fs.writeFileSync(`${outDir}/chunk-${n.replace(/\s+/g, "-").toLowerCase()}.txt`, c.slice(Math.max(0, i - 2000), i + 8000));
  }
}
