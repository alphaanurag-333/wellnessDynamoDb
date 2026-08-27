/**
 * One-off live probe: send every named IRW WhatsApp template to a test number.
 * Usage: node scripts/probeWhatsAppTemplates.js [10-digit-phone]
 */
require("dotenv").config();

const {
  NAMED_TEMPLATES,
  sendNamedWhatsAppTemplate,
  sendWhatsAppOtp,
} = require("../utils/whatsapp");
const { generateConsultancyInvoicePdf } = require("../utils/invoicePdf");
const { uploadBufferToS3, resolvePublicUrl } = require("../utils/s3");

const PHONE = String(process.argv[2] || "9981110114").replace(/\D/g, "").slice(-10);
const person = {
  name: "Ankit",
  phone: PHONE,
  phoneCountryCode: "+91",
  whatsappSameAsMobile: true,
};

const CASES = [
  { templateKey: "pwcUser", params: ["Ankit", "Diabetes"] },
  { templateKey: "pwcCoach", params: ["Priya", "Ankit", "Diabetes"] },
  { templateKey: "programConfirm", params: ["Ankit", "4999"] },
  { templateKey: "uobBa", params: ["Priya", "Ankit"] },
  { templateKey: "uobBr", params: ["Priya", "Ankit"] },
  { templateKey: "uobCl", params: ["Ankit"] },
  { templateKey: "uobHap", params: ["Ankit"] },
  { templateKey: "uobLaunch", params: ["Ankit"] },
  { templateKey: "uobPiCoach", params: ["Priya", "Ankit"] },
  { templateKey: "uobPiUser", params: ["Ankit"] },
  { templateKey: "uobReportsBriefing", params: ["Ankit"] },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadProbeInvoice() {
  const pdfBuffer = await generateConsultancyInvoicePdf({
    referenceNumber: "IRW-WA-PROBE",
    paidAt: new Date().toISOString(),
    user: { name: "Ankit", email: "probe@example.com", phone: PHONE, phoneCountryCode: "+91" },
    pricing: {
      baseAmount: 4999,
      discountAmount: 0,
      discountedBase: 4999,
      taxAmount: 0,
      taxPercent: 0,
      taxType: "inclusive",
      totalAmount: 4999,
    },
    appName: "India Redefining Wellness",
    healthConcern: { title: "Diabetes" },
    paymentMethod: "upi",
    currency: "INR",
  });
  const key = await uploadBufferToS3({
    buffer: pdfBuffer,
    contentType: "application/pdf",
    folder: "invoices",
    originalName: "IRW-WA-PROBE.pdf",
  });
  const url = resolvePublicUrl(key);
  if (!url) throw new Error("Could not resolve public invoice URL");
  return url;
}

async function main() {
  const results = [];
  let invoiceUrl = null;
  try {
    invoiceUrl = await uploadProbeInvoice();
    console.info("invoicePdf", invoiceUrl);
  } catch (err) {
    console.error("invoicePdf failed", err.message);
  }

  const invoiceResult = await sendNamedWhatsAppTemplate({
    templateKey: "invoice",
    person,
    params: ["Ankit"],
    documentUrl: invoiceUrl,
    fileName: "IRW-WA-PROBE.pdf",
  });
  results.push({
    template: NAMED_TEMPLATES.invoice.defaultName,
    templateKey: "invoice",
    ...invoiceResult,
  });
  console.info(JSON.stringify(results[results.length - 1]));
  await sleep(1500);

  for (const testCase of CASES) {
    const result = await sendNamedWhatsAppTemplate({
      templateKey: testCase.templateKey,
      person,
      params: testCase.params,
    });
    const row = {
      template: NAMED_TEMPLATES[testCase.templateKey]?.defaultName,
      ...result,
    };
    results.push(row);
    console.info(JSON.stringify(row));
    await sleep(1500);
  }

  const otpResult = await sendWhatsAppOtp({
    phoneCountryCode: "+91",
    phone: PHONE,
    otp: "123456",
  });
  const otpRow = {
    template: process.env.BHASHSMS_OTP_TEMPLATE || "otp_auth_irw",
    templateKey: "otp",
    ...otpResult,
  };
  results.push(otpRow);
  console.info(JSON.stringify(otpRow));

  const passed = results.filter((row) => row.sent).map((row) => row.template);
  const failed = results.filter((row) => !row.sent).map((row) => `${row.template}: ${row.reason}`);
  console.info("\nSUMMARY");
  console.info("sent", passed.join(", ") || "(none)");
  console.info("failed", failed.join(" | ") || "(none)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
