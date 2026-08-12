import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const c = fs.readFileSync(src, "utf8");

const patterns = ["function tierLabel", "tierLabel(t)", "const uList", "let uList", "uList=pool", "onTierFilter", "onUserSearch", "clearUserFilters:()"];

for (const p of patterns) {
  const i = c.indexOf(p);
  if (i >= 0) {
    console.log("\n===", p, "===\n", c.slice(i, i + 2000));
  }
}
