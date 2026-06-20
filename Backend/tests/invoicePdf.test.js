const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generateConsultancyInvoicePdf } = require("../utils/invoicePdf");

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
      zoomJoinUrl: "https://zoom.us/j/mock_zoom",
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
});
