const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "programs.transactions.view" }),
  listAdminProgramTransactionsController
);
router.get(
  "/transactions/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "programs.transactions.view" }),
  getAdminProgramTransactionController
);
router.get(
  "/transactions/:id/invoice",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "programs.transactions.view" }),
  getAdminProgramInvoiceController
);

// Catalog has no dedicated View action — list/detail allowed with edit or delete.
router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: ["programs.edit", "programs.delete"] }), listProgramCatalogController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "programs.edit" }), createProgramCatalogController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: ["programs.edit", "programs.delete"] }), getProgramCatalogByIdController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "programs.edit" }), updateProgramCatalogController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "programs.delete" }), deleteProgramCatalogController);

module.exports = router;
