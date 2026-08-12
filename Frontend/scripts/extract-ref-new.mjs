import fs from "fs";
import path from "path";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const outDir = "src/updatedadmin/_ref-extract-new";
fs.mkdirSync(outDir, { recursive: true });

const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const template = JSON.parse(m[1].trim());

const keys = Object.keys(template).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => template[k]).join("");
console.log("chars", keys.length, "blob len", blob.length);

function sliceAround(needle, radius = 8000) {
  const idx = blob.indexOf(needle);
  if (idx < 0) {
    console.log("missing", needle);
    return;
  }
  const safe = needle.replace(/[^a-z0-9_-]/gi, "_").slice(0, 40);
  fs.writeFileSync(path.join(outDir, `chunk-${safe}.txt`), blob.slice(Math.max(0, idx - 500), idx + radius));
  console.log("found", needle, "at", idx);
}

[
  "page-head__title\">Dashboard",
  "Community updates",
  "Program progress",
  "Program categories",
  "Champion leaderboard",
  "Revenue analytics",
  "Financial year",
  "users-row",
  "team-row",
  "app-users-group",
  "Total users",
  "Onboarding status",
].forEach((n) => sliceAround(n));

// Compare old vs new - search for new-only patterns
const needles = ["ua-section-label", "stat-card", "prog-card--onboard", "leaderboard__hero", "revenue-hero"];
for (const n of needles) {
  console.log(n, blob.includes(n) ? "YES" : "NO");
}
