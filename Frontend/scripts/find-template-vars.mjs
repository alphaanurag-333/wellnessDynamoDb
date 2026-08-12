import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

for (const n of ["userInsightsA", "userInsightsB", "uiGroupA", "uiGroupB", "short2", "PWC pending"]) {
  let i = 0;
  while ((i = blob.indexOf(n, i)) >= 0) {
    const ctx = blob.slice(i - 100, i + 100);
    if (ctx.includes("sc-for") || ctx.includes("{{") || ctx.includes("list=")) {
      console.log("\n===", n, "at", i);
      console.log(ctx.replace(/\n/g, " "));
    }
    i++;
  }
}
