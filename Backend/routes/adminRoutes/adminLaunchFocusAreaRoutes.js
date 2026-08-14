const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listLaunchFocusAreasController,
  getLaunchFocusAreaByIdController,
  createLaunchFocusAreaController,
  updateLaunchFocusAreaController,
  deleteLaunchFocusAreaController,
} = require("../../controllers/adminController/launchFocusAreaController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "launch-focus-areas.view" }), listLaunchFocusAreasController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "launch-focus-areas.view" }), getLaunchFocusAreaByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "launch-focus-areas.edit" }), createLaunchFocusAreaController);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "launch-focus-areas.edit" }),
  updateLaunchFocusAreaController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "launch-focus-areas.delete" }),
  deleteLaunchFocusAreaController
);

module.exports = router;
