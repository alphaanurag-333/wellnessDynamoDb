import fs from "fs";

const html = fs.readFileSync("dist/index.html", "utf8");
const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!m) {
  console.error("JSON-LD missing");
  process.exit(1);
}
const data = JSON.parse(m[1]);
console.log("JSON-LD OK:", data["@graph"].map((x) => x["@type"]).join(", "));

const sm = fs.readFileSync("dist/sitemap.xml", "utf8");
const routes = [
  "/",
  "/about-us",
  "/success-stories",
  "/wellnesspedia",
  "/contact-us",
  "/fat-loss",
  "/diabetes-reversal",
  "/thyroid",
  "/gut-health",
  "/pcod-pcos-reversal",
  "/privacy-policy",
  "/terms-and-conditions",
  "/medical-disclaimer",
  "/community-guideline",
];
for (const r of routes) {
  const loc = r === "/" ? "https://irwellness.in/" : `https://irwellness.in${r}`;
  if (!sm.includes(`<loc>${loc}</loc>`)) console.log("MISSING FROM SITEMAP:", r);
}
console.log("Sitemap URL count:", (sm.match(/<loc>/g) || []).length);

const files = [
  "src/site/components/SiteHeader.jsx",
  "src/site/components/SiteFooter.jsx",
  "src/site/data/siteNav.js",
];
const found = new Set();
const linkRe = /to="(\/[^"]*)"/g;
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  let match;
  while ((match = linkRe.exec(t))) found.add(match[1]);
}
console.log("Nav/footer paths:", [...found].sort().join(", "));
for (const p of found) {
  if (!routes.includes(p)) console.log("Nav path outside sitemap set:", p);
}

const dead = [];
for (const f of ["src/site/components/PromoSections.jsx", "src/site/pages/HomePage.jsx"]) {
  const t = fs.readFileSync(f, "utf8");
  if (/href=["']#["']/.test(t)) dead.push(f);
}
console.log(dead.length ? `Dead hash links in: ${dead.join(", ")}` : "No href='#' in homepage promo/home.");
console.log("robots.txt:", fs.readFileSync("dist/robots.txt", "utf8").trim());
