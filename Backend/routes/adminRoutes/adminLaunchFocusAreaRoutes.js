const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listLaunchFocusAreasController,
  getLaunchFocusAreaByIdController,
  createLaunchFocusAreaController,
  updateLaunchFocusAreaController,
  deleteLaunchFocusAreaController,
} = require("../../controllers/adminController/launchFocusAreaController");

const router = express.Router();

router.get("/", protectAdmin, listLaunchFocusAreasController);
router.get("/:id", protectAdmin, getLaunchFocusAreaByIdController);
router.post("/", protectAdmin, createLaunchFocusAreaController);
router.patch("/:id", protectAdmin, updateLaunchFocusAreaController);
router.delete("/:id", protectAdmin, deleteLaunchFocusAreaController);

module.exports = router;
