const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listAdminEnergyExchangeTransactionsController,
  getAdminEnergyExchangeTransactionController,
  getAdminEnergyExchangeInvoiceController,
} = require("../../controllers/adminController/energyExchangeTransactionController");

const router = express.Router();

router.get("/transactions", protectAdmin, listAdminEnergyExchangeTransactionsController);
router.get("/transactions/:id", protectAdmin, getAdminEnergyExchangeTransactionController);
router.get("/transactions/:id/invoice", protectAdmin, getAdminEnergyExchangeInvoiceController);

module.exports = router;
