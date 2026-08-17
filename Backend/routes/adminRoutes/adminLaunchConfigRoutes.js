const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getLaunchConfigController,
  scoreLaunchConfigController,
  listLaunchRatingsController,
  getLaunchRatingByIdController,
  createLaunchRatingController,
  updateLaunchRatingController,
  deleteLaunchRatingController,
  listLaunchDomainsController,
  getLaunchDomainByIdController,
  createLaunchDomainController,
  updateLaunchDomainController,
  deleteLaunchDomainController,
  listLaunchDomainQuestionsController,
  createLaunchDomainQuestionController,
  updateLaunchDomainQuestionController,
  deleteLaunchDomainQuestionController,
} = require("../../controllers/adminController/launchConfigController");

const router = express.Router();

const view = authorizeStaff("console.cf.view", { admin: "launch-config.view" });
const write = authorizeStaff("console.cf.edit", { admin: "launch-config.edit" });
const remove = authorizeStaff("console.cf.edit", { admin: "launch-config.delete" });

router.get("/", protectAccount, view, getLaunchConfigController);
router.post("/score", protectAccount, view, scoreLaunchConfigController);

router.get("/ratings", protectAccount, view, listLaunchRatingsController);
router.post("/ratings", protectAccount, write, createLaunchRatingController);
router.get("/ratings/:id", protectAccount, view, getLaunchRatingByIdController);
router.patch("/ratings/:id", protectAccount, write, updateLaunchRatingController);
router.delete("/ratings/:id", protectAccount, remove, deleteLaunchRatingController);

router.get("/domains", protectAccount, view, listLaunchDomainsController);
router.post("/domains", protectAccount, write, createLaunchDomainController);
router.get("/domains/:id", protectAccount, view, getLaunchDomainByIdController);
router.patch("/domains/:id", protectAccount, write, updateLaunchDomainController);
router.delete("/domains/:id", protectAccount, remove, deleteLaunchDomainController);

router.get("/domains/:domainId/questions", protectAccount, view, listLaunchDomainQuestionsController);
router.post("/domains/:domainId/questions", protectAccount, write, createLaunchDomainQuestionController);
router.patch("/domains/:domainId/questions/:id", protectAccount, write, updateLaunchDomainQuestionController);
router.delete("/domains/:domainId/questions/:id", protectAccount, remove, deleteLaunchDomainQuestionController);

module.exports = router;
