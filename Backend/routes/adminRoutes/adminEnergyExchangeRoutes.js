const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminEnergyExchangeTransactionsController,
  getAdminEnergyExchangeTransactionController,
  getAdminEnergyExchangeInvoiceController,
} = require("../../controllers/adminController/energyExchangeTransactionController");

const router = express.Router();

router.get(
  "/transactions",
  protectAdmin,
  authorize("energy-exchange.transactions.view"),
  listAdminEnergyExchangeTransactionsController
);
router.get(
  "/transactions/:id",
  protectAdmin,
  authorize("energy-exchange.transactions.view"),
  getAdminEnergyExchangeTransactionController
);
router.get(
  "/transactions/:id/invoice",
  protectAdmin,
  authorize("energy-exchange.transactions.view"),
  getAdminEnergyExchangeInvoiceController
);

module.exports = router;
