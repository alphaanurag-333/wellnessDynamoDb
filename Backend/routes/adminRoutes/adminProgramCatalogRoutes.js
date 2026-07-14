const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize, authorizeAny } = require("../../middleware/authorize");
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

router.get(
  "/transactions",
  protectAdmin,
  authorize("programs.transactions.view"),
  listAdminProgramTransactionsController
);
router.get(
  "/transactions/:id",
  protectAdmin,
  authorize("programs.transactions.view"),
  getAdminProgramTransactionController
);
router.get(
  "/transactions/:id/invoice",
  protectAdmin,
  authorize("programs.transactions.view"),
  getAdminProgramInvoiceController
);

// Catalog has no dedicated View action — list/detail allowed with edit or delete.
router.get("/", protectAdmin, authorizeAny("programs.edit", "programs.delete"), listProgramCatalogController);
router.post("/", protectAdmin, authorize("programs.edit"), createProgramCatalogController);
router.get("/:id", protectAdmin, authorizeAny("programs.edit", "programs.delete"), getProgramCatalogByIdController);
router.patch("/:id", protectAdmin, authorize("programs.edit"), updateProgramCatalogController);
router.delete("/:id", protectAdmin, authorize("programs.delete"), deleteProgramCatalogController);

module.exports = router;
