const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  listUserRealPeopleTestimonialsController,
  getUserRealPeopleTestimonialByIdController,
} = require("../../controllers/userController/realPeopleTestimonialController");

const router = express.Router();

router.get("/", protectUser, listUserRealPeopleTestimonialsController);
router.get("/:id", protectUser, getUserRealPeopleTestimonialByIdController);

module.exports = router;
