const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalVideoTestimonialsFiles } = require("../../middleware/authMultipart");
const {
  listVideoTestimonialsController,
  getVideoTestimonialByIdController,
  createVideoTestimonialController,
  updateVideoTestimonialController,
  deleteVideoTestimonialController,
} = require("../../controllers/adminController/videoTestimonialsController");

const router = express.Router();

router.get("/", protectAdmin, authorize("video-testimonials.view"), listVideoTestimonialsController);
router.get("/:id", protectAdmin, authorize("video-testimonials.view"), getVideoTestimonialByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("video-testimonials.edit"),
  optionalVideoTestimonialsFiles,
  createVideoTestimonialController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("video-testimonials.edit"),
  optionalVideoTestimonialsFiles,
  updateVideoTestimonialController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("video-testimonials.delete"),
  deleteVideoTestimonialController
);

module.exports = router;
