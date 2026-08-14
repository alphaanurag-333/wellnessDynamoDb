const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listMonthlyChampionPostsController,
  getMonthlyChampionPostByIdController,
  updateMonthlyChampionPostController,
  deleteMonthlyChampionPostCommentController,
  runMonthlyChampionJobController,
} = require("../../controllers/adminController/monthlyChampionController");

const router = express.Router();
router.use(protectAccount);

const view = authorizeStaff("console.ct.view", {
  admin: "monthly-champions.view",
  wellness_coach: "nav.monthly-champions",
  assistant_wellness_coach: "nav.monthly-champions",
  trainee: "nav.monthly-champions",
  support: "console.ct.view",
});

router.get("/", view, listMonthlyChampionPostsController);
router.post(
  "/jobs/run",
  authorizeStaff("console.ct.create", { admin: "monthly-champions.edit" }),
  runMonthlyChampionJobController
);
router.get("/:id", view, getMonthlyChampionPostByIdController);
router.patch(
  "/:id",
  authorizeStaff("console.ct.edit", { admin: "monthly-champions.edit" }),
  updateMonthlyChampionPostController
);
router.delete(
  "/:postId/comments/:commentId",
  authorizeStaff("console.ct.delete", { admin: "monthly-champions.delete" }),
  deleteMonthlyChampionPostCommentController
);

module.exports = router;
