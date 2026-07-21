const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserMentalWellbeingController,
  createAdminUserMentalWellbeingController,
  deleteAdminUserMentalWellbeingController,
} = require("../../controllers/adminController/healUser/mentalWellbeingAssignmentController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/mental-wellbeing", protectAdmin, authorize("users.clientHub.wellness.mental-wellbeing"), listAdminUserMentalWellbeingController);
router.post("/:userId/mental-wellbeing", protectAdmin, authorize("users.clientHub.wellness.mental-wellbeing"), createAdminUserMentalWellbeingController);
router.delete(
  "/:userId/mental-wellbeing/:assignmentId",
  protectAdmin, authorize("users.clientHub.wellness.mental-wellbeing"),
  deleteAdminUserMentalWellbeingController
);

module.exports = router;
