const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listProgramCatalogController,
  getProgramCatalogByIdController,
  createProgramCatalogController,
  updateProgramCatalogController,
  deleteProgramCatalogController,
} = require("../../controllers/adminController/programCatalogController");
const {
  listAdminProgramTransactionsController,
  getAdminProgramTransactionController,
  getAdminProgramInvoiceController,
} = require("../../controllers/adminController/programTransactionController");

const router = express.Router();

router.get("/transactions", protectAdmin, listAdminProgramTransactionsController);
router.get("/transactions/:id", protectAdmin, getAdminProgramTransactionController);
router.get("/transactions/:id/invoice", protectAdmin, getAdminProgramInvoiceController);

router.get("/", protectAdmin, listProgramCatalogController);
router.post("/", protectAdmin, createProgramCatalogController);
router.get("/:id", protectAdmin, getProgramCatalogByIdController);
router.patch("/:id", protectAdmin, updateProgramCatalogController);
router.delete("/:id", protectAdmin, deleteProgramCatalogController);

module.exports = router;
