import fs from "fs";
import path from "path";

const src = "C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html";
const outDir = "src/updatedadmin/_ref-extract-new";
const c = fs.readFileSync(src, "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

function extract(label, start, len = 5000) {
  const idx = blob.indexOf(start);
  if (idx < 0) { console.log("MISSING", label); return; }
  fs.writeFileSync(path.join(outDir, `${label}.txt`), blob.slice(idx, idx + len));
  console.log("OK", label, idx);
}

extract("nav-AC_SECTIONS", "AC_SECTIONS(){ return [[");
extract("nav-DEFAULT_VIEWS", "DEFAULT_VIEWS(){ return {");
extract("dash-sections", "<sc-if value=\"{{ showDashboard }}\"", 25000);
extract("dash-anRevHero", "anRevHero", 3000);
extract("dash-commOnb", "commOnbCount", 2000);
extract("dash-clientAlerts", "clientAlerts=", 4000);
extract("dash-champPodium", "champPodium=", 3000);
extract("dash-anMons", "const anMons=", 4000);
extract("dash-IRW_users", "IRW_USERS=", 8000);
