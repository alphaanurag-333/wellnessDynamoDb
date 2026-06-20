const PDFDocument = require("pdfkit");

const COLORS = {
  primary: "#1B7F5C",
  primaryDark: "#145C43",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#D1D5DB",
  tableHead: "#F0FDF4",
  white: "#FFFFFF",
};

const PAGE = { margin: 48, width: 595.28 };

function money(amount, currency = "INR") {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const symbol = String(currency).toUpperCase() === "INR" ? "Rs." : `${currency} `;
  return `${symbol} ${safe.toFixed(2)}`;
}

function formatPaidAt(paidAt) {
  if (!paidAt) return new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const d = new Date(paidAt);
  return Number.isNaN(d.getTime())
    ? String(paidAt)
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatAssigneeRole(type) {
  const map = {
    wellness_coach: "Wellness Coach",
    assistant_wellness_coach: "Assistant Wellness Coach",
    admin: "Admin",
  };
  return map[String(type || "").toLowerCase()] || "Consultant";
}

function formatTaxLabel(taxType, taxPercent) {
  const kind = String(taxType || "").toLowerCase() === "exclusive" ? "Exclusive" : "Inclusive";
  const pct = Number(taxPercent);
  const pctText = Number.isFinite(pct) ? `${pct}%` : "—";
  return `GST (${kind}, ${pctText})`;
}

function formatPaymentMethod(method) {
  const raw = String(method || "").trim();
  if (!raw) return "—";
  return raw.toUpperCase();
}

function drawDivider(doc, y) {
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .stroke();
}

function drawLabelValue(doc, x, y, label, value, { labelWidth = 110, valueWidth = 200 } = {}) {
  doc.fillColor(COLORS.muted).fontSize(9).text(label, x, y, { width: labelWidth });
  doc.fillColor(COLORS.text).fontSize(10).text(value || "—", x + labelWidth, y, { width: valueWidth });
}

function generateConsultancyInvoicePdf({
  referenceNumber,
  paidAt,
  user,
  pricing,
  assignee,
  zoomJoinUrl,
  appName = "Wellness",
  appEmail,
  appMobile,
  appAddress,
  footerText,
  healthConcern,
  referralCode,
  paymentMethod,
  paymentProvider,
  currency = "INR",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE.margin });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentRight = PAGE.width - PAGE.margin;
    const contentWidth = contentRight - PAGE.margin;
    let y = PAGE.margin;

    // Header band
    doc.save();
    doc.rect(0, 0, PAGE.width, 96).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold").text(appName, PAGE.margin, 28, {
      width: contentWidth * 0.55,
    });
    doc.fontSize(11).font("Helvetica").text("Consultancy Invoice", PAGE.margin, 56);
    doc.fontSize(9).text(`Ref: ${referenceNumber || "—"}`, contentRight - 190, 32, { width: 190, align: "right" });
    doc.text(`Paid on: ${formatPaidAt(paidAt)}`, contentRight - 190, 48, { width: 190, align: "right" });
    doc.text(`Status: PAID`, contentRight - 190, 64, { width: 190, align: "right" });
    doc.restore();

    y = 112;

    // Billed to + invoice meta
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11).text("Billed To", PAGE.margin, y);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(user?.name || "Customer", PAGE.margin, y + 16)
      .text(user?.email || "—", PAGE.margin, y + 30);
    const phoneLine = [user?.phoneCountryCode, user?.phone].filter(Boolean).join(" ").trim();
    if (phoneLine) doc.text(phoneLine, PAGE.margin, y + 44);

    const metaX = PAGE.margin + contentWidth * 0.55;
    doc.font("Helvetica-Bold").fontSize(11).text("Payment Details", metaX, y);
    drawLabelValue(doc, metaX, y + 16, "Method", formatPaymentMethod(paymentMethod), {
      labelWidth: 90,
      valueWidth: 150,
    });
    drawLabelValue(doc, metaX, y + 32, "Provider", paymentProvider || "—", { labelWidth: 90, valueWidth: 150 });
    drawLabelValue(doc, metaX, y + 48, "Currency", String(currency || "INR").toUpperCase(), {
      labelWidth: 90,
      valueWidth: 150,
    });
    if (referralCode) {
      drawLabelValue(doc, metaX, y + 64, "Referral code", referralCode, { labelWidth: 90, valueWidth: 150 });
    }

    y += referralCode ? 96 : 80;
    drawDivider(doc, y);
    y += 14;

    // Consultation details
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11).text("Consultation Details", PAGE.margin, y);
    y += 18;
    const concernTitle =
      healthConcern?.title || healthConcern?.name || (typeof healthConcern === "string" ? healthConcern : null);
    drawLabelValue(doc, PAGE.margin, y, "Health concern", concernTitle || "—");
    y += 16;
    if (assignee) {
      const assigneeName = assignee.name || "—";
      const assigneeRole = formatAssigneeRole(assignee.type);
      drawLabelValue(doc, PAGE.margin, y, "Meeting with", `${assigneeName} (${assigneeRole})`);
      y += 16;
    }
    if (healthConcern?.description) {
      doc.fillColor(COLORS.muted).fontSize(9).text("Notes", PAGE.margin, y);
      doc
        .fillColor(COLORS.text)
        .fontSize(9)
        .text(String(healthConcern.description).trim(), PAGE.margin + 110, y, {
          width: contentWidth - 110,
        });
      y += doc.heightOfString(String(healthConcern.description).trim(), {
        width: contentWidth - 110,
      }) + 8;
    }

    y += 8;
    drawDivider(doc, y);
    y += 16;

    // Line items table
    const tableX = PAGE.margin;
    const descWidth = contentWidth * 0.62;
    const amountWidth = contentWidth - descWidth;
    const rowHeight = 26;

    doc.save();
    doc.rect(tableX, y, contentWidth, rowHeight).fill(COLORS.tableHead);
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(10);
    doc.text("Description", tableX + 10, y + 8, { width: descWidth - 20 });
    doc.text("Amount", tableX + descWidth, y + 8, { width: amountWidth - 10, align: "right" });
    doc.restore();

    y += rowHeight;

    const baseAmount = Number(pricing?.baseAmount) || 0;
    const discountAmount = Number(pricing?.discountAmount) || 0;
    const discountedBase = Number(pricing?.discountedBase) ?? Math.max(0, baseAmount - discountAmount);
    const taxAmount = Number(pricing?.taxAmount) || 0;
    const totalAmount = Number(pricing?.totalAmount) || 0;

    const rows = [
      { label: "Consultancy service fee", amount: baseAmount },
      ...(discountAmount > 0
        ? [{ label: "Referral discount", amount: -discountAmount, muted: true }]
        : []),
      {
        label: formatTaxLabel(pricing?.taxType, pricing?.taxPercent),
        amount: taxAmount,
      },
    ];

    rows.forEach((row, index) => {
      if (index % 2 === 0) {
        doc.rect(tableX, y, contentWidth, rowHeight).fill("#FAFAFA");
      }
      doc.fillColor(row.muted ? COLORS.muted : COLORS.text).font("Helvetica").fontSize(10);
      doc.text(row.label, tableX + 10, y + 8, { width: descWidth - 20 });
      const amountText = row.amount < 0 ? `- ${money(Math.abs(row.amount), currency)}` : money(row.amount, currency);
      doc.text(amountText, tableX + descWidth, y + 8, { width: amountWidth - 10, align: "right" });
      y += rowHeight;
    });

    doc.strokeColor(COLORS.border).rect(tableX, y - rowHeight * rows.length - rowHeight, contentWidth, rowHeight * rows.length + rowHeight).stroke();

    y += 12;

    // Totals — align value column with the line-item amount column
    const amountColX = tableX + descWidth;
    const amountColW = amountWidth - 10;
    const totalsLabelW = 155;
    const totalsLabelX = amountColX - totalsLabelW;

    doc.fillColor(COLORS.muted).fontSize(9).text("Subtotal after discount", totalsLabelX, y, {
      width: totalsLabelW,
      align: "right",
    });
    doc.fillColor(COLORS.text).fontSize(10).text(money(discountedBase, currency), amountColX, y, {
      width: amountColW,
      align: "right",
    });
    y += 18;

    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(12).text("Total Paid", totalsLabelX, y, {
      width: totalsLabelW,
      align: "right",
    });
    doc.fillColor(COLORS.primaryDark).text(money(totalAmount, currency), amountColX, y, {
      width: amountColW,
      align: "right",
    });
    y += 28;

    if (zoomJoinUrl) {
      drawDivider(doc, y);
      y += 14;
      doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(10).text("Zoom Meeting", PAGE.margin, y);
      y += 14;
      doc.fillColor(COLORS.primary).font("Helvetica").fontSize(9).text(String(zoomJoinUrl), PAGE.margin, y, {
        width: contentWidth,
        link: String(zoomJoinUrl),
        underline: true,
      });
      y += 20;
    }

    // Footer
    const footerY = 760;
    drawDivider(doc, footerY);
    doc.fillColor(COLORS.muted).fontSize(8);
    const supportBits = [appEmail, appMobile, appAddress].filter(Boolean);
    if (supportBits.length) {
      doc.text(`Support: ${supportBits.join(" · ")}`, PAGE.margin, footerY + 10, {
        width: contentWidth,
        align: "center",
      });
    }
    doc.text(footerText || "This is a computer-generated invoice and does not require a signature.", PAGE.margin, footerY + 24, {
      width: contentWidth,
      align: "center",
    });

    doc.end();
  });
}

module.exports = {
  generateConsultancyInvoicePdf,
};
