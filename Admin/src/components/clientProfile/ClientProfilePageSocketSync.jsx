import { useCallback, useRef } from "react";
import { useClientProfileInvalidation } from "../../hooks/useClientProfileInvalidation.js";
import { useClientProfileLiveSync } from "../../hooks/useClientProfileLiveSync.js";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

/** Backend `clientProfile.changed` domain → Admin menu section id */
export const CLIENT_PROFILE_SOCKET_DOMAIN_TO_SECTION = {
  glance: "glance",
  personal: "personal",
  body: "body",
  medical: "medical",
  internal: "internal",
  launch: "launch",
  food: "food",
  bms: "bms",
  nutritions: "nutritions",
  healthProgress: "health-progress",
  reflection: "reflection",
  prescription: "prescription",
  presentable: "presentable",
  exchange: "exchange",
  counselling: "counselling",
  protocol: "protocol",
  gut: "gut",
};

/** Domains listened per visible section (app + staff writes). */
export const CLIENT_PROFILE_SECTION_SOCKET_DOMAINS = {
  glance: ["glance", "food", "healthProgress", "body", "personal", "counselling", "bms"],
  personal: ["personal", "glance", "launch"],
  body: ["body", "food"],
  medical: ["medical"],
  // Lab uploads + recommendations; personal/glance cover onboarding step flips.
  internal: ["internal", "personal", "glance"],
  // Meetings + assessments + prakriti; personal/glance cover onboarding step flips.
  launch: ["launch", "personal", "glance"],
  food: ["food", "body"],
  bms: ["bms", "personal"],
  nutritions: ["nutritions"],
  "health-progress": ["healthProgress"],
  // Backend still emits glance/bms for daily reflection; listen to all three.
  reflection: ["reflection", "glance", "bms"],
  prescription: ["prescription"],
  presentable: ["presentable", "personal"],
  exchange: ["exchange"],
  counselling: ["counselling", "glance"],
  protocol: ["protocol"],
  gut: ["gut"],
  consultation: ["counselling", "glance"],
};

const SECTIONS_WITH_SECTION_SOCKET_HOOKS = new Set([
  "glance",
  "personal",
  "body",
  "medical",
  "internal",
  "launch",
  "food",
  "bms",
  "nutritions",
  "health-progress",
  "reflection",
  "prescription",
  "presentable",
  "counselling",
  "protocol",
]);

/**
 * User detail page: socket invalidation for sections without their own listeners.
 * Built-in sections (Food, At a glance, etc.) refetch via useClientProfileInvalidation inside the section.
 */
export function ClientProfilePageSocketSync({
  userId,
  activeSection,
  enabled = true,
  onRemountActiveSection,
}) {
  const remountRef = useRef(onRemountActiveSection);
  remountRef.current = onRemountActiveSection;

  const live =
    enabled && Boolean(userId) && !isMockNumericId(userId) && Boolean(activeSection);
  const needsPageFallback = live && !SECTIONS_WITH_SECTION_SOCKET_HOOKS.has(activeSection);
  const domains =
    CLIENT_PROFILE_SECTION_SOCKET_DOMAINS[activeSection] || [
      activeSection === "health-progress" ? "healthProgress" : activeSection,
    ];

  const tick = useCallback(() => {
    remountRef.current?.();
  }, []);

  useClientProfileInvalidation(domains, tick, { enabled: needsPageFallback });
  useClientProfileLiveSync(tick, { enabled: needsPageFallback });

  return null;
}
