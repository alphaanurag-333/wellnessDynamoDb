const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantRealPeopleTestimonialsController,
  listAssistantPendingRealPeopleTestimonialsController,
  getAssistantRealPeopleTestimonialByIdController,
  reviewAssistantRealPeopleTestimonialController,
  updateAssistantRealPeopleTestimonialController,
  deleteAssistantRealPeopleTestimonialController,
} = require("../../controllers/assistantWellnessCoachController/realPeopleTestimonialController");

const router = express.Router();

router.get("/", protectAssistantWellnessCoach, listAssistantRealPeopleTestimonialsController);
router.get("/pending", protectAssistantWellnessCoach, listAssistantPendingRealPeopleTestimonialsController);
router.get("/:id", protectAssistantWellnessCoach, getAssistantRealPeopleTestimonialByIdController);
router.patch("/:id/review", protectAssistantWellnessCoach, reviewAssistantRealPeopleTestimonialController);
router.patch("/:id", protectAssistantWellnessCoach, updateAssistantRealPeopleTestimonialController);
router.delete("/:id", protectAssistantWellnessCoach, deleteAssistantRealPeopleTestimonialController);

module.exports = router;
