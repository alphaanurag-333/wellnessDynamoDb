const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listConfigDropdownsController,
  getConfigDropdownController,
  createConfigDropdownController,
  updateConfigDropdownController,
  deleteConfigDropdownController,
  addConfigDropdownOptionController,
  updateConfigDropdownOptionController,
  deleteConfigDropdownOptionController,
} = require("../../controllers/adminController/configDropdownController");

const router = express.Router();

const view = authorizeStaff("console.cf.view", { admin: "faq.view" });
const write = authorizeStaff("console.cf.edit", { admin: "faq.edit" });
const remove = authorizeStaff("console.cf.delete", { admin: "faq.delete" });

router.get("/", protectAccount, view, listConfigDropdownsController);
router.post("/", protectAccount, write, createConfigDropdownController);
router.post("/:id/options", protectAccount, write, addConfigDropdownOptionController);
router.patch("/:id/options/:optionId", protectAccount, write, updateConfigDropdownOptionController);
router.delete("/:id/options/:optionId", protectAccount, remove, deleteConfigDropdownOptionController);
router.get("/:id", protectAccount, view, getConfigDropdownController);
router.patch("/:id", protectAccount, write, updateConfigDropdownController);
router.delete("/:id", protectAccount, remove, deleteConfigDropdownController);

module.exports = router;
