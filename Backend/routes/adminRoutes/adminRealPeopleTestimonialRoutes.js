const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listRealPeopleTestimonialsController,
  getRealPeopleTestimonialByIdController,
  createRealPeopleTestimonialController,
  updateRealPeopleTestimonialController,
  approveRealPeopleTestimonialController,
  deleteRealPeopleTestimonialController,
} = require("../../controllers/adminController/realPeopleTestimonialController");

const router = express.Router();

router.get("/", protectAdmin, listRealPeopleTestimonialsController);
router.get("/:id", protectAdmin, getRealPeopleTestimonialByIdController);
router.post("/", protectAdmin, createRealPeopleTestimonialController);
router.patch("/:id/review", protectAdmin, approveRealPeopleTestimonialController);
router.patch("/:id", protectAdmin, updateRealPeopleTestimonialController);
router.delete("/:id", protectAdmin, deleteRealPeopleTestimonialController);

module.exports = router;
