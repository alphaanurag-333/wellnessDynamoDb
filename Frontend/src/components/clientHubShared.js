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
  { id: "wellness-prescriptions", label: "Wellness prescriptions" },
  { id: "internal-parameters", label: "Internal parameters" },
  { id: "physical-exercises", label: "Physical exercises" },
  { id: "mental-wellbeing", label: "Mental wellbeing" },
  { id: "daily-reflection", label: "Daily reflection" },
  { id: "supplement-recommendations", label: "Supplements" },
  { id: "supplement-dosage", label: "Dosage" },
  { id: "meal-tracking", label: "Meal tracking" },
  { id: "health-progress", label: "Health progress" },
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
  "wellness-prescriptions": "wellness-prescriptions",
  "test-recommendations": "internal-parameters",
  "physical-exercises": "physical-exercises",
  "mental-wellbeing": "mental-wellbeing",
  "daily-reflection": "daily-reflection",
  "supplement-recommendations": "supplement-recommendations",
  "supplement-dosage": "supplement-dosage",
  "meal-tracking": "meal-tracking",
  "health-progress": "health-progress",
  "launch-assessment": "launch-assessment",
  "prakruti-assessment": "prakruti-assessment",
};

export function resolveClientHubTab(tab, tier) {
  const allowed = getClientHubTabs(tier);
  const ids = new Set(allowed.map((t) => t.id));
  if (tab && ids.has(tab)) return tab;
  return allowed[0]?.id || "water";
}
