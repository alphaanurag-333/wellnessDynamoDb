/**
 * Rebuild admin heal-user controllers that need coach-parity (update handlers, etc.)
 * from wellnessCoachController with admin access semantics.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const outDir = path.join(ROOT, "Backend/controllers/adminController/healUser");

function transformCoachController(src) {
  let out = src;
  out = out.replace(/assertCoachCanAccessUser/g, "assertAdminCanAccessUser");
  out = out.replace(/getWellnessCoachById/g, "getAdminById");
  out = out.replace(
    /require\("\.\.\/\.\.\/models\/wellnessCoachModel"\)/g,
    'require("../../models/adminModel")'
  );
  out = out.replace(/createdByRole:\s*"wellness_coach"/g, 'createdByRole: "admin"');
  out = out.replace(/actingCoachId/g, "adminId");
  out = out.replace(/coachContext/g, "adminContext");
  out = out.replace(/Coach/g, "Admin");
  out = out.replace(
    /await assertAdminCanAccessUser\(user, adminId\);/g,
    "await assertAdminCanAccessUser(user, adminId);"
  );
  // Fix helper requires: coach uses ../helpers/X, admin healUser needs ../../helpers/X
  out = out.replace(/require\("\.\.\/helpers\/([A-Za-z0-9]+ControllerHelpers)"\)/g, 'require("../../helpers/$1")');
  // Models/utils stay ../../
  return out;
}

const FROM_COACH = [
  "healthProgressController.js",
  "metabolicMetricsController.js",
  "dailyReflectionController.js",
  "coachInsightController.js",
  "mealTrackingController.js",
];

for (const name of FROM_COACH) {
  const src = fs.readFileSync(
    path.join(ROOT, "Backend/controllers/wellnessCoachController", name),
    "utf8"
  );
  fs.writeFileSync(path.join(outDir, name), transformCoachController(src));
  console.log("rebuilt from coach", name);
}
