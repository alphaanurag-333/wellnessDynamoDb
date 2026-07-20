const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantClientTestimonialsController,
  listAssistantPendingClientTestimonialsController,
  getAssistantClientTestimonialByIdController,
  updateAssistantClientTestimonialController,
  deleteAssistantClientTestimonialController,
} = require("../../controllers/wellnessCoachController/clientTestimonialController");

const router = express.Router();

router.get("/pending", protectAssistantWellnessCoach, listAssistantPendingClientTestimonialsController);
router.get("/", protectAssistantWellnessCoach, listAssistantClientTestimonialsController);
router.get("/:id", protectAssistantWellnessCoach, getAssistantClientTestimonialByIdController);
router.patch("/:id", protectAssistantWellnessCoach, updateAssistantClientTestimonialController);
router.delete("/:id", protectAssistantWellnessCoach, deleteAssistantClientTestimonialController);

module.exports = router;
