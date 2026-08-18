export const ONBOARDING_STATS = {
  totalCoaches: 0,
  liveVideos: 0,
  awaitingUpload: 0,
  fallbackTag: "ONB-DEFAULT",
};

export function buildOnboardingStats(coaches = [], totalCoaches) {
  return {
    totalCoaches: Number.isFinite(totalCoaches) ? totalCoaches : coaches.length,
    liveVideos: coaches.filter((entry) => entry.live).length,
    awaitingUpload: coaches.filter((entry) => entry.status === "not-uploaded").length,
    fallbackTag: "ONB-DEFAULT",
  };
}

export function buildOnboardingAlert(coaches = []) {
  const missing = coaches.filter((entry) => !entry.live);
  if (!coaches.length) return "Add wellness coaches to attach an onboarding video for their clients.";
  if (!missing.length) return "Every coach has a live onboarding video.";
  if (missing.length === 1) {
    return `Clients of ${missing[0].name} see no coach video until one is uploaded.`;
  }
  const names = missing.map((entry) => entry.name);
  if (names.length === 2) {
    return `Clients of ${names[0]} and ${names[1]} see no coach video until their coach uploads one.`;
  }
  return `Clients of ${names.slice(0, -1).join(", ")} and ${names.at(-1)} see no coach video until their coach uploads one.`;
}

export const ONBOARDING_COACHES = [];
export const ONBOARDING_GALLERY = [];
export const ONBOARDING_GALLERY_PICKS = [];
export const ONBOARDING_GALLERY_OWNERS = ["All owners"];
