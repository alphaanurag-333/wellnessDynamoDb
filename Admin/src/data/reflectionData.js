export const DEFAULT_BEDTIME = "22:30";

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
