import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");
let i = 0;
while ((i = blob.indexOf("clientAlert", i)) >= 0) {
  if (i < 90000) console.log(i, blob.slice(i - 60, i + 80).replace(/\n/g, " "));
  i++;
}
