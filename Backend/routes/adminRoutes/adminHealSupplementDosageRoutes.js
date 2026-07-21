const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserSupplementDosagesController,
  createAdminUserSupplementDosageController,
  deleteAdminUserSupplementDosageController,
} = require("../../controllers/adminController/healUser/supplementDosageController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-dosages",
  protectAdmin, authorize("users.clientHub.wellness.supplement-dosage"),
  listAdminUserSupplementDosagesController
);
router.post(
  "/:userId/supplement-dosages",
  protectAdmin, authorize("users.clientHub.wellness.supplement-dosage"),
  createAdminUserSupplementDosageController
);
router.delete(
  "/:userId/supplement-dosages/:dosageId",
  protectAdmin, authorize("users.clientHub.wellness.supplement-dosage"),
  deleteAdminUserSupplementDosageController
);

module.exports = router;
