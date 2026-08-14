const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listPendingMealLogsController,
  reviewMealLogController,
} = require("../../controllers/adminController/mealReviewController");
const {
  adminGetUserMealTrackingController,
  adminDeleteMealLogController,
} = require("../../controllers/adminController/mealTrackingController");

const router = express.Router();
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

const pending = authorizeStaff("console.pt.view", {
  admin: "users.clientHub.tracking.meal-tracking",
  wellness_coach: "nav.meal-approvals",
  assistant_wellness_coach: "nav.meal-approvals",
  trainee: "nav.meal-approvals",
});
const pendingWrite = authorizeStaff("console.pt.edit", {
  admin: "users.clientHub.tracking.meal-tracking",
  wellness_coach: "nav.meal-approvals",
  assistant_wellness_coach: "nav.meal-approvals",
});

router.get("/pending-review", pending, listPendingMealLogsController);
router.patch("/:logId/review", pendingWrite, reviewMealLogController);

router.get(
  "/users/:userId/meal-tracking",
  authorizeStaff("console.diet.view", { admin: "users.view", wellness_coach: "clientTab.tracking.meal-tracking" }),
  adminGetUserMealTrackingController
);
router.delete(
  "/users/:userId/meal-tracking/:logId",
  authorizeStaff("console.diet.delete", { admin: "users.edit", wellness_coach: "clientTab.tracking.meal-tracking" }),
  adminDeleteMealLogController
);

module.exports = router;
