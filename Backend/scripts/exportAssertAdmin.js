const fs = require("fs");
const path = require("path");

const files = [
  "mealTrackingControllerHelpers.js",
  "supplementControllerHelpers.js",
  "physicalExerciseAssignmentControllerHelpers.js",
  "mentalWellbeingAssignmentControllerHelpers.js",
  "healConsultancyTrackControllerHelpers.js",
  "wellnessPrescriptionControllerHelpers.js",
  "testRecommendationControllerHelpers.js",
  "commitmentLetterControllerHelpers.js",
];

const dir = path.join(__dirname, "../controllers");

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) {
    console.log("skip missing", f);
    continue;
  }
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("assertAdminCanAccessUser")) {
    console.log("already", f);
    continue;
  }
  if (!s.includes("assertAssistantCanAccessUser") && !s.includes("assertCoachCanAccessUser")) {
    console.log("no assert pattern", f);
    continue;
  }
  // Add to import from reminder / diet helpers if present
  if (s.includes("assertAssistantCanAccessUser,")) {
    s = s.replace(
      /assertAssistantCanAccessUser,/g,
      "assertAssistantCanAccessUser,\n  assertAdminCanAccessUser,"
    );
  } else if (s.includes("assertCoachCanAccessUser,")) {
    s = s.replace(
      /assertCoachCanAccessUser,/g,
      "assertCoachCanAccessUser,\n  assertAdminCanAccessUser,"
    );
  }
  fs.writeFileSync(p, s);
  console.log("patched", f);
}
