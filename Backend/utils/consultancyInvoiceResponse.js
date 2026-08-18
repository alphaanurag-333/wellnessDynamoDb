const AppError = require("./AppError");
const { getAppConfig } = require("../models/appConfigModel");
const {
  toPublicTransaction,
  updateConsultancyTransaction,
} = require("../models/consultancyTransactionModel");
const { generateConsultancyInvoicePdf } = require("./invoicePdf");
const { uploadBufferToS3, resolvePublicUrl } = require("./s3");

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

function productTypeOf(transaction) {
  return String(transaction?.productType || "consultancy").toLowerCase();
}

function snapshotTitle(snap, fallback) {
  return String(
    snap?.programTitle || snap?.catalogItemName || snap?.planName || snap?.title || fallback
  ).trim() || fallback;
}

function invoicePresentationForTransaction(transaction) {
  const type = productTypeOf(transaction);
  const snap = transaction?.userSnapshot || {};

  if (type === "program") {
    const title = snapshotTitle(snap, "Wellness Program");
    const rows = [{ label: "Program", value: title }];
    if (snap.programType) rows.push({ label: "Program type", value: String(snap.programType) });
    return {
      documentTitle: "Wellness Program Invoice",
      detailsTitle: "Program Details",
      serviceLabel: title,
      discountLabel: "Discount",
      detailsRows: rows,
    };
  }

  if (type === "subscription") {
    const title = snapshotTitle(snap, "Subscription");
    return {
      documentTitle: "Subscription Invoice",
      detailsTitle: "Subscription Details",
      serviceLabel: title,
      discountLabel: "Discount",
      detailsRows: [{ label: "Plan", value: title }],
    };
  }

  if (type === "energy_exchange") {
    return {
      documentTitle: "Energy Exchange Invoice",
      detailsTitle: "Purchase Details",
      serviceLabel: "Energy Exchange",
      discountLabel: "Discount",
      detailsRows: [{ label: "Product", value: "Energy Exchange" }],
    };
  }

  return {
    documentTitle: "Consultancy Invoice",
    detailsTitle: "Consultation Details",
    serviceLabel: "Consultancy service fee",
    discountLabel: "Referral discount",
    detailsRows: null,
  };
}

function attachInvoiceUrl(item) {
  if (!item) return item;
  const pub = { ...item };
  if (pub.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

async function buildConsultancyInvoicePayload(transaction) {
  const appConfig = await getAppConfig();
  const presentation = invoicePresentationForTransaction(transaction);
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
    ...presentation,
  };
}

async function ensureTransactionInvoice(transaction) {
  if (!transaction) return transaction;
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    return transaction;
  }
  if (transaction.invoicePdfKey) return transaction;

  try {
    const pdfBuffer = await generateConsultancyInvoicePdf(
      await buildConsultancyInvoicePayload(transaction)
    );
    const invoicePdfKey = await uploadBufferToS3({
      buffer: pdfBuffer,
      contentType: "application/pdf",
      folder: "invoices",
      originalName: `${transaction.referenceNumber || transaction.id}.pdf`,
    });
    return (
      (await updateConsultancyTransaction(transaction.id, { invoicePdfKey })) || {
        ...transaction,
        invoicePdfKey,
      }
    );
  } catch (err) {
    console.error("[Invoice] PDF failed", err.message);
    return transaction;
  }
}

async function toPublicTransactionWithInvoice(transaction) {
  const withInvoice = await ensureTransactionInvoice(transaction);
  return attachInvoiceUrl(toPublicTransaction(withInvoice));
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
  invoicePresentationForTransaction,
  attachInvoiceUrl,
  buildConsultancyInvoicePayload,
  ensureTransactionInvoice,
  toPublicTransactionWithInvoice,
  sendConsultancyInvoicePdf,
};
