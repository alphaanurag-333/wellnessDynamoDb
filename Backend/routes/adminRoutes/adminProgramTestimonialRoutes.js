const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalProgramTestimonialFile } = require("../../middleware/authMultipart");
const {
  listProgramTestimonialsController,
  getProgramTestimonialByIdController,
  createProgramTestimonialController,
  updateProgramTestimonialController,
  deleteProgramTestimonialController,
  reorderProgramTestimonialsController,
} = require("../../controllers/adminController/programTestimonialController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "program-testimonials.view" }), listProgramTestimonialsController);
router.put(
  "/reorder",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "program-testimonials.edit" }),
  reorderProgramTestimonialsController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.view", { admin: "program-testimonials.view" }),
  getProgramTestimonialByIdController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "program-testimonials.edit" }),
  optionalProgramTestimonialFile,
  createProgramTestimonialController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "program-testimonials.edit" }),
  optionalProgramTestimonialFile,
  updateProgramTestimonialController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.delete", { admin: "program-testimonials.delete" }),
  deleteProgramTestimonialController
);

module.exports = router;
