const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listAdminInboxController,
  getAdminInboxUnreadCountController,
  markAdminInboxItemReadController,
  markAllAdminInboxReadController,
  getAdminInboxItemController,
} = require("../../controllers/adminController/adminInboxController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", listAdminInboxController);
router.get("/unread-count", getAdminInboxUnreadCountController);
router.post("/read-all", markAllAdminInboxReadController);
router.get("/:id", getAdminInboxItemController);
router.patch("/:id/read", markAdminInboxItemReadController);

module.exports = router;
