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

function formatReportDate(reportDate) {
  if (!reportDate) return "—";
  const d = new Date(reportDate);
  return Number.isNaN(d.getTime())
    ? String(reportDate)
    : d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function drawDivider(doc, y) {
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .stroke();
}

function generateTestRecommendationPdf({
  user,
  coach,
  reportDate,
  tests = [],
  appName = "Wellness",
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

    doc.save();
    doc.rect(0, 0, PAGE.width, 96).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold").text(appName, PAGE.margin, 28, {
      width: contentWidth * 0.55,
    });
    doc.fontSize(11).font("Helvetica").text("Recommended Blood Tests", PAGE.margin, 56);
    doc
      .fontSize(9)
      .text(`Report date: ${formatReportDate(reportDate)}`, contentRight - 200, 32, {
        width: 200,
        align: "right",
      });
    if (coach?.name) {
      doc.text(`Coach: ${coach.name}`, contentRight - 200, 48, { width: 200, align: "right" });
    }
    doc.restore();

    y = 112;
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11).text("Patient", PAGE.margin, y);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(user?.name || "Patient", PAGE.margin, y + 16)
      .text(user?.email || "", PAGE.margin, y + 30);

    y += 56;
    drawDivider(doc, y);
    y += 16;

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Your Wellness Coach has recommended the following tests:", PAGE.margin, y);
    y += 24;

    for (const test of tests) {
      if (y > 700) {
        doc.addPage();
        y = PAGE.margin;
      }

      doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(11).text(test.name || test.testId, PAGE.margin, y);
      y += 14;
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(
        [test.category, test.type].filter(Boolean).join(" · "),
        PAGE.margin,
        y
      );
      y += 16;

      const params = Array.isArray(test.parameters) ? test.parameters : [];
      if (params.length > 0) {
        const tableX = PAGE.margin;
        const col1 = contentWidth * 0.35;
        const col2 = contentWidth * 0.2;
        const col3 = contentWidth * 0.45;
        const rowH = 20;

        doc.save();
        doc.rect(tableX, y, contentWidth, rowH).fill(COLORS.tableHead);
        doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(8);
        doc.text("Parameter", tableX + 6, y + 6, { width: col1 - 12 });
        doc.text("Unit", tableX + col1, y + 6, { width: col2 - 6 });
        doc.text("Reference Range", tableX + col1 + col2, y + 6, { width: col3 - 6 });
        doc.restore();
        y += rowH;

        for (const param of params) {
          if (y > 740) {
            doc.addPage();
            y = PAGE.margin;
          }
          doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
          doc.text(param.name || param.paramId || "—", tableX + 6, y + 5, { width: col1 - 12 });
          doc.text(param.unit || "—", tableX + col1, y + 5, { width: col2 - 6 });
          doc.text(param.refRange || "—", tableX + col1 + col2, y + 5, { width: col3 - 6 });
          y += rowH;
        }
        y += 8;
      } else {
        y += 4;
      }

      drawDivider(doc, y);
      y += 12;
    }

    const footerY = 760;
    drawDivider(doc, footerY);
    doc
      .fillColor(COLORS.muted)
      .fontSize(8)
      .text(
        "This is a computer-generated recommendation list. Please consult your healthcare provider before undergoing tests.",
        PAGE.margin,
        footerY + 10,
        { width: contentWidth, align: "center" }
      );

    doc.end();
  });
}

module.exports = {
  generateTestRecommendationPdf,
};
