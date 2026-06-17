const express = require("express");
const {
  listActiveSpecializations,
} = require("../../controllers/wellnessCoachController/specializationController");

const router = express.Router();

router.get("/", listActiveSpecializations);

module.exports = router;
