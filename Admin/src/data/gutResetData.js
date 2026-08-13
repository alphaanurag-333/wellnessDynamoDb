export const GUT_RESET_PRESETS = [
  {
    id: "gentle-3",
    label: "3-day gentle reset",
    points: [
      "Warm lemon water on waking, 500 ml",
      "Light cooked meals only — no dairy or wheat",
      "Fruit and veggie day on day 3",
    ],
  },
  {
    id: "deep-5",
    label: "5-day deep reset",
    points: [
      "Warm lemon water on waking, 500 ml",
      "No cooked food for the first two days",
      "Fruit and veggie only on day 3",
      "24-hour water fast on day 4",
      "Reintroduce khichdi and buttermilk on day 5",
    ],
  },
];

export const GUT_RESET_HISTORY = [
  {
    id: "reset-completed-1",
    status: "completed",
    startDate: "2026-05-04",
    fruitVegDate: "2026-05-07",
    waterFastDate: "2026-05-10",
    author: "Anita Rao",
    points: [
      "Stop all dairy, wheat and refined sugar from day 1",
      "Warm lemon water on waking, 500 ml",
      "Fruit and veggie only — no cooked food, no salt",
      "Water fasting for 24 hours, break with coconut water",
      "Reintroduce khichdi on the day after fasting",
    ],
  },
];

export function formatGutDate(iso) {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function gutResetSummary(history) {
  const completed = history.filter((entry) => entry.status === "completed");
  const latest = completed[0] ?? history.find((entry) => entry.status === "active") ?? history[0];
  return {
    resetsDone: history.length,
    lastStart: latest ? formatGutDate(latest.startDate) : "—",
    lastStartBy: latest?.author ?? "—",
    lastFruitVeg: latest ? formatGutDate(latest.fruitVegDate) : "—",
    lastWaterFast: latest ? formatGutDate(latest.waterFastDate) : "—",
  };
}
