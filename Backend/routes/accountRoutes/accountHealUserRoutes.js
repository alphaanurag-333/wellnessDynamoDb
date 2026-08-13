/**
 * Unified staff clinical routes under /api/account/heal-users.
 * Uses protectAccount + multi-role gate instead of coach-only protectors.
 */
const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listHealUsersForCoachPortalController,
  reassignHealUserForCoachPortalController,
} = require("../../controllers/adminController/userAssignmentController");
const {
  listCoachUserRemindersController,
  createCoachUserReminderController,
  updateCoachUserReminderController,
  toggleCoachUserReminderController,
  deleteCoachUserReminderController,
} = require("../../controllers/wellnessCoachController/reminderController");

const CLINICAL_ROLES = [
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
  "trainee",
];

/** Admin active role bypasses coach catalog slugs on unified clinical routes. */
function authorizeClinical(permissionSlug) {
  return (req, res, next) => {
    if (req.auth?.role === "admin") return next();
    return authorize(permissionSlug)(req, res, next);
  };
}

const router = express.Router({ mergeParams: true });
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

router.get("/", authorizeClinical("nav.my-users"), listHealUsersForCoachPortalController);
router.post(
  "/:id/reassign",
  requireActiveRole("admin", "wellness_coach"),
  reassignHealUserForCoachPortalController
);

router.get("/:userId/reminders", authorizeClinical("clientTab.care.reminders"), listCoachUserRemindersController);
router.post("/:userId/reminders", authorizeClinical("clientTab.care.reminders"), createCoachUserReminderController);
router.put(
  "/:userId/reminders/:reminderId",
  authorizeClinical("clientTab.care.reminders"),
  updateCoachUserReminderController
);
router.patch(
  "/:userId/reminders/:reminderId/toggle",
  authorizeClinical("clientTab.care.reminders"),
  toggleCoachUserReminderController
);
router.delete(
  "/:userId/reminders/:reminderId",
  authorizeClinical("clientTab.care.reminders"),
  deleteCoachUserReminderController
);

module.exports = router;
