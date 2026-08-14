const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listClientTestimonialsController,
  getClientTestimonialByIdController,
  updateClientTestimonialController,
  deleteClientTestimonialController,
} = require("../../controllers/adminController/clientTestimonialsController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "client-testimonials.view" }), listClientTestimonialsController);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.view", { admin: "client-testimonials.view" }),
  getClientTestimonialByIdController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "client-testimonials.edit" }),
  updateClientTestimonialController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.delete", { admin: "client-testimonials.delete" }),
  deleteClientTestimonialController
);

module.exports = router;
