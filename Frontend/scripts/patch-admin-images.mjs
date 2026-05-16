import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "pages");

const patches = [
  {
    file: "banners/BannerPage.jsx",
    adds: `import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";\n`,
    reps: [
      [
        /<img src=\{imagePreview\} alt="Banner preview" style=\{\{ width: 120, height: 70, objectFit: "cover", borderRadius: 8 \}\} \} \/>/,
        `<AdminMediaImage path={editBaselineImage} src={imagePreview || undefined} width={120} height={70} radius={8} alt="Banner preview" />`,
      ],
      [
        /<td>\{row\.image \? <img src=\{mediaUrl\(row\.image\)\} alt="" style=\{\{ width: 56, height: 42, objectFit: "cover", borderRadius: 6 \}\} \/> : "—"\}<\/td>/,
        `<td><AdminMediaImage path={row.image} width={56} height={42} radius={6} alt="" /></td>`,
      ],
    ],
  },
  {
    file: "healthConcern/HealthConcernPage.jsx",
    adds: `import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";\n`,
    reps: [
      [
        /<img src=\{iconPreview\} alt="" style=\{\{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 \}\} \} \/>/,
        `<AdminMediaImage path={editBaselineIcon} src={iconPreview || undefined} width={72} height={72} radius={8} alt="" />`,
      ],
      [
        /<img src=\{mediaUrl\(row\.icon\)\} alt="" style=\{\{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 \}\} \} \/>/,
        `<AdminMediaImage path={row.icon} width={44} height={44} radius={8} alt="" />`,
      ],
      [
        /\{viewRow\.icon \? \(\s*<div style=\{\{ marginBottom: 12 \}\}>\s*<img\s*src=\{mediaUrl\(viewRow\.icon\)\}\s*alt=""\s*style=\{\{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 \}\}\s*\/>\s*<\/div>\s*\) : null\}/s,
        `<motion.div style={{ marginBottom: 12 }}><AdminMediaImage path={viewRow.icon} width={80} height={80} radius={8} alt="" /></div>`,
      ],
    ],
  },
];

// Manual simpler global replacements per file
const files = [
  "banners/BannerPage.jsx",
  "healthConcern/HealthConcernPage.jsx",
  "healthTool/HealthTool.jsx",
  "healthRecipe/HealthRecipeList.jsx",
  "healthRecipe/HealthRecipeAdd.jsx",
  "healthRecipe/HealthRecipeView.jsx",
  "transformation/TransformationPage.jsx",
  "notification/Notification.jsx",
  "celebrationBanner/CelebrationBanner.jsx",
];

for (const rel of files) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("AdminMediaImage") && s.includes("<img")) {
    const m = s.match(/^import .+;\n/m);
    if (m) {
      const i = s.indexOf(m[0]) + m[0].length;
      s = s.slice(0, i) + `import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";\n` + s.slice(i);
    }
  }

  s = s.replace(
    /<img src=\{imagePreview\} alt="Banner preview" style=\{\{ width: 120, height: 70, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={editBaselineImage} src={imagePreview || undefined} width={120} height={70} radius={8} alt="Banner preview" />`
  );
  s = s.replace(
    /<td>\{row\.image \? <img src=\{mediaUrl\(row\.image\)\} alt="" style=\{\{ width: 56, height: 42, objectFit: "cover", borderRadius: 6 \}\} \/> : "—"\}<\/td>/g,
    `<td><AdminMediaImage path={row.image} width={56} height={42} radius={6} alt="" /></td>`
  );
  s = s.replace(
    /<img src=\{iconPreview\} alt="" style=\{\{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={editBaselineIcon} src={iconPreview || undefined} width={72} height={72} radius={8} alt="" />`
  );
  s = s.replace(
    /<img src=\{mediaUrl\(row\.icon\)\} alt="" style=\{\{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={row.icon} width={44} height={44} radius={8} alt="" />`
  );
  s = s.replace(
    /<img src=\{mediaUrl\(row\.thumbnail\)\} alt="" style=\{\{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={row.thumbnail} width={44} height={44} radius={8} alt="" />`
  );
  s = s.replace(
    /<img src=\{thumbnailPreview\} alt="" style=\{\{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={editBaselineThumbnail} src={thumbnailPreview || undefined} width={72} height={72} radius={8} alt="" />`
  );
  s = s.replace(
    /<img src=\{oldPreview\} alt="" style=\{\{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={editBaselineOld} src={oldPreview || undefined} width={200} height={140} radius={8} alt="Before" style={{ width: "100%", maxHeight: 140 }} />`
  );
  s = s.replace(
    /<img src=\{newPreview\} alt="" style=\{\{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8 \}\} \} \/>/g,
    `<AdminMediaImage path={editBaselineNew} src={newPreview || undefined} width={200} height={140} radius={8} alt="After" style={{ width: "100%", maxHeight: 140 }} />`
  );

  fs.writeFileSync(p, s);
  console.log("patched", rel);
}
