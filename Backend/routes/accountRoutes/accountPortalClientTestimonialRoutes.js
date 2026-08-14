const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listCoachClientTestimonialsController,
  listCoachPendingClientTestimonialsController,
  getCoachClientTestimonialByIdController,
  updateCoachClientTestimonialController,
  deleteCoachClientTestimonialController,
} = require("../../controllers/adminController/clientTestimonialController");

const router = express.Router();
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

const view = authorizeStaff("console.ct.view", {
  admin: "client-testimonials.view",
  wellness_coach: "nav.client-testimonials",
  assistant_wellness_coach: "nav.client-testimonials",
  trainee: "nav.client-testimonials",
  support: "console.ct.view",
});
const write = authorizeStaff("console.ct.edit", {
  admin: "client-testimonials.edit",
  wellness_coach: "nav.client-testimonials",
  assistant_wellness_coach: "nav.client-testimonials",
  support: "console.ct.edit",
});

router.get("/pending", view, listCoachPendingClientTestimonialsController);
router.get("/", view, listCoachClientTestimonialsController);
router.get("/:id", view, getCoachClientTestimonialByIdController);
router.patch("/:id", write, updateCoachClientTestimonialController);
router.delete(
  "/:id",
  authorizeStaff("console.ct.delete", {
    admin: "client-testimonials.delete",
    wellness_coach: "nav.client-testimonials",
    support: "console.ct.delete",
  }),
  deleteCoachClientTestimonialController
);

module.exports = router;
