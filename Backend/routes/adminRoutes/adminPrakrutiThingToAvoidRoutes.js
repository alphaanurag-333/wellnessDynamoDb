const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "prakruti-things-to-avoid.view" }),
  listPrakrutiThingsToAvoidController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "prakruti-things-to-avoid.view" }),
  getPrakrutiThingToAvoidByIdController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "prakruti-things-to-avoid.edit" }),
  createPrakrutiThingToAvoidController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "prakruti-things-to-avoid.edit" }),
  updatePrakrutiThingToAvoidController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "prakruti-things-to-avoid.delete" }),
  deletePrakrutiThingToAvoidController
);

module.exports = router;
