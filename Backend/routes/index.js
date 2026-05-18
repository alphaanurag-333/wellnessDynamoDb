const express = require("express");
const adminAuthRoutes = require("./adminRoutes/adminAuthRoutes");
const adminAppConfigRoutes = require("./adminRoutes/adminAppConfigRoutes");
const adminFaqRoutes = require("./adminRoutes/adminFaqRoutes");
const adminCouponRoutes = require("./adminRoutes/adminCouponRoutes");
const adminNotificationRoutes = require("./adminRoutes/adminNotificationRoutes");
const adminStaticPageRoutes = require("./adminRoutes/adminStaticPageRoutes");
const adminTransformationRoutes = require("./adminRoutes/adminTransformationRoutes");
const adminBannerRoutes = require("./adminRoutes/adminBannerRoutes");
const adminHealthConcernRoutes = require("./adminRoutes/adminHealthConcernRoutes");
const adminHealthDisorderRoutes = require("./adminRoutes/adminHealthDisorderRoutes");
const adminHealthToolRoutes = require("./adminRoutes/adminHealthToolRoutes");
const adminHealthRecipeRoutes = require("./adminRoutes/adminHealthRecipeRoutes");
const adminYogaRoutes = require("./adminRoutes/adminYogaRoutes");
const adminUserRoutes = require("./adminRoutes/adminUserRoutes");
const adminWellnessCoachRoutes = require("./adminRoutes/adminWellnessCoachRoutes");
const adminCelebrationRoutes = require("./adminRoutes/adminCelebrationRoutes");
const adminClientTestimonialsRoutes = require("./adminRoutes/adminClientTestimonialsRoutes");
const adminVideoTestimonialsRoutes = require("./adminRoutes/adminVideoTestimonialsRoutes");
const publicAppConfigRoutes = require("./publicRoutes/publicAppConfigRoutes");
const miscRoutes = require("./userRoutes/miscRoutes");
const userAuthRoutes = require("./userRoutes/authRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true });
});

router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/app-config", adminAppConfigRoutes);
router.use("/admin/faq", adminFaqRoutes);
router.use("/admin/coupons", adminCouponRoutes);
router.use("/admin/notifications", adminNotificationRoutes);
router.use("/admin/transformations", adminTransformationRoutes);
router.use("/admin/banners", adminBannerRoutes);
router.use("/admin/celebration-banners", adminCelebrationRoutes);
router.use("/admin/client-testimonials", adminClientTestimonialsRoutes);
router.use("/admin/video-testimonials", adminVideoTestimonialsRoutes);
router.use("/admin/health-concerns", adminHealthConcernRoutes);
router.use("/admin/health-disorders", adminHealthDisorderRoutes);
router.use("/admin/health-tools", adminHealthToolRoutes);
router.use("/admin/health-recipes", adminHealthRecipeRoutes);
router.use("/admin/yoga", adminYogaRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/wellness-coaches", adminWellnessCoachRoutes);
router.use("/admin/misc/pages", adminStaticPageRoutes);
router.use("/user/auth", userAuthRoutes);
router.use("/public", publicAppConfigRoutes);
router.use("/public/misc", miscRoutes);

module.exports = router;