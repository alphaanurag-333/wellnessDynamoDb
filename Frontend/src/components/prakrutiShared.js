export const PRAKRUTI_TYPES = [
  { value: "vata", label: "Vata" },
  { value: "pitta", label: "Pitta" },
  { value: "kapha", label: "Kapha" },
  { value: "vata_pitta", label: "Vata-Pitta" },
  { value: "pitta_kapha", label: "Pitta-Kapha" },
  { value: "kapha_vata", label: "Kapha-Vata" },
  { value: "sama_prakriti", label: "Sama Prakriti" },
];

export const PRAKRUTI_LIST_SEARCH_MAX_LEN = 50;
export const PRAKRUTI_THING_PAGE_SIZE = 8;
export const PRAKRUTI_QUESTION_PAGE_SIZE = 10;

export function prakrutiTypeLabel(value) {
  const row = PRAKRUTI_TYPES.find((t) => t.value === value);
  return row?.label || value || "—";
}

export function groupQuestionsByCategory(questions) {
  const groups = [];
  let current = null;
  for (const q of questions || []) {
    const cat = q.category || "General";
    if (!current || current.category !== cat) {
      current = { category: cat, items: [] };
      groups.push(current);
    }
    current.items.push(q);
  }
  return groups;
}
