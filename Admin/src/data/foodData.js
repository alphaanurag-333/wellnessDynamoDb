export const FOOD_MACRO_TARGETS = {
  protein: 109,
  carbs: 253,
  fat: 59,
  calories: 1980,
  bmr: 1368,
  tdee: 1980,
};

export const FOOD_MEALS = [
  {
    id: "juice",
    name: "Functional juice",
    time: "7:30 AM",
    detailedTags: ["1 glass amla-beetroot juice", "5 g chia seeds"],
    macros: null,
    photoUrl: "",
    photoAiStatus: "none",
    reviewStatus: "pending",
    aiStatus: "none",
  },
  {
    id: "breakfast",
    name: "Breakfast",
    time: "9:00 AM",
    detailedTags: ["2 egg whites", "1 slice multigrain toast", "1 tsp ghee"],
    macros: null,
    photoUrl: "",
    photoAiStatus: "none",
    reviewStatus: "pending",
    aiStatus: "none",
  },
  {
    id: "lunch",
    name: "Meal 1 · Lunch",
    time: "1:10 PM",
    detailedTags: ["1 bowl dal", "2 rotis", "salad"],
    macros: null,
    photoUrl: "",
    photoAiStatus: "none",
    reviewStatus: "pending",
    aiStatus: "none",
  },
  {
    id: "snack",
    name: "Snack",
    time: "4:30 PM",
    detailedTags: ["Handful almonds", "Green tea"],
    macros: null,
    photoUrl: "",
    photoAiStatus: "none",
    reviewStatus: "pending",
    aiStatus: "none",
  },
  {
    id: "dinner",
    name: "Dinner",
    time: "8:00 PM",
    detailedTags: ["Grilled paneer", "Sauteed vegetables"],
    macros: null,
    photoUrl: "",
    photoAiStatus: "none",
    reviewStatus: "pending",
    aiStatus: "none",
  },
];

export const FOOD_DEMO_TODAY = new Date(2026, 6, 22);

export function formatWaterRangeLabel(from, to) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fromStr = `${months[from.getMonth()]} ${String(from.getDate()).padStart(2, "0")}`;
  const toStr = `${months[to.getMonth()]} ${String(to.getDate()).padStart(2, "0")}`;
  return `${fromStr} – ${toStr}`;
}

const WATER_VALUE_PATTERN = [6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7];

export function buildWaterChart(from, to, today = FOOD_DEMO_TODAY) {
  const days = [];
  const cursor = new Date(from);
  const end = new Date(to);
  let index = 0;

  while (cursor <= end) {
    days.push({
      day: String(cursor.getDate()).padStart(2, "0"),
      value: WATER_VALUE_PATTERN[index % WATER_VALUE_PATTERN.length],
      date: new Date(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }

  const values = days.map((d) => d.value);
  const avg = values.length
    ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    : 0;
  const todayEntry = days.find((d) => d.date.toDateString() === today.toDateString());

  return {
    rangeLabel: formatWaterRangeLabel(from, to),
    from: new Date(from),
    to: new Date(to),
    avg,
    today: todayEntry?.value ?? values[values.length - 1] ?? 0,
    todayDay: todayEntry ? String(today.getDate()).padStart(2, "0") : null,
    days: days.map(({ day, value }) => ({ day, value })),
  };
}

export const DEFAULT_WATER_RANGE = {
  from: new Date(2026, 6, 9),
  to: new Date(2026, 6, 22),
};

export const WATER_CHART = buildWaterChart(DEFAULT_WATER_RANGE.from, DEFAULT_WATER_RANGE.to);

export const FOOD_DATE_LABEL = "Today · Wed, 22 Jul";

export const DIET_PLAN_SECTIONS = [
  {
    id: "empty-stomach",
    title: "Empty stomach",
    rows: [
      {
        id: "es-1",
        label: "Option 1",
        description: "Functional juice / Ashgourd juice / Aloevera juice",
        quantity: "250 – 300 ml",
      },
      {
        id: "es-2",
        label: "Option 2",
        description: "Turmeric ginger water — Turmeric ½ tsp + 1 inch ginger juice in water",
        quantity: "250 – 300 ml",
      },
      {
        id: "es-3",
        label: "Option 3",
        description: "Mix detox juice — ½ Lemon + ½ tsp Turmeric + ½ inch Ginger juice + pinch of Cinnamon in water",
        quantity: "250 – 300 ml",
      },
    ],
  },
  {
    id: "pre-lunch",
    title: "Pre 1st Meal / Lunch",
    rows: [
      {
        id: "pl-1",
        label: "Salad (20 mins before lunch)",
        description: "Cucumber + tomato + carrot / beetroot",
        quantity: "350 – 400 gms",
      },
      {
        id: "pl-2",
        label: "Protein (10 mins before lunch)",
        description: "Plant / whey protein",
        quantity: "1 scoop",
      },
    ],
  },
  {
    id: "lunch",
    title: "1st Meal / Lunch",
    rows: [
      {
        id: "l-1",
        label: "Option 1",
        description: "Besan jowar / makke roti + Palak paneer / Lauki sabji + Curd",
        quantity: "2 roti + 150 gms sabji + 150 gms curd",
      },
      {
        id: "l-2",
        label: "Option 2",
        description: "Ragi roti + Chana masala + Bhindi bhaji + Buttermilk",
        quantity: "2 roti + 150 gms sabji + 200 ml chaas",
      },
      {
        id: "l-3",
        label: "Option 3",
        description: "Rice + Rajma / Chole / Channa sabji + Bhindi bhaji + Chaas",
        quantity: "150 gms cooked rice + 150 gms sabji + 200 ml chaas",
      },
      {
        id: "l-4",
        label: "Option 4",
        description: "Multigrain roti + Dal tadka + Mix veg + Salad",
        quantity: "2 roti + 150 gms dal + 150 gms veg",
      },
    ],
  },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function localToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatFoodDateLabel(date, today = localToday()) {
  const isToday = date.toDateString() === today.toDateString();
  const label = `${DAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
  return isToday ? `Today · ${label}` : label;
}

export function formatFoodDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseFoodDateInput(value) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function macroPct(consumed, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((consumed / target) * 100));
}

export function sumMealMacros(meals) {
  return meals.reduce(
    (acc, meal) => {
      if (!meal.macros) return acc;
      if (meal.reviewStatus === "rejected" || meal.aiStatus === "rejected") return acc;
      if (meal.photoAiStatus === "declined" || meal.photoAiStatus === "none" || meal.photoAiStatus === "failed") return acc;
      if (meal.aiStatus === "none" || meal.aiStatus === "declined") return acc;
      return {
        protein: acc.protein + meal.macros.protein,
        carbs: acc.carbs + meal.macros.carbs,
        fat: acc.fat + meal.macros.fat,
        calories: acc.calories + meal.macros.calories,
      };
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  );
}

export function roundMacros(macros) {
  return {
    protein: Math.round(Number(macros?.protein) || 0),
    carbs: Math.round(Number(macros?.carbs) || 0),
    fat: Math.round(Number(macros?.fat) || 0),
    calories: Math.round(Number(macros?.calories) || 0),
  };
}

export function macroTargetsFromTdee(tdee, bmr = 0) {
  const calories = Math.round(Number(tdee) || 0);
  const bmrVal = Math.round(Number(bmr) || 0);
  if (!calories) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0, bmr: bmrVal, tdee: 0 };
  }
  return {
    protein: Math.round((calories * 0.22) / 4),
    carbs: Math.round((calories * 0.51) / 4),
    fat: Math.round((calories * 0.27) / 9),
    calories,
    bmr: bmrVal,
    tdee: calories,
  };
}

export function latestBmrTdee(metrics = []) {
  const rows = (Array.isArray(metrics) ? metrics : [])
    .filter((row) => Number(row?.bmr) > 0 || Number(row?.tdee) > 0)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.recordedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.recordedAt || b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  const preferred = rows.find((row) => String(row.metricType || "").toLowerCase() === "bmr") || rows[0];
  return {
    bmr: Number(preferred?.bmr) || 0,
    tdee: Number(preferred?.tdee) || 0,
  };
}

const MEAL_CATEGORY_LABELS = {
  functional_juice: "Functional juice",
  salad: "Salad",
  meal: "Meal",
  beverage: "Beverage",
  snacks: "Snack",
  protein: "Protein",
};

export function formatMealEntryTime(hhmm) {
  const raw = String(hhmm || "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return "";
  const [hours, minutes] = raw.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function mealReviewStatus(status) {
  const next = String(status || "approved").toLowerCase();
  if (next === "pending_review") return "pending";
  if (next === "rejected") return "rejected";
  return "approved";
}

function mealPhotoAiStatus(log) {
  const explicit = String(log?.aiStatus || "").toLowerCase();
  if (explicit === "analysed" || explicit === "declined" || explicit === "failed" || explicit === "none") {
    return explicit;
  }
  const review = mealReviewStatus(log?.status);
  if (review === "rejected") return "declined";
  if (review === "pending" && String(log?.loggedByRole || "") === "user") return "none";
  return "analysed";
}

function mealUiStatus(reviewStatus, photoAiStatus) {
  if (reviewStatus === "rejected") return "rejected";
  // Coach-approved macros (incl. manual insert) win over pending AI photo state.
  if (reviewStatus === "approved") return "approved";
  if (photoAiStatus === "declined") return "declined";
  if (photoAiStatus === "none" || photoAiStatus === "failed") return "none";
  if (reviewStatus === "pending") return "review";
  return "approved";
}

export function mapMealLogToUi(log) {
  const category = String(log?.category || "meal");
  const mealType = String(log?.mealType || "").trim();
  const catLabel = MEAL_CATEGORY_LABELS[category] || "Meal";
  const name = mealType ? `${catLabel} · ${mealType}` : catLabel;
  const items = Array.isArray(log?.items) ? log.items : [];
  const itemTags = items
    .map((item) => {
      const itemName = String(item?.name || "").trim();
      if (!itemName) return "";
      const qty = Number(item?.quantityGm);
      return Number.isFinite(qty) && qty > 0 ? `${itemName} · ${qty} g` : itemName;
    })
    .filter(Boolean);
  const description = String(log?.description || "").trim();
  const detailedTags = itemTags;
  const loggedBy = String(log?.loggedByRole || "") === "user" ? "entered by client" : "logged by coach";
  const reviewStatus = mealReviewStatus(log?.status);
  const photoAiStatus = mealPhotoAiStatus(log);
  const uiStatus = mealUiStatus(reviewStatus, photoAiStatus);
  const hasCountableMacros = photoAiStatus === "analysed" || reviewStatus === "approved";

  return {
    id: String(log?.id || log?._id || ""),
    name,
    time: formatMealEntryTime(log?.entryTime),
    description,
    detailedTags,
    macros: hasCountableMacros
      ? roundMacros({
        protein: log?.proteinGm,
        carbs: log?.carbsGm,
        fat: log?.fatsGm,
        calories: log?.caloriesKcal,
      })
      : null,
    aiStatus: uiStatus,
    reviewStatus,
    photoAiStatus,
    photoUrl: log?.photoUrl || "",
    declineMessage: String(log?.aiError || log?.rejectionReason || "").trim(),
    loggedBy,
    date: log?.date || "",
  };
}

export function buildWaterChartFromHistory(history, from, to, today = localToday()) {
  const days = (Array.isArray(history) ? history : []).map((row) => {
    const date = parseFoodDateInput(row.date) || new Date(row.date);
    return {
      day: String(date && !Number.isNaN(date.getTime()) ? date.getDate() : row.day || "").padStart(2, "0"),
      value: Number(row.glassCount) || 0,
      date,
    };
  });
  const values = days.map((d) => d.value);
  const avg = values.length
    ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    : 0;
  const todayKey = formatFoodDateInput(today);
  const todayEntry = (Array.isArray(history) ? history : []).find((row) => row.date === todayKey);

  return {
    rangeLabel: formatWaterRangeLabel(from, to),
    from: new Date(from),
    to: new Date(to),
    avg,
    today: Number(todayEntry?.glassCount) || values[values.length - 1] || 0,
    todayDay: todayEntry ? String(today.getDate()).padStart(2, "0") : null,
    days: days.map(({ day, value }) => ({ day, value })),
  };
}

const SLOT_TITLES = {
  breakfast: "Breakfast",
  lunch: "1st Meal / Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function mapDietAssignmentToSections(assignment) {
  const plans = Array.isArray(assignment?.plans) ? assignment.plans : [];
  const sections = [];
  plans.forEach((plan, planIndex) => {
    const meals = Array.isArray(plan.meals) ? plan.meals : [];
    if (meals.length) {
      const bySlot = new Map();
      meals.forEach((meal) => {
        const slot = String(meal.slot || "meal").toLowerCase();
        if (!bySlot.has(slot)) bySlot.set(slot, []);
        bySlot.get(slot).push(meal);
      });
      bySlot.forEach((slotMeals, slot) => {
        sections.push({
          id: `${plan.planId || planIndex}-${slot}`,
          title: SLOT_TITLES[slot] || plan.name || slot,
          rows: slotMeals.map((meal, i) => ({
            id: meal.mealId || `${slot}-${i}`,
            label: meal.title || `Option ${i + 1}`,
            description: meal.foods || meal.notes || "—",
            quantity: meal.notes || (meal.calories != null ? `${meal.calories} kcal` : "—"),
          })),
        });
      });
      return;
    }
    if (plan.description) {
      sections.push({
        id: plan.planId || `plan-${planIndex}`,
        title: plan.name || `Plan ${planIndex + 1}`,
        rows: [
          {
            id: `${plan.planId || planIndex}-desc`,
            label: plan.category || "Plan",
            description: plan.description,
            quantity: plan.type || "—",
          },
        ],
      });
    }
  });
  return sections;
}
