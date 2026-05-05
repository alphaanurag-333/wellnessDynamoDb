const express = require("express");
const adminAuthRoutes = require("./adminRoutes/adminAuthRoutes");
const adminAppConfigRoutes = require("./adminRoutes/adminAppConfigRoutes");
const publicAppConfigRoutes = require("./publicRoutes/publicAppConfigRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true });
});

router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/app-config", adminAppConfigRoutes);
router.use("/public", publicAppConfigRoutes);

module.exports = router;
