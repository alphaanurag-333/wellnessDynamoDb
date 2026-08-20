export const DEFAULT_BEDTIME = "22:30";

export function sectionPoints(section) {
  const questions = section?.questions || [];
  const earned = questions.reduce((sum, q) => sum + Number(q.score || 0), 0);
  const max = questions.reduce((sum, q) => sum + Number(q.max || 10), 0);
  return {
    earned,
    max,
    label: `${earned} / ${max}`,
  };
}

export function totalWeightage(sections = []) {
  return sections.reduce((sum, s) => sum + Number(s.weight || 0), 0);
}

export function totalReflectionPoints(sections = []) {
  return sections.reduce(
    (acc, section) => {
      const pts = sectionPoints(section);
      return { earned: acc.earned + pts.earned, max: acc.max + pts.max };
    },
    { earned: 0, max: 0 },
  );
}

export function scoreOutOfTen(earned, max) {
  if (!(max > 0)) return 0;
  return Math.round((Number(earned) / Number(max)) * 100) / 10;
}

export function mapApiSectionsToForm(sections = []) {
  return (sections || [])
    .map((section) => {
      const questions = (section.questions || [])
        .filter((question) => question.selected !== false || question.fixed)
        .map((question) => ({
          id: question.id,
          text: question.name || question.text || "",
          score: Number.isFinite(Number(question.score)) ? Number(question.score) : 7,
          max: Number.isFinite(Number(question.max)) ? Number(question.max) : 10,
          fixed: Boolean(question.fixed),
          selected: true,
          fromBank: true,
        }));
      return {
        id: section.id,
        title: section.name || section.title || "Section",
        weight: Number(section.weight) || 0,
        locked: Boolean(section.fixed),
        expanded: true,
        questions,
      };
    })
    .filter((section) => section.questions.length > 0);
}

export function selectedQuestionIdsFromForm(sections = []) {
  return sections.flatMap((section) =>
    (section.questions || [])
      .filter((question) => question.selected !== false && question.fromBank)
      .map((question) => question.id),
  );
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
