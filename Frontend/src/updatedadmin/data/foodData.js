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
    macros: { protein: 4, carbs: 22, fat: 1, calories: 118 },
    aiStatus: "review",
  },
  {
    id: "breakfast",
    name: "Breakfast",
    time: "9:00 AM",
    detailedTags: ["2 egg whites", "1 slice multigrain toast", "1 tsp ghee"],
    macros: null,
    aiStatus: "none",
  },
  {
    id: "lunch",
    name: "Meal 1 · Lunch",
    time: "1:10 PM",
    detailedTags: ["1 bowl dal", "2 rotis", "salad"],
    macros: null,
    aiStatus: "none",
  },
  {
    id: "snack",
    name: "Snack",
    time: "4:30 PM",
    detailedTags: ["Handful almonds", "Green tea"],
    macros: null,
    aiStatus: "none",
  },
  {
    id: "dinner",
    name: "Dinner",
    time: "8:00 PM",
    detailedTags: ["Grilled paneer", "Sauteed vegetables"],
    macros: null,
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

export function formatFoodDateLabel(date, today = FOOD_DEMO_TODAY) {
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
