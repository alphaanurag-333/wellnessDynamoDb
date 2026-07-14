const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listRealPeopleTestimonialsController,
  getRealPeopleTestimonialByIdController,
  createRealPeopleTestimonialController,
  updateRealPeopleTestimonialController,
  approveRealPeopleTestimonialController,
  deleteRealPeopleTestimonialController,
} = require("../../controllers/adminController/realPeopleTestimonialController");

const router = express.Router();

router.get(
  "/",
  protectAdmin,
  authorize("real-people-testimonials.view"),
  listRealPeopleTestimonialsController
);
router.get(
  "/:id",
  protectAdmin,
  authorize("real-people-testimonials.view"),
  getRealPeopleTestimonialByIdController
);
router.post(
  "/",
  protectAdmin,
  authorize("real-people-testimonials.edit"),
  createRealPeopleTestimonialController
);
router.patch(
  "/:id/review",
  protectAdmin,
  authorize("real-people-testimonials.edit"),
  approveRealPeopleTestimonialController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("real-people-testimonials.edit"),
  updateRealPeopleTestimonialController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("real-people-testimonials.delete"),
  deleteRealPeopleTestimonialController
);

module.exports = router;
