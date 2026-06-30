const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalMentalWellbeingFile } = require("../../middleware/authMultipart");
const {
  listMentalWellbeingController,
  getMentalWellbeingByIdController,
  createMentalWellbeingController,
  updateMentalWellbeingController,
  deleteMentalWellbeingController,
} = require("../../controllers/adminController/mentalWellbeingController");

const router = express.Router();

router.get("/", protectAdmin, listMentalWellbeingController);
router.get("/:id", protectAdmin, getMentalWellbeingByIdController);
router.post("/", protectAdmin, optionalMentalWellbeingFile, createMentalWellbeingController);
router.patch("/:id", protectAdmin, optionalMentalWellbeingFile, updateMentalWellbeingController);
router.delete("/:id", protectAdmin, deleteMentalWellbeingController);

module.exports = router;
