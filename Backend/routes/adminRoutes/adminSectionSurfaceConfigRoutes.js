const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getSectionSurfaceConfigController,
  createSectionSurfaceConfigController,
  updateSectionSurfaceConfigController,
} = require("../../controllers/adminController/sectionSurfaceConfigController");

const router = express.Router();

router.get(
  "/:section",
  protectAccount,
  authorizeStaff(["console.cf.view", "console.ct.view"], { admin: "section-surface-config.view" }),
  getSectionSurfaceConfigController
);
router.post(
  "/:section",
  protectAccount,
  authorizeStaff(["console.cf.edit", "console.ct.edit"], { admin: "section-surface-config.edit" }),
  createSectionSurfaceConfigController
);
router.patch(
  "/:section",
  protectAccount,
  authorizeStaff(["console.cf.edit", "console.ct.edit"], {
    admin: "section-surface-config.edit",
  }),
  updateSectionSurfaceConfigController
);

module.exports = router;
