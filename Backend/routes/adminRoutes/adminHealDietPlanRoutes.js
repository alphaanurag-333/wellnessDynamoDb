const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { requireClientAccess } = require("../../middleware/requireClientAccess");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserDietPlanAssignmentsController,
  createAdminUserDietPlanAssignmentController,
  deleteAdminUserDietPlanAssignmentController,
} = require("../../controllers/adminController/healUser/dietPlanCatalogAssignmentController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/diet-plan-assignments", protectAdmin, requireClientAccess, authorize("users.clientHub.care.diet-plan"), listAdminUserDietPlanAssignmentsController);
router.post("/:userId/diet-plan-assignments", protectAdmin, requireClientAccess, authorize("users.clientHub.care.diet-plan"), createAdminUserDietPlanAssignmentController);
router.delete(
  "/:userId/diet-plan-assignments/:assignmentId",
  protectAdmin, requireClientAccess, authorize("users.clientHub.care.diet-plan"),
  deleteAdminUserDietPlanAssignmentController
);

module.exports = router;
