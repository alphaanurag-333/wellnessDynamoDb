/**
 * One-shot scaffold: admin heal-user controllers/routes/APIs/pages from assistant + coach patterns.
 * Run: node Backend/scripts/generateAdminHealUserScaffold.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const BE = path.join(ROOT, "Backend");
const FE = path.join(ROOT, "Frontend", "src");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
  console.log("wrote", path.relative(ROOT, file));
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function transformAssistantController(src) {
  let out = src;
  out = out.replace(/assertAssistantCanAccessUser/g, "assertAdminCanAccessUser");
  out = out.replace(/getAssistantWellnessCoachById/g, "getAdminById");
  out = out.replace(
    /require\("\.\.\/\.\.\/models\/assistantWellnessCoachModel"\)/g,
    'require("../../models/adminModel")'
  );
  out = out.replace(/createdByRole:\s*"assistant_wellness_coach"/g, 'createdByRole: "admin"');
  out = out.replace(/actingAssistantId/g, "adminId");
  out = out.replace(/assistantId/g, "adminId");
  out = out.replace(/assistantContext/g, "adminContext");
  out = out.replace(/const assistant = /g, "const admin = ");
  out = out.replace(/assistant\?/g, "admin?");
  out = out.replace(/assistant\./g, "admin.");
  out = out.replace(/Assistant/g, "Admin");
  out = out.replace(/assistant_/g, "admin_");
  // Fix access check body for inline context helpers
  out = out.replace(
    /if \(String\(user\.assignedCoachId \|\| ""\) !== String\(adminId\)\) \{\s*throw new AppError\("User is not assigned to you", 403\);\s*\}/g,
    "// Admin may manage any user"
  );
  out = out.replace(
    /await assertAdminCanAccessUser\(user, adminId\);/g,
    "await assertAdminCanAccessUser(user, adminId);"
  );
  return out;
}

function transformCoachRouteToAdmin(src, controllerRelPath) {
  let out = src;
  out = out.replace(
    /const \{ protectWellnessCoach \} = require\("\.\.\/\.\.\/middleware\/auth"\);/,
    'const { protectAdmin } = require("../../middleware/auth");'
  );
  out = out.replace(/protectWellnessCoach/g, "protectAdmin");
  out = out.replace(/authorize\("clientTab\./g, 'authorize("users.clientHub.');
  out = out.replace(
    /require\("\.\.\/\.\.\/controllers\/wellnessCoachController\/([^"]+)"\)/g,
    `require("${controllerRelPath}/$1")`
  );
  out = out.replace(/Coach/g, "Admin");
  out = out.replace(/coach/g, "admin");
  // undo accidental middleware renames
  out = out.replace(/protectAdmin/, "protectAdmin");
  return out;
}

function transformAssistantApi(src) {
  let out = src;
  out = out.replace(
    /import assistantApi, \{ authHeader, normalizeApiError \} from "\.\/assistantApi\.js";/,
    'import api, { authHeader, normalizeApiError } from "../../api.js";'
  );
  out = out.replace(/assistantApi\./g, "api.");
  out = out.replace(/\/assistant\/heal-users/g, "/admin/heal-users");
  out = out.replace(/assistant/g, "admin");
  out = out.replace(/Assistant/g, "Admin");
  return out;
}

// --- 1) Helpers ---
(function patchHelpers() {
  const reminderPath = path.join(BE, "controllers/reminderControllerHelpers.js");
  let rh = read(reminderPath);
  if (!rh.includes("assertAdminCanAccessUser")) {
    rh = rh.replace(
      "module.exports = {",
      `async function assertAdminCanAccessUser(_user, _adminId) {
  // Admins may manage any user; existence is enforced by loadTargetUser.
}

module.exports = {`
    );
    rh = rh.replace(
      "  assertAssistantCanAccessUser,\n  loadReminderForUser,",
      "  assertAssistantCanAccessUser,\n  assertAdminCanAccessUser,\n  loadReminderForUser,"
    );
    write(reminderPath, rh);
  }

  const dietPath = path.join(BE, "controllers/dietPlanControllerHelpers.js");
  let dh = read(dietPath);
  if (!dh.includes("assertAdminCanAccessUser")) {
    dh = dh.replace(
      "  assertAssistantCanAccessUser,\n  handleValidationError,",
      "  assertAssistantCanAccessUser,\n  assertAdminCanAccessUser,\n  handleValidationError,"
    );
    dh = dh.replace(
      "  assertAssistantCanAccessUser,\n  handleValidationError,\n  resolveCoachIdForUser,",
      "  assertAssistantCanAccessUser,\n  assertAdminCanAccessUser,\n  handleValidationError,\n  resolveCoachIdForUser,"
    );
    write(dietPath, dh);
  }
})();

// Controllers to clone from assistant
const CONTROLLERS = [
  "reminderController.js",
  "dietPlanCatalogAssignmentController.js",
  "wellnessPrescriptionController.js",
  "testRecommendationController.js",
  "physicalExerciseAssignmentController.js",
  "mentalWellbeingAssignmentController.js",
  "supplementRecommendationController.js",
  "supplementDosageController.js",
  "mealTrackingController.js",
  "healthProgressController.js",
  "metabolicMetricsController.js",
  "dailyReflectionController.js",
  "healConsultancyTrackController.js",
  "coachInsightController.js",
];

const CONTROLLER_DIR = path.join(BE, "controllers/adminController/healUser");
ensureDir(CONTROLLER_DIR);

for (const name of CONTROLLERS) {
  const srcPath = path.join(BE, "controllers/assistantWellnessCoachController", name);
  if (!fs.existsSync(srcPath)) {
    console.warn("missing controller", name);
    continue;
  }
  write(path.join(CONTROLLER_DIR, name), transformAssistantController(read(srcPath)));
}

// Commitment letter (user) — assistant file name
{
  const srcPath = path.join(
    BE,
    "controllers/assistantWellnessCoachController/commitmentLetterController.js"
  );
  if (fs.existsSync(srcPath)) {
    write(
      path.join(CONTROLLER_DIR, "commitmentLetterController.js"),
      transformAssistantController(read(srcPath))
    );
  }
}

// Launch / Prakruti — thin re-exports after we add adminHandlers (placeholder written later)
write(
  path.join(CONTROLLER_DIR, "launchAssessmentController.js"),
  `const { adminHandlers } = require("../../launchAssessmentControllerHelpers");

exports.listAdminUserLaunchFocusAreasController = adminHandlers.listFocusAreasController;
exports.listAdminUserLaunchQuestionsController = adminHandlers.listQuestionsController;
exports.listAdminUserLaunchAssessmentsController = adminHandlers.listAssessmentsController;
exports.getAdminUserLaunchAssessmentByDateController = adminHandlers.getAssessmentByDateController;
exports.createAdminUserLaunchAssessmentController = adminHandlers.createAssessmentController;
exports.updateAdminUserLaunchAssessmentController = adminHandlers.updateAssessmentController;
exports.deleteAdminUserLaunchAssessmentController = adminHandlers.deleteAssessmentController;
exports.exportAdminUserLaunchQuestionsController = adminHandlers.exportQuestionsController;
`
);

write(
  path.join(CONTROLLER_DIR, "prakrutiAssessmentController.js"),
  `const { adminHandlers } = require("../../prakrutiAssessmentControllerHelpers");

exports.listAdminUserPrakrutiThingsToAvoidController = adminHandlers.listThingsToAvoidController;
exports.listAdminUserPrakrutiQuestionsController = adminHandlers.listQuestionsController;
exports.getAdminUserPrakrutiAssessmentController = adminHandlers.getAssessmentController;
exports.saveAdminUserPrakrutiAssessmentController = adminHandlers.saveAssessmentController;
exports.exportAdminUserPrakrutiQuestionsController = adminHandlers.exportQuestionsController;
`
);

// Routes: clone coach routes (have authorize) → admin
const ROUTE_MAP = [
  ["coachReminderRoutes.js", "adminReminderRoutes.js", "reminderController.js"],
  ["coachDietPlanCatalogRoutes.js", "adminHealDietPlanRoutes.js", "dietPlanCatalogAssignmentController.js"],
  ["coachWellnessPrescriptionRoutes.js", "adminHealWellnessPrescriptionRoutes.js", "wellnessPrescriptionController.js"],
  ["coachTestRecommendationRoutes.js", "adminHealTestRecommendationRoutes.js", "testRecommendationController.js"],
  ["coachPhysicalExerciseRoutes.js", "adminHealPhysicalExerciseRoutes.js", "physicalExerciseAssignmentController.js"],
  ["coachMentalWellbeingRoutes.js", "adminHealMentalWellbeingRoutes.js", "mentalWellbeingAssignmentController.js"],
  ["coachSupplementRecommendationRoutes.js", "adminHealSupplementRecommendationRoutes.js", "supplementRecommendationController.js"],
  ["coachSupplementDosageRoutes.js", "adminHealSupplementDosageRoutes.js", "supplementDosageController.js"],
  ["coachMealTrackingRoutes.js", "adminHealMealTrackingRoutes.js", "mealTrackingController.js"],
  ["coachHealthProgressRoutes.js", "adminHealHealthProgressRoutes.js", "healthProgressController.js"],
  ["coachMetabolicMetricsRoutes.js", "adminHealMetabolicMetricsRoutes.js", "metabolicMetricsController.js"],
  ["coachDailyReflectionRoutes.js", "adminHealDailyReflectionRoutes.js", "dailyReflectionController.js"],
  ["coachHealConsultancyTrackRoutes.js", "adminHealConsultancyTrackRoutes.js", "healConsultancyTrackController.js"],
  ["coachCoachInsightRoutes.js", "adminHealCoachInsightRoutes.js", "coachInsightController.js"],
  ["coachUserCommitmentLetterRoutes.js", "adminHealUserCommitmentLetterRoutes.js", "commitmentLetterController.js"],
  ["coachLaunchAssessmentRoutes.js", "adminHealLaunchAssessmentRoutes.js", "launchAssessmentController.js"],
  ["coachPrakrutiAssessmentRoutes.js", "adminHealPrakrutiAssessmentRoutes.js", "prakrutiAssessmentController.js"],
];

const ROUTE_DIR = path.join(BE, "routes/adminRoutes");
for (const [coachFile, adminFile, controllerFile] of ROUTE_MAP) {
  const srcPath = path.join(BE, "routes/wellnessCoachRoutes", coachFile);
  if (!fs.existsSync(srcPath)) {
    console.warn("missing route", coachFile);
    continue;
  }
  let out = read(srcPath);
  out = out.replace(
    /const \{ protectWellnessCoach \} = require\("\.\.\/\.\.\/middleware\/auth"\);/,
    'const { protectAdmin } = require("../../middleware/auth");'
  );
  out = out.replace(/protectWellnessCoach/g, "protectAdmin");
  out = out.replace(/authorize\("clientTab\./g, 'authorize("users.clientHub.');
  out = out.replace(
    /require\("\.\.\/\.\.\/controllers\/wellnessCoachController\/[^"]+"\)/,
    `require("../../controllers/adminController/healUser/${controllerFile}")`
  );
  // Rename Coach → Admin in controller import bindings
  out = out.replace(/Coach/g, "Admin");
  write(path.join(ROUTE_DIR, adminFile), out);
}

// Frontend APIs
const API_MAP = [
  ["assistantDietPlanAssignments.js", "adminDietPlanAssignments.js"],
  ["assistantWellnessPrescriptions.js", "adminHealWellnessPrescriptions.js"],
  ["assistantTestRecommendations.js", "adminHealTestRecommendations.js"],
  ["assistantPhysicalExercises.js", "adminHealPhysicalExercises.js"],
  ["assistantMentalWellbeing.js", "adminHealMentalWellbeing.js"],
  ["assistantSupplementRecommendations.js", "adminHealSupplementRecommendations.js"],
  ["assistantSupplementDosage.js", "adminHealSupplementDosage.js"],
  ["assistantMealTracking.js", "adminHealMealTracking.js"],
  ["assistantHealthProgress.js", "adminHealHealthProgress.js"],
  ["assistantMetabolicMetrics.js", "adminHealMetabolicMetrics.js"],
  ["assistantDailyReflection.js", "adminHealDailyReflection.js"],
  ["assistantHealConsultancyTracks.js", "adminHealConsultancyTracks.js"],
  ["assistantCoachInsight.js", "adminHealCoachInsight.js"],
  ["assistantLaunchAssessment.js", "adminHealLaunchAssessment.js"],
  ["assistantPrakrutiAssessment.js", "adminHealPrakrutiAssessment.js"],
  ["reminderController.js", "adminHealReminders.js"],
  ["assistantCommitmentLetters.js", "adminHealCommitmentLetters.js"],
];

const API_DIR = path.join(FE, "admin/api");
for (const [srcName, destName] of API_MAP) {
  const srcPath = path.join(FE, "assistantWellnessCoach/api", srcName);
  if (!fs.existsSync(srcPath)) {
    console.warn("missing api", srcName);
    continue;
  }
  write(path.join(API_DIR, destName), transformAssistantApi(read(srcPath)));
}

console.log("Scaffold complete");
