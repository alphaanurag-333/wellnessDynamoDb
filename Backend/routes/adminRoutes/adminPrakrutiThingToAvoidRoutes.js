const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listPrakrutiThingsToAvoidController,
  getPrakrutiThingToAvoidByIdController,
  createPrakrutiThingToAvoidController,
  updatePrakrutiThingToAvoidController,
  deletePrakrutiThingToAvoidController,
} = require("../../controllers/adminController/prakrutiThingToAvoidController");

const router = express.Router();

router.get("/", protectAdmin, listPrakrutiThingsToAvoidController);
router.get("/:id", protectAdmin, getPrakrutiThingToAvoidByIdController);
router.post("/", protectAdmin, createPrakrutiThingToAvoidController);
router.patch("/:id", protectAdmin, updatePrakrutiThingToAvoidController);
router.delete("/:id", protectAdmin, deletePrakrutiThingToAvoidController);

module.exports = router;
