import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

const needles = [
  "Client updates",
  "needs attention",
  "tClientUpdates",
  "alertSeriousCount",
  "dashHasTeam",
  "isAdminDash",
  "tCommunity",
  "Revenue Analytics",
  "Champion leaderboard",
  "commOnbCount",
  "anRevCardsAll",
  "alertDefs=",
];
for (const n of needles) {
  const idx = blob.indexOf(n);
  console.log(n, idx);
  if (idx >= 0 && idx < 100000) fs.writeFileSync(`src/updatedadmin/_ref-extract-new/html-${n.replace(/[^a-z0-9]/gi,"_")}.txt`, blob.slice(idx - 400, idx + 2500));
}
