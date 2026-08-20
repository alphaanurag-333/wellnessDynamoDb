const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listAdminInboxController,
  getAdminInboxUnreadCountController,
  markAdminInboxItemReadController,
  markAllAdminInboxReadController,
  getAdminInboxItemController,
} = require("../../controllers/adminController/adminInboxController");

const router = express.Router();

router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES, "support"));

router.get("/", listAdminInboxController);
router.get("/unread-count", getAdminInboxUnreadCountController);
router.post("/read-all", markAllAdminInboxReadController);
router.get("/:id", getAdminInboxItemController);
router.patch("/:id/read", markAdminInboxItemReadController);

module.exports = router;
