const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  listUserClientTestimonialsController,
  getMyClientTestimonialController,
  getUserClientTestimonialByIdController,
  createUserClientTestimonialController,
  updateUserClientTestimonialController,
  deleteUserClientTestimonialController,
} = require("../../controllers/userController/clientTestimonialController");

const router = express.Router();

router.get("/", protectUser, listUserClientTestimonialsController);
router.get("/me", protectUser, getMyClientTestimonialController);
router.get("/:id", protectUser, getUserClientTestimonialByIdController);
router.post("/", protectUser, createUserClientTestimonialController);
router.patch("/:id", protectUser, updateUserClientTestimonialController);
router.delete("/:id", protectUser, deleteUserClientTestimonialController);

module.exports = router;
