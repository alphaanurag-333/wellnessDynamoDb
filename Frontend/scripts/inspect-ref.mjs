import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");
console.log("len", c.length);
const types = [...c.matchAll(/<script type="([^"]+)"/g)].map((m) => m[1]);
console.log("script types", types);
console.log("has template", c.includes("__bundler/template"));
console.log("has showUsers", c.includes("showUsers"));
console.log("has User Management", c.includes("User Management"));

const idx = c.indexOf("User Management");
if (idx >= 0) {
  console.log("User Management context:\n", c.slice(idx, idx + 500));
}
