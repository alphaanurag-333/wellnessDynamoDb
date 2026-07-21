/**
 * Generate admin Client Hub page wrappers from assistant pages.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const srcDir = path.join(ROOT, "Frontend/src/assistantWellnessCoach/pages/myHealUsers");
const outDir = path.join(ROOT, "Frontend/src/admin/pages/user/clientHub");
fs.mkdirSync(outDir, { recursive: true });

const FILES = [
  "AssistantUserDietPlan.jsx",
  "AssistantUserWellnessPrescriptions.jsx",
  "AssistantUserTestRecommendations.jsx",
  "AssistantUserPhysicalExercises.jsx",
  "AssistantUserMentalWellbeing.jsx",
  "AssistantUserSupplementRecommendations.jsx",
  "AssistantUserSupplementDosage.jsx",
  "AssistantUserMealTrackingPage.jsx",
  "AssistantUserHealthProgress.jsx",
  "AssistantUserMetabolicMetrics.jsx",
  "AssistantUserDailyReflection.jsx",
  "AssistantUserHealConsultancyTracks.jsx",
  "AssistantUserCoachInsight.jsx",
  "AssistantUserCommitmentLetter.jsx",
  "AssistantUserLaunchAssessment.jsx",
  "AssistantUserPrakrutiAssessment.jsx",
];

function transform(src, fileName) {
  let out = src;
  out = out.replace(/from "\.\.\/\.\.\/\.\.\/admin\/pages\/NotFoundPage\.jsx"/g, 'from "../../NotFoundPage.jsx"');
  out = out.replace(/from "\.\.\/\.\.\/\.\.\/components\//g, 'from "../../../../components/');
  out = out.replace(
    /from "\.\.\/\.\.\/\.\.\/wellnessCoach\/components\/CoachPageLoader\.jsx"/g,
    'from "../../UserPageLoader.jsx"'
  );
  out = out.replace(/CoachPageLoadingState/g, "UserPageLoadingState");
  out = out.replace(/logoutAssistant/g, "logout");
  out = out.replace(/from "\.\.\/\.\.\/\.\.\/store\/authSlice\.js"/g, 'from "../../../../store/authSlice.js"');
  out = out.replace(/assistantToken/g, "adminToken");
  out = out.replace(/s\.auth\.assistantToken/g, "s.auth.adminToken");
  out = out.replace(/\/assistant\/my-users/g, "/admin/users");
  out = out.replace(/from "\.\.\/\.\.\/api\//g, 'from "../../../api/');

  // API import renames
  const apiMap = {
    "assistantDietPlanAssignments.js": "adminDietPlanAssignments.js",
    "assistantWellnessPrescriptions.js": "adminHealWellnessPrescriptions.js",
    "assistantTestRecommendations.js": "adminHealTestRecommendations.js",
    "assistantPhysicalExercises.js": "adminHealPhysicalExercises.js",
    "assistantMentalWellbeing.js": "adminHealMentalWellbeing.js",
    "assistantSupplementRecommendations.js": "adminHealSupplementRecommendations.js",
    "assistantSupplementDosage.js": "adminHealSupplementDosage.js",
    "assistantMealTracking.js": "adminHealMealTracking.js",
    "assistantHealthProgress.js": "adminHealHealthProgress.js",
    "assistantMetabolicMetrics.js": "adminHealMetabolicMetrics.js",
    "assistantDailyReflection.js": "adminHealDailyReflection.js",
    "assistantHealConsultancyTracks.js": "adminHealConsultancyTracks.js",
    "assistantCoachInsight.js": "adminHealCoachInsight.js",
    "assistantCommitmentLetters.js": "adminHealCommitmentLetters.js",
    "assistantLaunchAssessment.js": "adminHealLaunchAssessment.js",
    "assistantPrakrutiAssessment.js": "adminHealPrakrutiAssessment.js",
  };
  for (const [from, to] of Object.entries(apiMap)) {
    out = out.split(from).join(to);
  }

  // Function name prefixes assistant → admin
  out = out.replace(/\bassistant([A-Z])/g, "admin$1");
  out = out.replace(/Assistant/g, "Admin");
  out = out.replace(/export function AdminUser/g, "export function AdminUser");

  return out;
}

for (const file of FILES) {
  const srcPath = path.join(srcDir, file);
  if (!fs.existsSync(srcPath)) {
    console.warn("missing", file);
    continue;
  }
  const destName = file.replace(/^Assistant/, "Admin");
  fs.writeFileSync(path.join(outDir, destName), transform(fs.readFileSync(srcPath, "utf8"), file));
  console.log("wrote", destName);
}

// Reminders from userReminders folder
{
  const src = fs.readFileSync(
    path.join(ROOT, "Frontend/src/assistantWellnessCoach/pages/userReminders/UserReminders.jsx"),
    "utf8"
  );
  let out = transform(src, "UserReminders.jsx");
  out = out.replace(
    'from "../../api/reminderController.js"',
    'from "../../../api/adminHealReminders.js"'
  );
  out = out.replace(/assistant(List|Create|Update|Toggle|Delete)UserReminder/g, "admin$1UserReminder");
  // Fix remaining assistant names after transform
  out = out.replace(/adminListUserReminders/g, "adminListUserReminders");
  out = out.replace(/export function UserReminders/, "export function AdminUserReminders");
  // The transform already changed assistant* API imports incorrectly - fix imports from adminHealReminders
  out = `import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { NotFoundPage } from "../../NotFoundPage.jsx";
import { UserRemindersPanel } from "../../../../components/UserRemindersPanel.jsx";
import { UserPageLoadingState } from "../../UserPageLoader.jsx";
import { logout } from "../../../../store/authSlice.js";
import {
  adminCreateUserReminder,
  adminDeleteUserReminder,
  adminListUserReminders,
  adminToggleUserReminder,
  adminUpdateUserReminder,
} from "../../../api/adminHealReminders.js";

const reminderApi = {
  list: adminListUserReminders,
  create: adminCreateUserReminder,
  update: adminUpdateUserReminder,
  toggle: adminToggleUserReminder,
  remove: adminDeleteUserReminder,
};

export function AdminUserReminders({ embedded = false }) {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);

  return (
    <UserRemindersPanel
      token={adminToken}
      userId={userId}
      api={reminderApi}
      backTo={embedded ? null : "/admin/users"}
      PageLoader={UserPageLoadingState}
      NotFoundPage={NotFoundPage}
      onUnauthorized={() => dispatch(logout())}
    />
  );
}
`;
  fs.writeFileSync(path.join(outDir, "AdminUserReminders.jsx"), out);
  console.log("wrote AdminUserReminders.jsx");
}

console.log("done pages");
