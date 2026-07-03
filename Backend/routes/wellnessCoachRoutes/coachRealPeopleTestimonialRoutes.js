const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachRealPeopleTestimonialsController,
  listCoachPendingRealPeopleTestimonialsController,
  getCoachRealPeopleTestimonialByIdController,
  reviewCoachRealPeopleTestimonialController,
  updateCoachRealPeopleTestimonialController,
  deleteCoachRealPeopleTestimonialController,
} = require("../../controllers/wellnessCoachController/realPeopleTestimonialController");

const router = express.Router();

router.get("/", protectWellnessCoach, listCoachRealPeopleTestimonialsController);
router.get("/pending", protectWellnessCoach, listCoachPendingRealPeopleTestimonialsController);
router.get("/:id", protectWellnessCoach, getCoachRealPeopleTestimonialByIdController);
router.patch("/:id/review", protectWellnessCoach, reviewCoachRealPeopleTestimonialController);
router.patch("/:id", protectWellnessCoach, updateCoachRealPeopleTestimonialController);
router.delete("/:id", protectWellnessCoach, deleteCoachRealPeopleTestimonialController);

module.exports = router;
