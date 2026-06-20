const PDFDocument = require("pdfkit");

function generateConsultancyInvoicePdf({
  referenceNumber,
  paidAt,
  user,
  pricing,
  assignee,
  zoomJoinUrl,
  appName = "Wellness",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(appName, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(14).text("Consultancy Invoice", { underline: true });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Reference: ${referenceNumber}`);
    doc.text(`Date: ${paidAt ? new Date(paidAt).toLocaleString() : new Date().toLocaleString()}`);
    doc.moveDown();

    doc.text("Billed To:");
    doc.text(user?.name || "Customer");
    if (user?.email) doc.text(user.email);
    if (user?.phone) doc.text(`${user.phoneCountryCode || ""} ${user.phone}`.trim());
    doc.moveDown();

    if (assignee) {
      doc.text(`Meeting With: ${assignee.name || assignee.type || "—"}`);
      doc.moveDown();
    }

    doc.text("Itemized Breakdown", { underline: true });
    doc.moveDown(0.5);
    doc.text(`Base consultancy amount: Rs. ${pricing.baseAmount.toFixed(2)}`);
    doc.text(`Referral discount: - Rs. ${pricing.discountAmount.toFixed(2)}`);
    doc.text(`Tax (${pricing.taxType}, ${pricing.taxPercent}%): Rs. ${pricing.taxAmount.toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(12).text(`Total Paid: Rs. ${pricing.totalAmount.toFixed(2)}`, { underline: true });
    doc.moveDown();

    if (zoomJoinUrl) {
      doc.fontSize(10).text(`Zoom meeting link: ${zoomJoinUrl}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#666").text("This is a computer-generated invoice.", { align: "center" });

    doc.end();
  });
}

module.exports = {
  generateConsultancyInvoicePdf,
};
