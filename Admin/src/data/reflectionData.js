export const DEFAULT_BEDTIME = "22:30";

export const TRACKING_ROWS = [
  { key: "steps", name: "Steps", unit: "steps" },
  { key: "water", name: "Water", unit: "glasses" },
  { key: "nutrition", name: "Nutritions", unit: "doses" },
  { key: "meal", name: "Meal tracking", unit: "meals" },
];

export function unitLabel(unit) {
  if (unit === "cycles") return "cycles";
  if (unit === "times") return "times";
  if (unit === "mins") return "mins";
  if (unit === "boolean") return "yes / no";
  return unit || "";
}

export function groupActivities(activities = []) {
  const groups = [];
  const index = new Map();
  for (const activity of activities) {
    const name = activity.section || "Activities";
    if (!index.has(name)) {
      index.set(name, groups.length);
      groups.push({ id: name, name, activities: [] });
    }
    groups[index.get(name)].activities.push(activity);
  }
  return groups;
}

export function activitiesPayload(activities = []) {
  const payload = {};
  for (const activity of activities) {
    payload[activity.key] = {
      enabled: Boolean(activity.enabled),
      goal: Number(activity.goal) || 0,
    };
  }
  return payload;
}

export function selectedQuestionCount(sections = []) {
  return sections.reduce(
    (sum, section) => sum + (section.questions || []).filter((question) => question.selected).length,
    0,
  );
}

export function totalQuestionCount(sections = []) {
  return sections.reduce((sum, section) => sum + (section.questions || []).length, 0);
}

export function selectedSectionPoints(section) {
  const questions = section?.questions || [];
  const earned = questions.reduce((sum, question) => (
    question.selected ? sum + (Number(question.points) || 0) : sum
  ), 0);
  const max = questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  return {
    earned,
    max,
    label: `${earned} / ${max} pts`,
  };
}

export function selectedWeightage(sections = []) {
  return sections.reduce((sum, section) => {
    const hasSelected = (section.questions || []).some((question) => question.selected);
    return hasSelected ? sum + (Number(section.weight) || 0) : sum;
  }, 0);
}

export function formatBedtime(value) {
  if (!value) return "10:30 PM";
  const [h, m] = String(value).split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m || "00"} ${suffix}`;
}

export function formatUnlockTime(value) {
  const raw = value || DEFAULT_BEDTIME;
  const [h, m] = String(raw).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return formatBedtime(raw);
  const total = ((h * 60 + m) - 30 + 24 * 60) % (24 * 60);
  const unlockH = Math.floor(total / 60);
  const unlockM = String(total % 60).padStart(2, "0");
  return formatBedtime(`${String(unlockH).padStart(2, "0")}:${unlockM}`);
}
