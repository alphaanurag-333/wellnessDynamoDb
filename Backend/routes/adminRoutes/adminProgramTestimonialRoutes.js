const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalProgramTestimonialFile } = require("../../middleware/authMultipart");
const {
  listProgramTestimonialsController,
  getProgramTestimonialByIdController,
  createProgramTestimonialController,
  updateProgramTestimonialController,
  deleteProgramTestimonialController,
} = require("../../controllers/adminController/programTestimonialController");

const router = express.Router();

router.get("/", protectAdmin, authorize("program-testimonials.view"), listProgramTestimonialsController);
router.get(
  "/:id",
  protectAdmin,
  authorize("program-testimonials.view"),
  getProgramTestimonialByIdController
);
router.post(
  "/",
  protectAdmin,
  authorize("program-testimonials.edit"),
  optionalProgramTestimonialFile,
  createProgramTestimonialController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("program-testimonials.edit"),
  optionalProgramTestimonialFile,
  updateProgramTestimonialController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("program-testimonials.delete"),
  deleteProgramTestimonialController
);

module.exports = router;
