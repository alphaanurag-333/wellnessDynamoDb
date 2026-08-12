import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const out = "c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract-new";
const c = fs.readFileSync(src, "utf8");

const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const html = JSON.parse(m[1].trim());

const start = html.indexOf("<!-- USER MANAGEMENT -->");
const end = html.indexOf("<!-- ACCESS", start);
const section = html.slice(start, end > start ? end : start + 20000);
fs.writeFileSync(`${out}/new-showUsers-full.txt`, section);
console.log("section len", section.length);

// Also extract JS bundle if separate
const jsMatch = c.match(/<script type="__bundler\/page_order"[^>]*>([\s\S]*?)<\/script>/);
if (jsMatch) {
  const pageOrder = JSON.parse(jsMatch[1].trim());
  console.log("page_order", pageOrder);
}

// Search in full raw content for JS patterns outside template
for (const needle of ["userTypeTabs(){", "userTypeTabs()", "onUserSearch", "sortName", "usersEmpty"]) {
  const i = c.indexOf(needle);
  if (i >= 0) {
    fs.writeFileSync(`${out}/new-raw-${needle.replace(/[^a-zA-Z]/g, "_")}.txt`, c.slice(Math.max(0, i - 300), i + 2500));
    console.log("found", needle, "at", i);
  }
}
