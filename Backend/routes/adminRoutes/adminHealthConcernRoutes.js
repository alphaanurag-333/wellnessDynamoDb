const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalHealthConcernFile } = require("../../middleware/authMultipart");
const {
  listHealthConcernsController,
  getHealthConcernByIdController,
  createHealthConcernController,
  updateHealthConcernController,
  deleteHealthConcernController,
} = require("../../controllers/adminController/healthConcernController");

const router = express.Router();

router.get("/", protectAdmin, authorize("health-concerns.view"), listHealthConcernsController);
router.get("/:id", protectAdmin, authorize("health-concerns.view"), getHealthConcernByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("health-concerns.edit"),
  optionalHealthConcernFile,
  createHealthConcernController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("health-concerns.edit"),
  optionalHealthConcernFile,
  updateHealthConcernController
);
router.delete("/:id", protectAdmin, authorize("health-concerns.delete"), deleteHealthConcernController);

module.exports = router;
