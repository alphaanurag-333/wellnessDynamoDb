const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { getMyProtocolSettingsController } = require("../../controllers/userController/protocolSettingsController");

const router = express.Router();

router.use(protectUser);
router.get("/", getMyProtocolSettingsController);

module.exports = router;
