export function isHealTier(tier) {
  return String(tier || "").toLowerCase() === "heal";
}

export const CLIENT_HUB_BASIC_TABS = [
  { id: "water", label: "Water tracking" },
  { id: "steps", label: "Steps tracking" },
];

export const CLIENT_HUB_HEAL_EXTRA_TABS = [
  { id: "reminders", label: "Reminders" },
  { id: "diet-plan", label: "Diet plan" },
  { id: "internal-parameters", label: "Internal parameters" },
  { id: "physical-exercises", label: "Physical exercises" },
  { id: "meal-tracking", label: "Meal tracking" },
  { id: "launch-assessment", label: "LAUNCH assessment" },
  { id: "prakruti-assessment", label: "Prakruti assessment" },
];

export function getClientHubTabs(tier) {
  return isHealTier(tier) ? [...CLIENT_HUB_BASIC_TABS, ...CLIENT_HUB_HEAL_EXTRA_TABS] : CLIENT_HUB_BASIC_TABS;
}

export function getClientHubModuleCount(tier) {
  return getClientHubTabs(tier).length;
}

export const LEGACY_TAB_REDIRECTS = {
  "water-tracking": "water",
  "steps-tracking": "steps",
  reminders: "reminders",
  "diet-plan": "diet-plan",
  "test-recommendations": "internal-parameters",
  "physical-exercises": "physical-exercises",
  "meal-tracking": "meal-tracking",
  "launch-assessment": "launch-assessment",
  "prakruti-assessment": "prakruti-assessment",
};

export function resolveClientHubTab(tab, tier) {
  const allowed = getClientHubTabs(tier);
  const ids = new Set(allowed.map((t) => t.id));
  if (tab && ids.has(tab)) return tab;
  return allowed[0]?.id || "water";
}
