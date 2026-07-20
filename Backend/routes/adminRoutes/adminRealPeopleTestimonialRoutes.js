const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalRealPeopleTestimonialFile } = require("../../middleware/authMultipart");
const {
  listRealPeopleTestimonialsController,
  getRealPeopleTestimonialByIdController,
  createRealPeopleTestimonialController,
  updateRealPeopleTestimonialController,
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
  optionalRealPeopleTestimonialFile,
  createRealPeopleTestimonialController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("real-people-testimonials.edit"),
  optionalRealPeopleTestimonialFile,
  updateRealPeopleTestimonialController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("real-people-testimonials.delete"),
  deleteRealPeopleTestimonialController
);

module.exports = router;
