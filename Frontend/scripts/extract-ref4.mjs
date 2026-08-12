import fs from "fs";

const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console.html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const doc = JSON.parse(m[1]);
console.log("doc type", typeof doc, "length", doc.length);

fs.writeFileSync("src/updatedadmin/_ref-doc.html", doc);

const styleMatch = doc.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync("src/updatedadmin/_ref.css", styleMatch[1]);
  console.log("css length", styleMatch[1].length);
}

// Count key patterns
for (const pat of ["@keyframes fadein", "@keyframes shimmer", ".cdact", ".stat-card", "stroke-width:1.7", "ADMIN CONSOLE"]) {
  console.log(pat, doc.includes(pat));
}
