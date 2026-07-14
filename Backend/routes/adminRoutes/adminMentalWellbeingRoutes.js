const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalMentalWellbeingFile } = require("../../middleware/authMultipart");
const {
  listMentalWellbeingController,
  getMentalWellbeingByIdController,
  createMentalWellbeingController,
  updateMentalWellbeingController,
  deleteMentalWellbeingController,
} = require("../../controllers/adminController/mentalWellbeingController");

const router = express.Router();

router.get("/", protectAdmin, authorize("mental-wellbeing.view"), listMentalWellbeingController);
router.get("/:id", protectAdmin, authorize("mental-wellbeing.view"), getMentalWellbeingByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("mental-wellbeing.edit"),
  optionalMentalWellbeingFile,
  createMentalWellbeingController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("mental-wellbeing.edit"),
  optionalMentalWellbeingFile,
  updateMentalWellbeingController
);
router.delete("/:id", protectAdmin, authorize("mental-wellbeing.delete"), deleteMentalWellbeingController);

module.exports = router;
