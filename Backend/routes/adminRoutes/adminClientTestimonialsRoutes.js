const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listClientTestimonialsController,
  getClientTestimonialByIdController,
  updateClientTestimonialController,
  deleteClientTestimonialController,
} = require("../../controllers/adminController/clientTestimonialsController");

const router = express.Router();

router.get("/", protectAdmin, authorize("client-testimonials.view"), listClientTestimonialsController);
router.get(
  "/:id",
  protectAdmin,
  authorize("client-testimonials.view"),
  getClientTestimonialByIdController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("client-testimonials.edit"),
  updateClientTestimonialController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("client-testimonials.delete"),
  deleteClientTestimonialController
);

module.exports = router;
