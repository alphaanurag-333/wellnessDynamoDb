const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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
  protectAccount,
  authorizeStaff("console.ct.view", { admin: "real-people-testimonials.view" }),
  listRealPeopleTestimonialsController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.view", { admin: "real-people-testimonials.view" }),
  getRealPeopleTestimonialByIdController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "real-people-testimonials.edit" }),
  optionalRealPeopleTestimonialFile,
  createRealPeopleTestimonialController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "real-people-testimonials.edit" }),
  optionalRealPeopleTestimonialFile,
  updateRealPeopleTestimonialController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.delete", { admin: "real-people-testimonials.delete" }),
  deleteRealPeopleTestimonialController
);

module.exports = router;
