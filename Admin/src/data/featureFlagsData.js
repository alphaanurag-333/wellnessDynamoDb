export const FEATURE_FLAGS = [
  {
    id: "flag-ai-health-insights",
    name: "AI health insights",
    note: "Personalised insight cards on the client dashboard",
    target: "both",
    rollout: 100,
    on: true,
  },
  {
    id: "flag-prakruti",
    name: "Prakruti self-assessment",
    note: "Dosha questionnaire in onboarding",
    target: "app",
    rollout: 75,
    on: true,
  },
  {
    id: "flag-group-challenges",
    name: "Group challenges",
    note: "Team-based wellness challenges with leaderboards",
    target: "app",
    rollout: 40,
    on: true,
  },
  {
    id: "flag-web-booking",
    name: "Web booking widget",
    note: "Consultation booking embed for the marketing site",
    target: "web",
    rollout: 100,
    on: true,
  },
  {
    id: "flag-video-library-v2",
    name: "Video library v2",
    note: "Redesigned media browser with categories",
    target: "both",
    rollout: 20,
    on: false,
  },
  {
    id: "flag-referral-rewards",
    name: "Referral rewards",
    note: "Invite-a-friend credits programme",
    target: "both",
    rollout: 0,
    on: false,
  },
];

export const FEATURE_FLAG_TARGETS = [
  { id: "app", label: "App" },
  { id: "web", label: "Web" },
  { id: "both", label: "Both" },
];

export function featureFlagTargetLabel(target) {
  return FEATURE_FLAG_TARGETS.find((entry) => entry.id === target)?.label || target;
}

export function nextFeatureFlagTarget(target) {
  const order = ["app", "web", "both"];
  const index = order.indexOf(target);
  return order[(index + 1) % order.length];
}
