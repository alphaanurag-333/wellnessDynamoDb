import fs from "fs";

const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console.html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
if (!m) {
  console.log("no match");
  process.exit(1);
}
console.log("raw length", m[1].length);
const t = JSON.parse(m[1]);
console.log("isArray", Array.isArray(t), "len", t.length);

// Find string chunks with CSS or HTML
let cssIdx = -1;
let htmlIdx = -1;
for (let i = 0; i < t.length; i++) {
  const v = t[i];
  if (typeof v !== "string") continue;
  if (v.includes("@keyframes fadein") && cssIdx < 0) cssIdx = i;
  if (v.includes("<!DOCTYPE html>") && htmlIdx < 0) htmlIdx = i;
}
console.log("cssIdx", cssIdx, "htmlIdx", htmlIdx);

if (cssIdx >= 0) {
  fs.writeFileSync("src/updatedadmin/_ref.css", t[cssIdx]);
  console.log("css written", t[cssIdx].length);
  console.log("css preview", t[cssIdx].slice(0, 500));
}

if (htmlIdx >= 0) {
  fs.writeFileSync("src/updatedadmin/_ref.html", t[htmlIdx]);
  console.log("html written", t[htmlIdx].length);
}

// find js chunk
for (let i = 0; i < t.length; i++) {
  const v = t[i];
  if (typeof v === "string" && v.includes("class App") || (typeof v === "string" && v.includes("React.createElement"))) {
    console.log("js candidate", i, v.slice(0, 100));
  }
}

// Also search for fadein in all strings
const fadeChunks = [];
for (let i = 0; i < t.length; i++) {
  if (typeof t[i] === "string" && t[i].includes("fadein")) fadeChunks.push(i);
}
console.log("fadein chunks", fadeChunks.slice(0, 10));
