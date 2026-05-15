const express = require("express");
const {
  getActiveBanners,
  getActiveFaqs,
  getStaticPageBySlug,
  getActiveClientTestimonials,
  getActiveVideoTestimonials,
  getActiveHealthConcerns,
  getActiveHealthTools,
  getActiveHealthRecipes,
  getActiveTransformations,
  getActiveCelebrationBanners,
} = require("../../controllers/userController/miscController");

const router = express.Router();

router.get("/banners", getActiveBanners);
router.get("/faqs", getActiveFaqs);
router.get("/pages/:slug", getStaticPageBySlug);
router.get("/client-testimonials", getActiveClientTestimonials);
router.get("/video-testimonials", getActiveVideoTestimonials);
router.get("/health-concerns", getActiveHealthConcerns);
router.get("/health-tools", getActiveHealthTools);
router.get("/health-recipes", getActiveHealthRecipes);
router.get("/transformations", getActiveTransformations);
router.get("/celebration-banners", getActiveCelebrationBanners);

module.exports = router;
