const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listLaunchFocusAreasController,
  getLaunchFocusAreaByIdController,
  createLaunchFocusAreaController,
  updateLaunchFocusAreaController,
  deleteLaunchFocusAreaController,
} = require("../../controllers/adminController/launchFocusAreaController");

const router = express.Router();

router.get("/", protectAdmin, authorize("launch-focus-areas.view"), listLaunchFocusAreasController);
router.get("/:id", protectAdmin, authorize("launch-focus-areas.view"), getLaunchFocusAreaByIdController);
router.post("/", protectAdmin, authorize("launch-focus-areas.edit"), createLaunchFocusAreaController);
router.patch(
  "/:id",
  protectAdmin,
  authorize("launch-focus-areas.edit"),
  updateLaunchFocusAreaController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("launch-focus-areas.delete"),
  deleteLaunchFocusAreaController
);

module.exports = router;
