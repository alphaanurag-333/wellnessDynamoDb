import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const out = "c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract-new";
const c = fs.readFileSync(src, "utf8");

const patterns = [
  "userRows=pool",
  "userRows=pool.map",
  "const userRows",
  "emailMasked:",
  "tierText:",
  "canConvert:",
  "canDowngrade:",
  "convertLabel:",
  "statusStyle:",
  "statusDot:",
  "Madhupriya Bilas",
  "utype:",
  "tier:'Seek",
  "tierFilter",
  "coachFilter",
  "sortName:",
  "sortActive:",
  "clearUserFilters",
];

for (const p of patterns) {
  const i = c.indexOf(p);
  if (i >= 0) {
    fs.writeFileSync(`${out}/js-${p.replace(/[^a-zA-Z0-9]/g, "_")}.txt`, c.slice(Math.max(0, i - 200), i + 4000));
    console.log("found", p);
  }
}
