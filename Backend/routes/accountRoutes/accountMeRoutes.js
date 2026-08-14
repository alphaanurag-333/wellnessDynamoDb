const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { getCoachPermissionsController } = require("../../controllers/staff/permissionsController");

const router = express.Router();

router.get("/permissions", protectAccount, getCoachPermissionsController);

module.exports = router;
