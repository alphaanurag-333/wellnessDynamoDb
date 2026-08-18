const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalSupplementFile } = require("../../middleware/authMultipart");
const {
  listSupplementsController,
  getSupplementByIdController,
  createSupplementController,
  updateSupplementController,
  deleteSupplementController,
} = require("../../controllers/adminController/supplementController");

const router = express.Router();

const catalogRead = authorizeStaff(["console.cf.view", "console.diet.view"], {
  admin: "supplements.view",
  wellness_coach: "clientTab.wellness.supplement-recommendations",
  assistant_wellness_coach: "clientTab.wellness.supplement-recommendations",
  trainee: "clientTab.wellness.supplement-recommendations",
});

router.get("/", protectAccount, catalogRead, listSupplementsController);
router.get("/:id", protectAccount, catalogRead, getSupplementByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "supplements.edit" }),
  optionalSupplementFile,
  createSupplementController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "supplements.edit" }),
  optionalSupplementFile,
  updateSupplementController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "supplements.delete" }), deleteSupplementController);

module.exports = router;
