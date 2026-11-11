const PDFDocument = require("pdfkit");
const { PERSONALISED_PLAN_ID, mealsToSections } = require("./personalisedDietPlan");

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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
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

function slotLabel(slot) {
  const value = String(slot || "").toLowerCase();
  if (value === "breakfast") return "Breakfast";
  if (value === "lunch") return "Lunch";
  if (value === "dinner") return "Dinner";
  if (value === "snack") return "Snack";
  return value || "Meal";
}

function ensurePageSpace(doc, y, minY, needed = 40) {
  if (y + needed > minY) {
    doc.addPage();
    return PAGE.margin;
  }
  return y;
}

function drawPersonalisedPlan(doc, plan, startY, contentWidth) {
  let y = startY;
  const sections = mealsToSections(plan.meals || []);
  const tableX = PAGE.margin;
  const colOption = contentWidth * 0.28;
  const colDesc = contentWidth * 0.47;
  const colQty = contentWidth * 0.25;
  const rowH = 22;

  doc
    .fillColor(COLORS.text)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(plan.name || "Personalised diet plan", PAGE.margin, y);
  y += 18;
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text(
      plan.description || "Meal sections with client-choosable options and quantities",
      PAGE.margin,
      y,
      { width: contentWidth },
    );
  y += doc.heightOfString(plan.description || "Meal sections with client-choosable options and quantities", {
    width: contentWidth,
  }) + 14;

  for (const section of sections) {
    y = ensurePageSpace(doc, y, 720, 60);
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(10).text(section.title, PAGE.margin, y);
    y += 16;

    y = ensurePageSpace(doc, y, 740, rowH + 4);
    doc.save();
    doc.rect(tableX, y, contentWidth, rowH).fill(COLORS.tableHead);
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(8);
    doc.text("Option", tableX + 6, y + 7, { width: colOption - 12 });
    doc.text("Description", tableX + colOption + 6, y + 7, { width: colDesc - 12 });
    doc.text("Quantity", tableX + colOption + colDesc + 6, y + 7, { width: colQty - 12 });
    doc.restore();
    y += rowH;

    for (const row of section.rows || []) {
      y = ensurePageSpace(doc, y, 740, rowH);
      doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
      doc.text(row.label || "—", tableX + 6, y + 6, { width: colOption - 12 });
      doc.text(row.description || "—", tableX + colOption + 6, y + 6, { width: colDesc - 12 });
      doc.text(row.quantity || "—", tableX + colOption + colDesc + 6, y + 6, { width: colQty - 12 });
      y += rowH;
    }
    y += 10;
  }

  return y;
}

function drawCatalogPlan(doc, plan, startY, contentWidth) {
  let y = startY;

  doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(11).text(plan.name || plan.planId, PAGE.margin, y);
  y += 14;
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(
    [plan.type, plan.category].filter(Boolean).join(" · "),
    PAGE.margin,
    y,
  );
  y += 14;

  if (plan.description) {
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(plan.description, PAGE.margin, y, {
      width: contentWidth,
    });
    y += doc.heightOfString(plan.description, { width: contentWidth }) + 10;
  }

  const meals = Array.isArray(plan.meals) ? plan.meals : [];
  if (meals.length > 0) {
    const tableX = PAGE.margin;
    const col1 = contentWidth * 0.2;
    const col2 = contentWidth * 0.15;
    const col3 = contentWidth * 0.65;
    const rowH = 20;

    doc.save();
    doc.rect(tableX, y, contentWidth, rowH).fill(COLORS.tableHead);
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(8);
    doc.text("Slot", tableX + 6, y + 6, { width: col1 - 12 });
    doc.text("Day", tableX + col1, y + 6, { width: col2 - 6 });
    doc.text("Meal", tableX + col1 + col2, y + 6, { width: col3 - 6 });
    doc.restore();
    y += rowH;

    for (const meal of meals) {
      y = ensurePageSpace(doc, y, 740, rowH);
      const mealLine = [meal.title, meal.foods, meal.notes].filter(Boolean).join(" — ");
      doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
      doc.text(slotLabel(meal.slot), tableX + 6, y + 5, { width: col1 - 12 });
      doc.text(String(meal.day || "all"), tableX + col1, y + 5, { width: col2 - 6 });
      doc.text(mealLine || "—", tableX + col1 + col2, y + 5, { width: col3 - 6 });
      y += rowH;
    }
    y += 8;
  }

  drawDivider(doc, y);
  return y + 12;
}

function generateDietPlanAssignmentPdf({
  user,
  coach,
  startDate,
  note,
  plans = [],
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

    const isPersonalisedOnly = plans.length === 1
      && String(plans[0]?.planId || "") === PERSONALISED_PLAN_ID;
    const headerSubtitle = isPersonalisedOnly ? "Personalised diet plan" : "Personalized Diet Plan";

    doc.save();
    doc.rect(0, 0, PAGE.width, 96).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold").text(appName, PAGE.margin, 28, {
      width: contentWidth * 0.55,
    });
    doc.fontSize(11).font("Helvetica").text(headerSubtitle, PAGE.margin, 56);
    doc
      .fontSize(9)
      .text(`Start date: ${formatDate(startDate)}`, contentRight - 200, 32, {
        width: 200,
        align: "right",
      });
    if (coach?.name) {
      doc.text(`Coach: ${coach.name}`, contentRight - 200, 48, { width: 200, align: "right" });
    }
    doc.restore();

    y = 112;
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11).text("Client", PAGE.margin, y);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(user?.name || "Client", PAGE.margin, y + 16)
      .text(user?.email || "", PAGE.margin, y + 30);

    y += 56;
    drawDivider(doc, y);
    y += 16;

    if (note) {
      doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(10).text("Coach note", PAGE.margin, y);
      y += 14;
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(note, PAGE.margin, y, { width: contentWidth });
      y += doc.heightOfString(note, { width: contentWidth }) + 16;
    }

    if (!isPersonalisedOnly) {
      doc
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Assigned diet plans:", PAGE.margin, y);
      y += 24;
    }

    for (const plan of plans) {
      y = ensurePageSpace(doc, y, 700, 80);
      if (String(plan?.planId || "") === PERSONALISED_PLAN_ID) {
        y = drawPersonalisedPlan(doc, plan, y, contentWidth);
      } else {
        y = drawCatalogPlan(doc, plan, y, contentWidth);
      }
    }

    const footerY = 760;
    drawDivider(doc, footerY);
    doc
      .fillColor(COLORS.muted)
      .fontSize(8)
      .text(
        "This is a computer-generated diet plan. Please consult your coach or healthcare provider before making major dietary changes.",
        PAGE.margin,
        footerY + 10,
        { width: contentWidth, align: "center" },
      );

    doc.end();
  });
}

module.exports = {
  generateDietPlanAssignmentPdf,
};
