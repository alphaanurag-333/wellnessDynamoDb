const express = require("express");
const {
  listActiveSpecializations,
} = require("../../controllers/staff/specializationController");

const router = express.Router();

router.get("/", listActiveSpecializations);

module.exports = router;
