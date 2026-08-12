import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

let i = 0;
let cnt = 0;
while ((i = blob.indexOf("userInsights", i)) >= 0 && cnt < 30) {
  console.log(i, JSON.stringify(blob.slice(Math.max(0, i - 70), i + 70)));
  i++;
  cnt++;
}
