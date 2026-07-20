const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachClientTestimonialsController,
  listCoachPendingClientTestimonialsController,
  getCoachClientTestimonialByIdController,
  updateCoachClientTestimonialController,
  deleteCoachClientTestimonialController,
} = require("../../controllers/wellnessCoachController/clientTestimonialController");

const router = express.Router();

router.get(
  "/pending",
  protectWellnessCoach,
  authorize("nav.client-testimonials"),
  listCoachPendingClientTestimonialsController
);
router.get(
  "/",
  protectWellnessCoach,
  authorize("nav.client-testimonials"),
  listCoachClientTestimonialsController
);
router.get(
  "/:id",
  protectWellnessCoach,
  authorize("nav.client-testimonials"),
  getCoachClientTestimonialByIdController
);
router.patch(
  "/:id",
  protectWellnessCoach,
  authorize("nav.client-testimonials"),
  updateCoachClientTestimonialController
);
router.delete(
  "/:id",
  protectWellnessCoach,
  authorize("nav.client-testimonials"),
  deleteCoachClientTestimonialController
);

module.exports = router;
