const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalChallengeFiles } = require("../../middleware/authMultipart");
const {
  listChallengesController,
  getChallengeByIdController,
  createChallengeController,
  updateChallengeController,
  deleteChallengeController,
  listChallengeEnrollmentsController,
  assignEnrollmentController,
  listChallengeGroupsController,
  createChallengeGroupController,
  updateChallengeGroupController,
  deleteChallengeGroupController,
  runChallengeLifecycleJobController,
} = require("../../controllers/adminController/challengeController");

const router = express.Router();

router.get(
  "/",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: ["challenges.edit", "challenges.delete"] }),
  listChallengesController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "challenges.edit" }),
  optionalChallengeFiles,
  createChallengeController
);
router.post(
  "/jobs/run",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "challenges.edit" }),
  runChallengeLifecycleJobController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: ["challenges.edit", "challenges.delete"] }),
  getChallengeByIdController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "challenges.edit" }),
  optionalChallengeFiles,
  updateChallengeController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "challenges.delete" }),
  deleteChallengeController
);

router.get(
  "/:id/enrollments",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: ["challenges.edit", "challenges.delete"] }),
  listChallengeEnrollmentsController
);
router.patch(
  "/:id/enrollments/:enrollmentId",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "challenges.edit" }),
  assignEnrollmentController
);

router.get(
  "/:id/groups",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: ["challenges.edit", "challenges.delete"] }),
  listChallengeGroupsController
);
router.post(
  "/:id/groups",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "challenges.edit" }),
  createChallengeGroupController
);
router.patch(
  "/:id/groups/:groupId",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "challenges.edit" }),
  updateChallengeGroupController
);
router.delete(
  "/:id/groups/:groupId",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "challenges.delete" }),
  deleteChallengeGroupController
);

module.exports = router;
