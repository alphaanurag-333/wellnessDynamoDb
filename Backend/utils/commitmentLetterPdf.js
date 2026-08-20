const PDFDocument = require("pdfkit");
const { resolveCommitmentLetterText } = require("./coachContent");

const COLORS = {
  primary: "#1B7F5C",
  primaryDark: "#145C43",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#D1D5DB",
  white: "#FFFFFF",
};

const PAGE = { margin: 48, width: 595.28 };

function parseCommitmentLetterBlocks(value, clientName = "{name}") {
  const source = resolveCommitmentLetterText(value).replaceAll(
    "{name}",
    clientName || "{name}"
  );
  const chunks = source
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.map((chunk) => {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const bulletLines = lines.filter((line) => /^[•\-–*]/.test(line));
    if (lines.length && bulletLines.length === lines.length) {
      return {
        type: "list",
        items: lines.map((line) => line.replace(/^[•\-–*]+\s*/, "")),
      };
    }
    return { type: "para", text: chunk };
  });
}

function drawDivider(doc, y) {
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .stroke();
}

function generateCommitmentLetterPdf({
  text,
  clientName = "",
  version = 1,
  appName = "India Redefining Wellness",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE.margin });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentRight = PAGE.width - PAGE.margin;
    const contentWidth = contentRight - PAGE.margin;
    const blocks = parseCommitmentLetterBlocks(text, clientName || "{name}");
    let y = PAGE.margin;

    doc.save();
    doc.rect(0, 0, PAGE.width, 88).fill(COLORS.primary);
    doc
      .fillColor(COLORS.white)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(appName || "India Redefining Wellness", PAGE.margin, 26, {
        width: contentWidth * 0.7,
      });
    doc
      .fontSize(11)
      .font("Helvetica")
      .text("Commitment Letter", PAGE.margin, 54);
    doc
      .fontSize(9)
      .text(`Letter v${Math.max(1, Number(version) || 1)}`, contentRight - 160, 36, {
        width: 160,
        align: "right",
      });
    doc.restore();

    y = 112;
    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("My commitment", PAGE.margin, y);
    y += 28;
    drawDivider(doc, y);
    y += 18;

    for (const block of blocks) {
      if (y > 720) {
        doc.addPage();
        y = PAGE.margin;
      }

      if (block.type === "list") {
        for (const item of block.items) {
          if (y > 740) {
            doc.addPage();
            y = PAGE.margin;
          }
          doc
            .fillColor(COLORS.primaryDark)
            .font("Helvetica-Bold")
            .fontSize(11)
            .text("•", PAGE.margin, y, { width: 14 });
          const itemHeight = doc.heightOfString(item, {
            width: contentWidth - 18,
          });
          doc
            .fillColor(COLORS.text)
            .font("Helvetica")
            .fontSize(11)
            .text(item, PAGE.margin + 16, y, { width: contentWidth - 18 });
          y += Math.max(18, itemHeight + 10);
        }
        y += 6;
        continue;
      }

      const paraHeight = doc.heightOfString(block.text, { width: contentWidth });
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(11)
        .text(block.text, PAGE.margin, y, {
          width: contentWidth,
          lineGap: 3,
        });
      y += paraHeight + 16;
    }

    if (y > 680) {
      doc.addPage();
      y = PAGE.margin;
    } else {
      y += 24;
    }

    drawDivider(doc, y);
    y += 28;

    const colWidth = (contentWidth - 24) / 2;
    const leftX = PAGE.margin;
    const rightX = PAGE.margin + colWidth + 24;

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(10)
      .text("Coach", leftX, y);
    doc.text("Signed on", rightX, y);
    y += 28;

    doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .moveTo(leftX, y)
      .lineTo(leftX + colWidth, y)
      .stroke();
    doc.moveTo(rightX, y).lineTo(rightX + colWidth, y).stroke();
    y += 10;

    doc
      .fillColor(COLORS.muted)
      .fontSize(9)
      .text("Coach signature", leftX, y);
    doc.text(`Letter v${Math.max(1, Number(version) || 1)}`, rightX, y);

    doc.end();
  });
}

module.exports = {
  parseCommitmentLetterBlocks,
  generateCommitmentLetterPdf,
};
