export function isHealTier(tier) {
  return String(tier || "").toLowerCase() === "heal";
}

export const CLIENT_HUB_TABS = {
  water: { id: "water", label: "Water tracking", shortLabel: "Water" },
  steps: { id: "steps", label: "Steps tracking", shortLabel: "Steps" },
  reminders: { id: "reminders", label: "Reminders", shortLabel: "Reminders" },
  "diet-plan": { id: "diet-plan", label: "Diet plan", shortLabel: "Diet plan" },
  "wellness-prescriptions": {
    id: "wellness-prescriptions",
    label: "Wellness prescriptions",
    shortLabel: "Prescriptions",
  },
  "commitment-letter": { id: "commitment-letter", label: "Commitment letter", shortLabel: "Commitment" },
  "coach-message": { id: "coach-message", label: "Coach message", shortLabel: "Coach message" },
  "internal-parameters": { id: "internal-parameters", label: "Internal parameters", shortLabel: "Internal params" },
  "physical-exercises": { id: "physical-exercises", label: "Physical exercises", shortLabel: "Exercises" },
  "mental-wellbeing": { id: "mental-wellbeing", label: "Mental wellbeing", shortLabel: "Mental wellbeing" },
  "daily-reflection": { id: "daily-reflection", label: "Daily reflection", shortLabel: "Daily reflection" },
  "supplement-recommendations": { id: "supplement-recommendations", label: "Supplements", shortLabel: "Supplements" },
  "supplement-dosage": { id: "supplement-dosage", label: "Dosage", shortLabel: "Dosage" },
  "meal-tracking": { id: "meal-tracking", label: "Meal tracking", shortLabel: "Meals" },
  "health-progress": { id: "health-progress", label: "Health progress", shortLabel: "Health progress" },
  "metabolic-metrics": { id: "metabolic-metrics", label: "Metabolic health", shortLabel: "Metabolic" },
  "launch-assessment": { id: "launch-assessment", label: "LAUNCH assessment", shortLabel: "LAUNCH" },
  "prakruti-assessment": { id: "prakruti-assessment", label: "Prakruti assessment", shortLabel: "Prakruti" },
};

export const CLIENT_HUB_BASIC_TAB_IDS = ["water", "steps"];

export const CLIENT_HUB_HEAL_EXTRA_TAB_IDS = [
  "reminders",
  "diet-plan",
  "wellness-prescriptions",
  "commitment-letter",
  "coach-message",
  "internal-parameters",
  "physical-exercises",
  "mental-wellbeing",
  "daily-reflection",
  "supplement-recommendations",
  "supplement-dosage",
  "meal-tracking",
  "health-progress",
  "metabolic-metrics",
  "launch-assessment",
  "prakruti-assessment",
];

export const CLIENT_HUB_TAB_GROUPS = [
  {
    id: "tracking",
    label: "Tracking",
    tabIds: ["water", "steps", "meal-tracking", "health-progress"],
  },
  {
    id: "metabolic-health",
    label: "Metabolic health",
    tabIds: ["metabolic-metrics"],
  },
  {
    id: "care",
    label: "Care plans",
    tabIds: ["reminders", "diet-plan", "wellness-prescriptions", "commitment-letter", "coach-message", "internal-parameters"],
  },
  {
    id: "wellness",
    label: "Wellness",
    tabIds: [
      "physical-exercises",
      "mental-wellbeing",
      "daily-reflection",
      "supplement-recommendations",
      "supplement-dosage",
    ],
  },
  {
    id: "assessments",
    label: "Assessments",
    tabIds: ["launch-assessment", "prakruti-assessment"],
  },
];

/** @deprecated Use getClientHubTabs() — kept for backward compatibility */
export const CLIENT_HUB_BASIC_TABS = CLIENT_HUB_BASIC_TAB_IDS.map((id) => CLIENT_HUB_TABS[id]);

/** @deprecated Use getClientHubTabs() — kept for backward compatibility */
export const CLIENT_HUB_HEAL_EXTRA_TABS = CLIENT_HUB_HEAL_EXTRA_TAB_IDS.map((id) => CLIENT_HUB_TABS[id]);

export function getClientHubTabIds(tier) {
  return isHealTier(tier)
    ? [...CLIENT_HUB_BASIC_TAB_IDS, ...CLIENT_HUB_HEAL_EXTRA_TAB_IDS]
    : CLIENT_HUB_BASIC_TAB_IDS;
}

export function getClientHubTabs(tier) {
  return getClientHubTabIds(tier).map((id) => CLIENT_HUB_TABS[id]);
}

export function getClientHubTabGroups(tier) {
  const allowedIds = new Set(getClientHubTabIds(tier));

  return CLIENT_HUB_TAB_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    tabs: group.tabIds.filter((id) => allowedIds.has(id)).map((id) => CLIENT_HUB_TABS[id]),
  })).filter((group) => group.tabs.length > 0);
}

export function getClientHubTabById(tabId) {
  return CLIENT_HUB_TABS[tabId] || null;
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
