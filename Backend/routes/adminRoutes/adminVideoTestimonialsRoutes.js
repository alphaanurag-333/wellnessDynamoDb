const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalVideoTestimonialsFiles } = require("../../middleware/authMultipart");
const {
  listVideoTestimonialsController,
  getVideoTestimonialByIdController,
  createVideoTestimonialController,
  updateVideoTestimonialController,
  deleteVideoTestimonialController,
} = require("../../controllers/adminController/videoTestimonialsController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "video-testimonials.view" }), listVideoTestimonialsController);
router.get("/:id", protectAccount, authorizeStaff("console.ct.view", { admin: "video-testimonials.view" }), getVideoTestimonialByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "video-testimonials.edit" }),
  optionalVideoTestimonialsFiles,
  createVideoTestimonialController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "video-testimonials.edit" }),
  optionalVideoTestimonialsFiles,
  updateVideoTestimonialController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.delete", { admin: "video-testimonials.delete" }),
  deleteVideoTestimonialController
);

module.exports = router;
