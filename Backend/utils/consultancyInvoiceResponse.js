const AppError = require("./AppError");
const { getAppConfig } = require("../models/appConfigModel");
const { generateConsultancyInvoicePdf } = require("./invoicePdf");

function userFromTransaction(transaction) {
  const snap = transaction?.userSnapshot;
  if (!snap) return null;
  return {
    name: snap.name,
    email: snap.email,
    phone: snap.phone,
    phoneCountryCode: snap.phoneCountryCode,
  };
}

async function buildConsultancyInvoicePayload(transaction) {
  const appConfig = await getAppConfig();
  return {
    referenceNumber: transaction.referenceNumber,
    paidAt: transaction.paidAt || transaction.updatedAt || transaction.createdAt,
    user: userFromTransaction(transaction),
    pricing: {
      baseAmount: transaction.baseAmount,
      discountAmount: transaction.discountAmount,
      discountedBase: transaction.discountedBase,
      taxAmount: transaction.taxAmount,
      taxPercent: transaction.taxPercent,
      taxType: transaction.taxType,
      totalAmount: transaction.totalAmount,
    },
    assignee: transaction.assigneeSnapshot || null,
    zoomJoinUrl: transaction.zoomMeetingLink || null,
    appName: appConfig?.app_name || "Wellness",
    appEmail: appConfig?.app_email || null,
    appMobile: appConfig?.app_mobile || null,
    appAddress: appConfig?.address || null,
    footerText: appConfig?.app_footer_text || null,
    healthConcern: transaction.healthConcernSnapshot || null,
    referralCode: transaction.referralCodeValid ? transaction.referralCodeUsed : null,
    paymentMethod: transaction.paymentMethod,
    paymentProvider: transaction.paymentProvider,
    currency: transaction.currency || "INR",
  };
}

async function sendConsultancyInvoicePdf(res, transaction) {
  if (String(transaction?.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Invoice is only available for paid transactions", 404);
  }

  const payload = await buildConsultancyInvoicePayload(transaction);
  const buffer = await generateConsultancyInvoicePdf(payload);
  const filename = `${transaction.referenceNumber || transaction.id || "invoice"}.pdf`.replace(
    /[^\w.\-]+/g,
    "_"
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.end(buffer);
}

module.exports = {
  buildConsultancyInvoicePayload,
  sendConsultancyInvoicePdf,
};
