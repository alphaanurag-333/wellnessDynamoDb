const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listSopsController,
  getSopByIdController,
  createSopController,
  updateSopController,
  deleteSopController,
} = require("../../controllers/adminController/sopController");

const router = express.Router();

router.get("/", protectAdmin, authorize("sops.view"), listSopsController);
router.get("/:id", protectAdmin, authorize("sops.view"), getSopByIdController);
router.post("/", protectAdmin, authorize("sops.edit"), createSopController);
router.patch("/:id", protectAdmin, authorize("sops.edit"), updateSopController);
router.delete("/:id", protectAdmin, authorize("sops.delete"), deleteSopController);

module.exports = router;
