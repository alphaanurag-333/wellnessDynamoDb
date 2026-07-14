const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize, authorizeAny } = require("../../middleware/authorize");
const {
  listPagesController,
  getPageByIdController,
  createPageController,
  updatePageController,
  deletePageController,
} = require("../../controllers/adminController/staticPageController");

const router = express.Router();

// Static Pages has no View action in the list UI — open with edit or delete.
router.get("/", protectAdmin, authorizeAny("static-pages.edit", "static-pages.delete"), listPagesController);
router.get("/:id", protectAdmin, authorizeAny("static-pages.edit", "static-pages.delete"), getPageByIdController);
router.post("/", protectAdmin, authorize("static-pages.edit"), createPageController);
router.patch("/:id", protectAdmin, authorize("static-pages.edit"), updatePageController);
router.delete("/:id", protectAdmin, authorize("static-pages.delete"), deletePageController);

module.exports = router;
