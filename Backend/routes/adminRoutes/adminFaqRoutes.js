const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listFaqsController,
  getFaqByIdController,
  createFaqController,
  updateFaqController,
  deleteFaqController,
} = require("../../controllers/adminController/faqController");

const router = express.Router();

router.get("/", protectAdmin, authorize("faq.view"), listFaqsController);
router.get("/:id", protectAdmin, authorize("faq.view"), getFaqByIdController);
router.post("/", protectAdmin, authorize("faq.edit"), createFaqController);
router.patch("/:id", protectAdmin, authorize("faq.edit"), updateFaqController);
router.delete("/:id", protectAdmin, authorize("faq.delete"), deleteFaqController);

module.exports = router;
