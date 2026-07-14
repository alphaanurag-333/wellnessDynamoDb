const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalClientTestimonialsFile } = require("../../middleware/authMultipart");
const {
  listClientTestimonialsController,
  getClientTestimonialByIdController,
  createClientTestimonialController,
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
router.post(
  "/",
  protectAdmin,
  authorize("client-testimonials.edit"),
  optionalClientTestimonialsFile,
  createClientTestimonialController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("client-testimonials.edit"),
  optionalClientTestimonialsFile,
  updateClientTestimonialController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("client-testimonials.delete"),
  deleteClientTestimonialController
);

module.exports = router;
