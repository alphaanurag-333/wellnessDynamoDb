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

/** Fallback that matches the dashboard mock so filters still work without live stats. */
export const MOCK_REVENUE_ANALYTICS = {
  asOf: "2026-08-18T00:00:00.000Z",
  asOfLabel: "18 Aug 2026",
  fyStartMonth: 4,
  currentFyStartYear: 2026,
  currentMonth: "2026-08",
  totalRevenue: 3999000,
  products: [
    { key: "program", name: "Wellness program", value: 3234000, pct: 81, color: PRODUCT_COLORS.program },
    { key: "consultancy", name: "PWC", value: 183000, pct: 5, color: PRODUCT_COLORS.consultancy },
    { key: "app", name: "App users", value: 582000, pct: 15, color: PRODUCT_COLORS.app },
  ],
  avgPerClient: 21047,
  payingClientCount: 190,
  financialYears: [
    fyFromMonths(2026, [
      { month: "2026-04", program: 254000, consultancy: 18000, app: 42000, onboarded: 23 },
      { month: "2026-05", program: 270000, consultancy: 19000, app: 45000, onboarded: 17 },
      { month: "2026-06", program: 282000, consultancy: 20000, app: 48000, onboarded: 26 },
      { month: "2026-07", program: 280000, consultancy: 15000, app: 50000, onboarded: 31 },
      { month: "2026-08", program: 265000, consultancy: 14000, app: 41000, onboarded: 12 },
    ]),
    fyFromMonths(2025, [
      { month: "2025-04", program: 198000, consultancy: 12000, app: 28000, onboarded: 14 },
      { month: "2025-05", program: 210000, consultancy: 13000, app: 31000, onboarded: 11 },
      { month: "2025-06", program: 226000, consultancy: 14000, app: 33000, onboarded: 16 },
      { month: "2025-07", program: 238000, consultancy: 15000, app: 36000, onboarded: 18 },
      { month: "2025-08", program: 244000, consultancy: 14000, app: 34000, onboarded: 15 },
      { month: "2025-09", program: 251000, consultancy: 16000, app: 37000, onboarded: 19 },
      { month: "2025-10", program: 259000, consultancy: 15000, app: 39000, onboarded: 21 },
      { month: "2025-11", program: 248000, consultancy: 13000, app: 35000, onboarded: 17 },
      { month: "2025-12", program: 262000, consultancy: 17000, app: 40000, onboarded: 20 },
      { month: "2026-01", program: 270000, consultancy: 16000, app: 38000, onboarded: 18 },
      { month: "2026-02", program: 255000, consultancy: 14000, app: 36000, onboarded: 16 },
      { month: "2026-03", program: 268000, consultancy: 15000, app: 39000, onboarded: 22 },
    ]),
  ],
};

export function resolveRevenueAnalytics(statistics) {
  const live = statistics?.revenueAnalytics;
  if (live?.financialYears?.length) return live;
  if (!statistics) return MOCK_REVENUE_ANALYTICS;
  return fromLegacyStatistics(statistics);
}

function fromLegacyStatistics(statistics) {
  const monthRows = Array.isArray(statistics.charts?.revenueByMonth)
    ? statistics.charts.revenueByMonth
    : [];
  const products = Array.isArray(statistics.charts?.revenueByProduct)
    ? statistics.charts.revenueByProduct.map((row) => ({
        key: row.key,
        name: row.name,
        value: asRevenueNumber(row.value),
        pct: asRevenueNumber(row.pct) || 0,
        color: PRODUCT_COLORS[row.key] || PRODUCT_COLORS.program,
      }))
    : MOCK_REVENUE_ANALYTICS.products;
  const months = monthRows.map((row) => {
    const program = asRevenueNumber(row.program ?? row.revenue);
    const consultancy = asRevenueNumber(row.consultancy);
    const app = asRevenueNumber(row.app);
    const total = asRevenueNumber(row.revenue ?? program + consultancy + app);
    return {
      ...monthRow({
        month: row.month || `2026-${String(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(row.label) + 1).padStart(2, "0")}`,
        program,
        consultancy,
        app: app || Math.max(0, total - program - consultancy),
      }),
      payments: Array.isArray(row.payments) ? row.payments : [],
    };
  });
  const fyStartYear = MOCK_REVENUE_ANALYTICS.currentFyStartYear;
  return {
    ...MOCK_REVENUE_ANALYTICS,
    asOfLabel: "today",
    totalRevenue: asRevenueNumber(statistics.revenueAndPayouts),
    products: products.length ? products : MOCK_REVENUE_ANALYTICS.products,
    avgPerClient: asRevenueNumber(statistics.revenueAndPayouts) && asRevenueNumber(statistics.totalUsers)
      ? asRevenueNumber(statistics.revenueAndPayouts) / Math.max(1, asRevenueNumber(statistics.totalUsers))
      : 0,
    financialYears: [
      {
        fyStartYear,
        label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
        months: months.length ? months : MOCK_REVENUE_ANALYTICS.financialYears[0].months,
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
    let programType = row.programType;
    if (isPlaceholder(programType, PLACEHOLDER_PROGRAM) && concernTitle) {
      const type = String(row.productType || "").toLowerCase();
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
