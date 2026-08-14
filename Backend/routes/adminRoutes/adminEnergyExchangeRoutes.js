const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listAdminEnergyExchangeTransactionsController,
  getAdminEnergyExchangeTransactionController,
  getAdminEnergyExchangeInvoiceController,
} = require("../../controllers/adminController/energyExchangeTransactionController");

const router = express.Router();

router.get(
  "/transactions",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "energy-exchange.transactions.view" }),
  listAdminEnergyExchangeTransactionsController
);
router.get(
  "/transactions/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "energy-exchange.transactions.view" }),
  getAdminEnergyExchangeTransactionController
);
router.get(
  "/transactions/:id/invoice",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "energy-exchange.transactions.view" }),
  getAdminEnergyExchangeInvoiceController
);

module.exports = router;
