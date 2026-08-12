import fs from "fs";

const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console.html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1]);
console.log("constructor", t?.constructor?.name);
console.log("keys sample", Object.keys(t).slice(0, 5));
console.log("val0 type", typeof t[0], String(t[0]).slice(0, 80));
console.log("val1 type", typeof t[1], String(t[1]).slice(0, 80));

// Convert to array if needed
const arr = Array.isArray(t) ? t : Object.values(t);
console.log("arr len", arr.length);

for (let i = 0; i < arr.length; i++) {
  const v = arr[i];
  if (typeof v !== "string") continue;
  if (v.includes("@keyframes") && v.includes("Inter")) {
    fs.writeFileSync("src/updatedadmin/_ref.css", v);
    console.log("CSS at", i, "len", v.length);
    break;
  }
}

for (let i = 0; i < arr.length; i++) {
  const v = arr[i];
  if (typeof v !== "string") continue;
  if (v.includes("<!DOCTYPE html>") || v.includes("<x-dc>")) {
    fs.writeFileSync("src/updatedadmin/_ref.html", v);
    console.log("HTML at", i, "len", v.length);
    break;
  }
}

// grep line 394 from original file had escaped html in manifest
const manifest = c.match(/<script type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/);
if (manifest) {
  const man = JSON.parse(manifest[1]);
  console.log("manifest keys", Object.keys(man).slice(0, 20));
}
