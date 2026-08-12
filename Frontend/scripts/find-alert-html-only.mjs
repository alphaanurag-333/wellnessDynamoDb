import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");
// search HTML only (before first big script class)
const htmlEnd = blob.indexOf("class IRWAdmin");
const html = blob.slice(0, htmlEnd);
console.log("html len", html.length);
for (const n of ["clientAlerts", "alertSerious", "Client updates", "Needs attention", "sevLabel", "a.msg"]) {
  console.log(n, html.indexOf(n));
}
