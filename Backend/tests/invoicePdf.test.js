const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generateConsultancyInvoicePdf } = require("../utils/invoicePdf");
const {
  invoicePresentationForTransaction,
  ensureTransactionInvoice,
} = require("../utils/consultancyInvoiceResponse");

describe("consultancy invoice PDF", () => {
  it("generates a non-empty PDF buffer with consultation details", async () => {
    const buffer = await generateConsultancyInvoicePdf({
      referenceNumber: "WD20260620TEST01",
      paidAt: "2026-06-20T10:02:21.000Z",
      user: {
        name: "Anurag",
        email: "anurag@gmail.com",
        phoneCountryCode: "+91",
        phone: "9999999999",
      },
      pricing: {
        baseAmount: 299,
        discountAmount: 200,
        discountedBase: 99,
        taxAmount: 4.71,
        taxPercent: 5,
        taxType: "inclusive",
        totalAmount: 99,
      },
      assignee: { name: "test", type: "wellness_coach" },
      appName: "Wellness",
      appEmail: "support@wellness.com",
      appMobile: "9876543210",
      healthConcern: { title: "Fat Loss", description: "Weight management consultation" },
      referralCode: "77TMS3GZ",
      paymentMethod: "upi",
      paymentProvider: "mock",
      currency: "INR",
    });

    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 500);
    assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
  });

  it("generates a program invoice with the program title as the service line", async () => {
    const presentation = invoicePresentationForTransaction({
      productType: "program",
      userSnapshot: {
        programTitle: "Diabetes Reversal",
        programType: "Goal based/Lifetime Membership",
      },
    });

    assert.equal(presentation.documentTitle, "Wellness Program Invoice");
    assert.equal(presentation.serviceLabel, "Diabetes Reversal");
    assert.equal(presentation.discountLabel, "Discount");
    assert.deepEqual(presentation.detailsRows, [
      { label: "Program", value: "Diabetes Reversal" },
      { label: "Program type", value: "Goal based/Lifetime Membership" },
    ]);

    const buffer = await generateConsultancyInvoicePdf({
      referenceNumber: "WD202608185A36C7",
      paidAt: "2026-08-18T10:22:26.802Z",
      user: { name: "Seek Tester", email: "test.seek@irwellness.local" },
      pricing: {
        baseAmount: 30000,
        discountAmount: 3000,
        discountedBase: 27000,
        taxAmount: 1528.3,
        taxPercent: 6,
        taxType: "inclusive",
        totalAmount: 27000,
      },
      paymentMethod: "upi",
      paymentProvider: "mock",
      currency: "INR",
      ...presentation,
    });

    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 500);
    assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
  });
});

describe("invoice presentation", () => {
  it("keeps consultancy copy as the default", () => {
    const presentation = invoicePresentationForTransaction({
      productType: "consultancy",
    });
    assert.equal(presentation.documentTitle, "Consultancy Invoice");
    assert.equal(presentation.serviceLabel, "Consultancy service fee");
    assert.equal(presentation.detailsRows, null);
  });

  it("does not generate an invoice for unpaid transactions", async () => {
    const pending = { id: "txn-1", paymentStatus: "pending", invoicePdfKey: null };
    const result = await ensureTransactionInvoice(pending);
    assert.equal(result, pending);
  });

  it("skips generation when an invoice key already exists", async () => {
    const paid = {
      id: "txn-2",
      paymentStatus: "paid",
      invoicePdfKey: "invoices/existing.pdf",
    };
    const result = await ensureTransactionInvoice(paid);
    assert.equal(result.invoicePdfKey, "invoices/existing.pdf");
  });
});
