const PRAKRUTI_TYPES = [
  "vata",
  "pitta",
  "kapha",
  "vata_pitta",
  "pitta_kapha",
  "kapha_vata",
  "sama_prakriti",
];

const PRAKRUTI_TYPE_LABELS = {
  vata: "Vata",
  pitta: "Pitta",
  kapha: "Kapha",
  vata_pitta: "Vata-Pitta",
  pitta_kapha: "Pitta-Kapha",
  kapha_vata: "Kapha-Vata",
  sama_prakriti: "Sama Prakriti",
};

function normalizePrakrutiType(value) {
  const next = String(value || "").trim().toLowerCase();
  return PRAKRUTI_TYPES.includes(next) ? next : null;
}

function prakrutiTypeLabel(value) {
  const key = normalizePrakrutiType(value);
  return key ? PRAKRUTI_TYPE_LABELS[key] : value || "—";
}

module.exports = {
  PRAKRUTI_TYPES,
  PRAKRUTI_TYPE_LABELS,
  normalizePrakrutiType,
  prakrutiTypeLabel,
};
