import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const template = JSON.parse(m[1].trim());
console.log("type", typeof template);
if (typeof template === "string") {
  console.log("string prefix", template.slice(0, 200));
} else if (Array.isArray(template)) {
  console.log("array len", template.length, "first", typeof template[0], String(template[0]).slice(0, 100));
} else {
  console.log("keys sample", Object.keys(template).slice(0, 10));
}

// search raw file for user management section markers
const markers = ["<!-- USER MANAGEMENT -->", "userTypeTabs", "User name", "usersEmpty"];
for (const mk of markers) {
  console.log(mk, c.indexOf(mk));
}
