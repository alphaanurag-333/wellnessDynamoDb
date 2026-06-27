const express = require("express");
const {
  getActiveBanners,
  getActiveFaqs,
  getStaticPageBySlug,
  getActiveClientTestimonials,
  getActiveVideoTestimonials,
  getCofounderMessage,
  getActiveHealthConcerns,
  getActiveHealthDisorders,
  getActiveHealthTools,
  getActiveHealthRecipes,
  getActiveYoga,
  getActiveTransformations,
  getActiveBirthdayPosts,
} = require("../../controllers/userController/miscController");

const router = express.Router();

router.get("/banners", getActiveBanners);
router.get("/faqs", getActiveFaqs);
router.get("/pages/:slug", getStaticPageBySlug);
router.get("/client-testimonials", getActiveClientTestimonials);
router.get("/video-testimonials", getActiveVideoTestimonials);
router.get("/cofounder-message", getCofounderMessage);
router.get("/health-concerns", getActiveHealthConcerns);
router.get("/health-disorders", getActiveHealthDisorders);
router.get("/health-tools", getActiveHealthTools);
router.get("/health-recipes", getActiveHealthRecipes);
router.get("/yoga", getActiveYoga);
router.get("/transformations", getActiveTransformations);
router.get("/birthday-posts", getActiveBirthdayPosts);

module.exports = router;
