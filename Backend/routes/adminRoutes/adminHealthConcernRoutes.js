const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalHealthConcernFile } = require("../../middleware/authMultipart");
const {
  listHealthConcernsController,
  getHealthConcernByIdController,
  createHealthConcernController,
  updateHealthConcernController,
  reorderHealthConcernsController,
  deleteHealthConcernController,
} = require("../../controllers/adminController/healthConcernController");

const router = express.Router();

router.get(
  "/",
  protectAccount,
  authorizeStaff(["console.cf.view", "console.dash.view"], { admin: "health-concerns.view" }),
  listHealthConcernsController
);
router.put(
  "/reorder",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "health-concerns.edit" }),
  reorderHealthConcernsController
);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "health-concerns.view" }), getHealthConcernByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "health-concerns.edit" }),
  optionalHealthConcernFile,
  createHealthConcernController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "health-concerns.edit" }),
  optionalHealthConcernFile,
  updateHealthConcernController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "health-concerns.delete" }), deleteHealthConcernController);

module.exports = router;
