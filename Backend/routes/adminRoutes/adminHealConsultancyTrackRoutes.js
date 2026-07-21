const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminHealConsultancyTracksController,
  createAdminHealConsultancyTrackController,
  updateAdminHealConsultancyTrackController,
  deleteAdminHealConsultancyTrackController,
} = require("../../controllers/adminController/healUser/healConsultancyTrackController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/heal-consultancy-tracks",
  protectAdmin, authorize("users.clientHub.care.consultancy"),
  listAdminHealConsultancyTracksController
);
router.post(
  "/:userId/heal-consultancy-tracks",
  protectAdmin, authorize("users.clientHub.care.consultancy"),
  createAdminHealConsultancyTrackController
);
router.patch(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectAdmin, authorize("users.clientHub.care.consultancy"),
  updateAdminHealConsultancyTrackController
);
router.delete(
  "/:userId/heal-consultancy-tracks/:trackId",
  protectAdmin, authorize("users.clientHub.care.consultancy"),
  deleteAdminHealConsultancyTrackController
);

module.exports = router;
