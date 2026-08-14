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
const {
  listCoachMonthlyChampionPostsController,
  getCoachMonthlyChampionPostByIdController,
} = require("../../controllers/staff/monthlyChampionController");
const { resolveStaffActor } = require("../../controllers/staffAccess");

const router = express.Router();
router.use(protectAccount);

const view = authorizeStaff("console.ct.view", {
  admin: "monthly-champions.view",
  wellness_coach: "nav.monthly-champions",
  assistant_wellness_coach: "nav.monthly-champions",
  trainee: "nav.monthly-champions",
  support: "console.ct.view",
});

function listByRole(req, res, next) {
  try {
    const actor = resolveStaffActor(req);
    if (actor.role === "admin" || actor.role === "support") {
      return listMonthlyChampionPostsController(req, res, next);
    }
    return listCoachMonthlyChampionPostsController(req, res, next);
  } catch (err) {
    return next(err);
  }
}

function getByRole(req, res, next) {
  try {
    const actor = resolveStaffActor(req);
    if (actor.role === "admin" || actor.role === "support") {
      return getMonthlyChampionPostByIdController(req, res, next);
    }
    return getCoachMonthlyChampionPostByIdController(req, res, next);
  } catch (err) {
    return next(err);
  }
}

router.get("/", view, listByRole);
router.post(
  "/jobs/run",
  authorizeStaff("console.ct.create", { admin: "monthly-champions.edit" }),
  runMonthlyChampionJobController
);
router.get("/:id", view, getByRole);
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
