import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "..", "src");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".jsx")) out.push(p);
  }
  return out;
}

const fadeInner =
  /<div style=\{\{ display: "grid", justifyItems: "center", gap: 10 \}\}>\s*<FadeLoader[^/]+\/>\s*(?:<span>([^<]*)<\/span>\s*)?<\/div>/g;

for (const p of walk(path.join(srcRoot, "pages"))) {
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("FadeLoader")) continue;

  const labels = [];
  s = s.replace(fadeInner, (_, label) => {
    labels.push((label || "Loading…").trim());
    return `__ADMIN_LOADER__${labels.length - 1}__`;
  });

  if (!labels.length) continue;

  s = s.replace(/import \{ FadeLoader \} from "react-spinners";\r?\n/, "");

  // table row: <tr><td colSpan={N} className="static-cms-loading">__ADMIN_LOADER__0__</td></tr>
  s = s.replace(
    /<tr>\s*<td colSpan=\{(\d+)\} className="static-cms-loading">\s*__ADMIN_LOADER__(\d+)__\s*<\/td>\s*<\/tr>/g,
    (_, n, i) => `<AdminTableLoaderRow colSpan={${n}} label="${labels[Number(i)]}" />`
  );

  // bare block inside card
  s = s.replace(/__ADMIN_LOADER__(\d+)__/g, (_, i) => {
    return `<AdminPageLoader label="${labels[Number(i)]}" />`;
  });

  const names = [];
  if (s.includes("AdminPageLoader")) names.push("AdminPageLoader");
  if (s.includes("AdminPageLoadingState")) names.push("AdminPageLoadingState");
  if (s.includes("AdminTableLoaderRow")) names.push("AdminTableLoaderRow");
  if (names.length && !s.includes("components/AdminLoader")) {
    const importLine = `import { ${names.join(", ")} } from "../../components/AdminLoader.jsx";\n`;
    const m = s.match(/^import .+;\n/m);
    if (m) {
      const idx = s.indexOf(m[0]) + m[0].length;
      s = s.slice(0, idx) + importLine + s.slice(idx);
    }
  }

  fs.writeFileSync(p, s);
  console.log("fixed", path.relative(srcRoot, p));
}
