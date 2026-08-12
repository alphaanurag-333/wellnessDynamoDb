import fs from "fs";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const out = "c:/Ajay/Wellness15julywebsite/wellnessDynamoDb/Frontend/src/updatedadmin/_ref-extract-new";
const c = fs.readFileSync(src, "utf8");

// Find bundled JS
const scripts = [...c.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
console.log("external scripts", scripts);

// Search for user data patterns in raw file
const patterns = [
  "All users",
  "Individual clients",
  "Team members",
  "App users",
  "Madhupriya",
  "emailMasked",
  "canConvert",
  "typeFilter",
  "tierFilter",
  "userTypeTabs(){",
  "userTypeTabs(){return",
];

for (const p of patterns) {
  const i = c.indexOf(p);
  if (i >= 0) {
    fs.writeFileSync(`${out}/find-${p.replace(/[^a-zA-Z0-9]/g, "_")}.txt`, c.slice(Math.max(0, i - 100), i + 3000));
    console.log("found", p);
  } else {
    console.log("missing", p);
  }
}
