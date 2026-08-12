import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

const idx = blob.indexOf("{{ clientAlerts }}");
console.log("clientAlerts template", idx);
if (idx >= 0) fs.writeFileSync("src/updatedadmin/_ref-extract-new/client-alerts-ui.txt", blob.slice(idx - 1500, idx + 4000));

// section order: find sequence of section titles in HTML (first 100k)
const part = blob.slice(22000, 80000);
const titles = ["Users", "Community", "Team", "Program progress", "Program categories", "Champion leaderboard", "Client updates", "Revenue Analytics", "Financial year"];
for (const t of titles) {
  const i = part.indexOf(t);
  if (i >= 0) console.log(t, i);
}
