import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console.html";
const c = fs.readFileSync(src, "utf8");
const outDir = "c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract";

const keys = [
  "Daily activity",
  "Personal details",
  "Nutritions",
  "cdDashCards",
  "drawerMenu",
  "cdMetab",
  "cdOnbSteps",
  "cdSuppRows",
  "drawerContentWrap",
  "mIsPersonal",
  "mIsNutrition",
  "cdact",
  "cdlifering",
  "prakchip",
];

for (const k of keys) {
  let idx = 0;
  let n = 0;
  while (n < 3) {
    const i = c.indexOf(k, idx);
    if (i < 0) break;
    fs.writeFileSync(`${outDir}/find-${k.replace(/[^a-z0-9]+/gi, "-")}-${n}.txt`, c.slice(i, i + 6000));
    idx = i + k.length;
    n++;
  }
  console.log(k, n, "chunks");
}

// find JS object definitions in file
for (const k of ["cdOnbSteps:", "drawerMenu:", "cdDashCards:", "cdSuppRows:"]) {
  const i = c.indexOf(k);
  console.log(k, i >= 0 ? i : "missing");
  if (i >= 0) fs.writeFileSync(`${outDir}/js-${k.replace(/[:]/g, "")}.txt`, c.slice(i, i + 12000));
}
