const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../controllers/adminController/healUser");
const helpers = [
  "reminderControllerHelpers",
  "dietPlanCatalogControllerHelpers",
  "dietPlanControllerHelpers",
  "healthProgressControllerHelpers",
  "wellnessPrescriptionControllerHelpers",
  "testRecommendationControllerHelpers",
  "physicalExerciseAssignmentControllerHelpers",
  "mentalWellbeingAssignmentControllerHelpers",
  "supplementControllerHelpers",
  "mealTrackingControllerHelpers",
  "healConsultancyTrackControllerHelpers",
  "commitmentLetterControllerHelpers",
];

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".js")) continue;
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, "utf8");
  let changed = false;
  for (const h of helpers) {
    const from = `require("../${h}")`;
    const to = `require("../../${h}")`;
    if (s.includes(from)) {
      s = s.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, s);
    console.log("fixed", f);
  } else {
    console.log("ok", f);
  }
}
