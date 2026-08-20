export const PRODUCT_COLORS = {
  program: "#2b8f5b",
  consultancy: "#0d9488",
  app: "#ec7a45",
  avg: "#a855f7",
};

export function asRevenueNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatRevenue(value) {
  const amount = asRevenueNumber(value);
  if (Math.abs(amount) >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)}L`;
  }
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatPaymentAmount(value) {
  return `Rs. ${Math.round(asRevenueNumber(value)).toLocaleString("en-IN")}`;
}

function monthRow({ month, program, consultancy, app, onboarded = 0, payments = [] }) {
  const [year, monthNum] = month.split("-").map(Number);
  const label = new Date(year, monthNum - 1, 1).toLocaleString("en-IN", { month: "short" });
  const total = program + consultancy + app;
  const products = [
    { key: "program", name: "Wellness programs", value: program, pct: total ? Math.round((program / total) * 100) : 0, color: PRODUCT_COLORS.program },
    { key: "app", name: "App users", value: app, pct: total ? Math.round((app / total) * 100) : 0, color: PRODUCT_COLORS.app },
    { key: "consultancy", name: "PWC", value: consultancy, pct: total ? Math.round((consultancy / total) * 100) : 0, color: PRODUCT_COLORS.consultancy },
  ];
  return {
    month,
    label,
    displayLabel: `${label} ${year}`,
    program,
    consultancy,
    app,
    total,
    products,
    onboarded,
    payments: Array.isArray(payments) ? payments : [],
  };
}

function fyFromMonths(fyStartYear, months) {
  const rows = months.map(monthRow);
  return {
    fyStartYear,
    label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
    months: rows,
    onboarded: rows.map((row) => ({ month: row.month, label: row.label, count: row.onboarded })),
    onboardedTotal: rows.reduce((sum, row) => sum + row.onboarded, 0),
  };
}

export function resolveRevenueAnalytics(statistics) {
  if (!statistics) return null;
  const live = statistics.revenueAnalytics;
  if (live?.financialYears?.length) return live;
  return fromLegacyStatistics(statistics);
}

function emptyProductBreakdown() {
  return [
    { key: "program", name: "Wellness program", value: 0, pct: 0, color: PRODUCT_COLORS.program },
    { key: "consultancy", name: "PWC", value: 0, pct: 0, color: PRODUCT_COLORS.consultancy },
    { key: "app", name: "App users", value: 0, pct: 0, color: PRODUCT_COLORS.app },
  ];
}

function fromLegacyStatistics(statistics) {
  const monthRows = Array.isArray(statistics.charts?.revenueByMonth)
    ? statistics.charts.revenueByMonth
    : [];
  const productRows = Array.isArray(statistics.charts?.revenueByProduct)
    ? statistics.charts.revenueByProduct
    : [];

  // No revenue payload at all — treat as unavailable, not "demo".
  if (!monthRows.length && !productRows.length && statistics.revenueAndPayouts == null) {
    return null;
  }

  const products = productRows.length
    ? productRows.map((row) => ({
        key: row.key,
        name: row.name,
        value: asRevenueNumber(row.value),
        pct: asRevenueNumber(row.pct) || 0,
        color: PRODUCT_COLORS[row.key] || PRODUCT_COLORS.program,
      }))
    : emptyProductBreakdown();

  const months = monthRows.map((row) => {
    const program = asRevenueNumber(row.program ?? row.revenue);
    const consultancy = asRevenueNumber(row.consultancy);
    const app = asRevenueNumber(row.app);
    const total = asRevenueNumber(row.revenue ?? program + consultancy + app);
    const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(row.label);
    return {
      ...monthRow({
        month:
          row.month ||
          (monthIndex >= 0
            ? `2026-${String(monthIndex + 1).padStart(2, "0")}`
            : "2026-04"),
        program,
        consultancy,
        app: app || Math.max(0, total - program - consultancy),
      }),
      payments: Array.isArray(row.payments) ? row.payments : [],
    };
  });

  const now = new Date();
  const fyStartMonth = 4;
  const fyStartYear =
    now.getMonth() + 1 >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalRevenue = asRevenueNumber(statistics.revenueAndPayouts);
  const totalUsers = asRevenueNumber(statistics.totalUsers);

  return {
    asOf: now.toISOString(),
    asOfLabel: "today",
    fyStartMonth,
    currentFyStartYear: fyStartYear,
    currentMonth,
    totalRevenue,
    products,
    avgPerClient: totalRevenue && totalUsers ? totalRevenue / Math.max(1, totalUsers) : 0,
    payingClientCount: 0,
    financialYears: [
      {
        fyStartYear,
        label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
        months,
        onboarded: months.map((row) => ({ month: row.month, label: row.label, count: 0 })),
        onboardedTotal: 0,
      },
    ],
  };
}

export function findFinancialYear(analytics, fyStartYear) {
  const years = analytics?.financialYears || [];
  return years.find((fy) => fy.fyStartYear === Number(fyStartYear)) || years[0] || null;
}

export function paymentsForMonth(analytics, monthKey) {
  if (!monthKey) return [];
  const years = analytics?.financialYears || [];
  for (const fy of years) {
    const row = (fy.months || []).find((month) => month.month === monthKey);
    if (row) return Array.isArray(row.payments) ? row.payments : [];
  }
  return [];
}

const PLACEHOLDER_USER = new Set(["", "client"]);
const PLACEHOLDER_COACH = new Set(["", "—", "-", "not assigned"]);
const PLACEHOLDER_PROGRAM = new Set(["", "—", "pwc", "wellness program", "app user", "energy exchange", "consultancy"]);

function isPlaceholder(value, placeholders) {
  return placeholders.has(String(value || "").trim().toLowerCase());
}

export function enrichLivePayments(payments, { clients = [], healthConcerns = [] } = {}) {
  const rows = Array.isArray(payments) ? payments : [];
  if (!rows.length) return [];

  const clientsById = new Map(
    (clients || [])
      .map((user) => [String(user?.id || user?._id || "").trim(), user])
      .filter(([id]) => id),
  );
  const concernTitleById = new Map(
    (healthConcerns || [])
      .map((concern) => [
        String(concern?.id || concern?.value || "").trim(),
        String(concern?.label || concern?.title || "").trim(),
      ])
      .filter(([id, title]) => id && title),
  );

  return rows.map((row) => {
    const client = clientsById.get(String(row.userId || "").trim());
    const concernTitle =
      concernTitleById.get(String(row.healthConcernId || "").trim()) ||
      client?.goal ||
      "";
    const userName = isPlaceholder(row.userName, PLACEHOLDER_USER)
      ? (client?.name || row.userName || "Client")
      : row.userName;
    const coachFromClient = client?.coach && !String(client.coach).startsWith("—")
      ? client.coach
      : "";
    const coachName = isPlaceholder(row.coachName, PLACEHOLDER_COACH)
      ? (coachFromClient || row.coachName || "—")
      : row.coachName;
    const type = String(row.productType || "").toLowerCase();
    let programType = row.programType;
    const existingLabel = String(programType || "").trim().toLowerCase();
    if (type === "consultancy" || existingLabel === "pwc" || existingLabel === "consultancy") {
      programType = "Consultation";
    } else if (isPlaceholder(programType, PLACEHOLDER_PROGRAM) && concernTitle) {
      programType = type === "subscription" || type === "energy_exchange"
        ? `App user · ${concernTitle}`
        : concernTitle;
    }
    return {
      ...row,
      userName,
      coachName,
      programType,
    };
  });
}
