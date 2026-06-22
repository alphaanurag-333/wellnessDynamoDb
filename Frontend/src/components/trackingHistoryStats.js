export const TRACKING_HISTORY_DEFAULT_DAYS = 7;

export function formatCompactCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

export function formatFullCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

export function dayProgressPercent(value, goal) {
  const g = Number(goal);
  const v = Number(value) || 0;
  if (!Number.isFinite(g) || g <= 0) return 0;
  return Math.min(100, Math.round((v / g) * 100));
}

export function computePeriodStats(rows, getValue, getGoal) {
  let total = 0;
  let daysGoalMet = 0;
  let activeDays = 0;
  let totalGoalTarget = 0;

  for (const row of rows) {
    const value = Math.max(0, Number(getValue(row)) || 0);
    const goal = Math.max(0, Number(getGoal(row)) || 0);
    total += value;
    totalGoalTarget += goal;
    if (value > 0) activeDays += 1;
    if (goal > 0 && value >= goal) daysGoalMet += 1;
  }

  const totalDays = rows.length;
  const overallPercent =
    totalGoalTarget > 0 ? Math.min(100, Math.round((total / totalGoalTarget) * 100)) : 0;
  const averagePerDay = totalDays > 0 ? Math.round(total / totalDays) : 0;
  const averageActiveDay = activeDays > 0 ? Math.round(total / activeDays) : 0;

  return {
    total,
    totalDays,
    activeDays,
    daysGoalMet,
    totalGoalTarget,
    overallPercent,
    averagePerDay,
    averageActiveDay,
  };
}
