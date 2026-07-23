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
  authorize("client-testimonials.view"),
  listCoachPendingClientTestimonialsController
);
router.get(
  "/",
  protectWellnessCoach,
  authorize("client-testimonials.view"),
  listCoachClientTestimonialsController
);
router.get(
  "/:id",
  protectWellnessCoach,
  authorize("client-testimonials.view"),
  getCoachClientTestimonialByIdController
);
router.patch(
  "/:id",
  protectWellnessCoach,
  authorize("client-testimonials.view"),
  updateCoachClientTestimonialController
);
router.delete(
  "/:id",
  protectWellnessCoach,
  authorize("client-testimonials.view"),
  deleteCoachClientTestimonialController
);

module.exports = router;
