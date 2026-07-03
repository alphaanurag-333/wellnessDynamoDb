const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  listUserRealPeopleTestimonialsController,
  getUserRealPeopleTestimonialByIdController,
  createUserRealPeopleTestimonialController,
  updateUserRealPeopleTestimonialController,
  deleteUserRealPeopleTestimonialController,
} = require("../../controllers/userController/realPeopleTestimonialController");

const router = express.Router();

router.get("/", protectUser, listUserRealPeopleTestimonialsController);
router.get("/:id", protectUser, getUserRealPeopleTestimonialByIdController);
router.post("/", protectUser, createUserRealPeopleTestimonialController);
router.patch("/:id", protectUser, updateUserRealPeopleTestimonialController);
router.delete("/:id", protectUser, deleteUserRealPeopleTestimonialController);

module.exports = router;
