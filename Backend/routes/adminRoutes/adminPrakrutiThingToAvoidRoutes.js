const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listPrakrutiThingsToAvoidController,
  getPrakrutiThingToAvoidByIdController,
  createPrakrutiThingToAvoidController,
  updatePrakrutiThingToAvoidController,
  deletePrakrutiThingToAvoidController,
} = require("../../controllers/adminController/prakrutiThingToAvoidController");

const router = express.Router();

router.get(
  "/",
  protectAdmin,
  authorize("prakruti-things-to-avoid.view"),
  listPrakrutiThingsToAvoidController
);
router.get(
  "/:id",
  protectAdmin,
  authorize("prakruti-things-to-avoid.view"),
  getPrakrutiThingToAvoidByIdController
);
router.post(
  "/",
  protectAdmin,
  authorize("prakruti-things-to-avoid.edit"),
  createPrakrutiThingToAvoidController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("prakruti-things-to-avoid.edit"),
  updatePrakrutiThingToAvoidController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("prakruti-things-to-avoid.delete"),
  deletePrakrutiThingToAvoidController
);

module.exports = router;
