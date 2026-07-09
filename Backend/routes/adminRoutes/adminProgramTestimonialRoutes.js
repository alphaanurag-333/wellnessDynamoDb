const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalProgramTestimonialFile } = require("../../middleware/authMultipart");
const {
  listProgramTestimonialsController,
  getProgramTestimonialByIdController,
  createProgramTestimonialController,
  updateProgramTestimonialController,
  deleteProgramTestimonialController,
} = require("../../controllers/adminController/programTestimonialController");

const router = express.Router();

router.get("/", protectAdmin, listProgramTestimonialsController);
router.get("/:id", protectAdmin, getProgramTestimonialByIdController);
router.post("/", protectAdmin, optionalProgramTestimonialFile, createProgramTestimonialController);
router.patch("/:id", protectAdmin, optionalProgramTestimonialFile, updateProgramTestimonialController);
router.delete("/:id", protectAdmin, deleteProgramTestimonialController);

module.exports = router;
