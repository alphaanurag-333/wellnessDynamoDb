const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserDietPlanAssignmentsController,
  createAdminUserDietPlanAssignmentController,
  deleteAdminUserDietPlanAssignmentController,
} = require("../../controllers/adminController/healUser/dietPlanCatalogAssignmentController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/diet-plan-assignments", protectAdmin, authorize("users.clientHub.care.diet-plan"), listAdminUserDietPlanAssignmentsController);
router.post("/:userId/diet-plan-assignments", protectAdmin, authorize("users.clientHub.care.diet-plan"), createAdminUserDietPlanAssignmentController);
router.delete(
  "/:userId/diet-plan-assignments/:assignmentId",
  protectAdmin, authorize("users.clientHub.care.diet-plan"),
  deleteAdminUserDietPlanAssignmentController
);

module.exports = router;
