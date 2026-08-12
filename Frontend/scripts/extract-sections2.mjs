import fs from "fs";
const c = fs.readFileSync("C:/Users/hp/Downloads/IR Wellness Admin Console  (1).html", "utf8");
const m = c.match(/<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
const t = JSON.parse(m[1].trim());
const keys = Object.keys(t).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
const blob = keys.map((k) => t[k]).join("");

fs.writeFileSync("src/updatedadmin/_ref-extract-new/client-updates-html.txt", blob.slice(928000, 930500));
fs.writeFileSync("src/updatedadmin/_ref-extract-new/alert-defs.txt", blob.slice(957726, 959200));
fs.writeFileSync("src/updatedadmin/_ref-extract-new/an-rev-cards.txt", blob.slice(74716, 77000));
fs.writeFileSync("src/updatedadmin/_ref-extract-new/champ-section.txt", blob.slice(68000, 73000));
