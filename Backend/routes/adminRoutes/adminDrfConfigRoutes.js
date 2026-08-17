const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getDrfConfigController,
  listDrfSectionsController,
  getDrfSectionByIdController,
  createDrfSectionController,
  updateDrfSectionController,
  deleteDrfSectionController,
  listDrfSectionQuestionsController,
  createDrfSectionQuestionController,
  updateDrfSectionQuestionController,
  deleteDrfSectionQuestionController,
} = require("../../controllers/adminController/drfConfigController");

const router = express.Router();

const view = authorizeStaff("console.cf.view", { admin: "drf-config.view" });
const write = authorizeStaff("console.cf.edit", { admin: "drf-config.edit" });
const remove = authorizeStaff("console.cf.edit", { admin: "drf-config.delete" });

router.get("/", protectAccount, view, getDrfConfigController);
router.get("/sections", protectAccount, view, listDrfSectionsController);
router.post("/sections", protectAccount, write, createDrfSectionController);
router.get("/sections/:id", protectAccount, view, getDrfSectionByIdController);
router.patch("/sections/:id", protectAccount, write, updateDrfSectionController);
router.delete("/sections/:id", protectAccount, remove, deleteDrfSectionController);

router.get("/sections/:sectionId/questions", protectAccount, view, listDrfSectionQuestionsController);
router.post("/sections/:sectionId/questions", protectAccount, write, createDrfSectionQuestionController);
router.patch("/sections/:sectionId/questions/:id", protectAccount, write, updateDrfSectionQuestionController);
router.delete("/sections/:sectionId/questions/:id", protectAccount, remove, deleteDrfSectionQuestionController);

module.exports = router;
