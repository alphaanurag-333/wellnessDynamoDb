export const CONFIG_TABS = [
  { id: "app", label: "App" },
  { id: "web", label: "Web" },
  { id: "common", label: "Common" },
];

/** @typedef {{ id: string, name: string, note: string, owner: string, app?: boolean, web?: boolean, live?: boolean, on?: boolean, upload?: boolean, tags?: string[], toggleable?: boolean }} ConfigItem */

/** @type {Record<string, { name: string, items: ConfigItem[] }[]>} */
export const CONFIG_GROUPS = {
  app: [
    {
      name: "App · Content",
      items: [
        {
          id: "app-language-disable",
          name: "Language disable",
          note: "Hindi only",
          owner: "Admin / Support",
          app: true,
          web: false,
          live: false,
          on: false,
          tags: [],
        },
        {
          id: "app-faq",
          name: "FAQ",
          note: "Question and answer list",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
      ],
    },
    {
      name: "App · Energy exchange",
      items: [
        {
          id: "app-program",
          name: "Program",
          note: "Wellness program pricing, discount slabs and validity",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Amount", "Discount"],
          toggleable: false,
        },
        {
          id: "app-subscriptions",
          name: "App Subscriptions",
          note: "Subscription pricing, discount slabs and validity",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Amount", "Discount"],
          toggleable: false,
        },
        {
          id: "app-consultancy-amount",
          name: "Consultancy amount",
          note: "PWC fee, tax type, tax value and referral discount",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Amount"],
          toggleable: false,
        },
      ],
    },
    {
      name: "App · Commerce",
      items: [
        {
          id: "app-gst",
          name: "GST option",
          note: "Set GST % · On → client pays GST · Off → IRW absorbs it",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: [],
        },
        {
          id: "app-payment-gateway",
          name: "Payment gateway",
          note: "Pick Razorpay, Stripe, or PayU · keys managed here",
          owner: "Admin",
          app: true,
          web: false,
          live: false,
          on: false,
          tags: [],
          toggleable: false,
        },
      ],
    },
    {
      name: "App · Legal",
      items: [
        {
          id: "app-tos",
          name: "Terms of service",
          note: "Same content as FS · Terms of service · website & app",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
          sharedWith: "web-fs-tos",
        },
        {
          id: "app-dpa",
          name: "Data processing agreement",
          note: "App legal copy · Static Pages",
          owner: "Admin / Support",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Text"],
        },
      ],
    },
    {
      name: "App · Heal",
      items: [
        {
          id: "app-measurement-video",
          name: "Measurement video",
          note: "How-to-measure guides · cover, title, description, upload or link",
          owner: "Admin / Support",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Video", "Text"],
        },
        {
          id: "app-onboarding-video",
          name: "Onboarding video",
          note: "One video per coach · auto-tagged and shown to that coach's clients when the journey starts",
          owner: "Admin / WC / AWC",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Video", "Text"],
          upload: true,
        },
        {
          id: "app-medical-questionnaire",
          name: "Medical conditions · questionnaire",
          note: "Admin writes the questions and can disable any of them at any time",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "app-health-progress",
          name: "Health progress trackers",
          note: "The master list of trackers coaches can attach to a client",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "app-diet-plans",
          name: "Diet plans",
          note: "Master book of plans · Admin writes them, coaches read and apply them",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Text"],
          upload: true,
        },
        {
          id: "app-test-catalog",
          name: "Blood test catalog",
          note: "Master list of lab tests · Admin writes them, coaches assign them on Internal Parameters",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Text"],
          upload: true,
        },
      ],
    },
    {
      name: "App · Banks",
      items: [
        {
          id: "app-challenges",
          name: "Challenges",
          note: "Challenge catalog, pricing, dates, onboarding steps, enrollments & groups",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Amount", "Upload"],
          toggleable: false,
          upload: true,
        },
        {
          id: "app-coupons",
          name: "Coupons",
          note: "Promo codes for challenge checkout",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Amount"],
          toggleable: false,
        },
        {
          id: "app-nutrition-bank",
          name: "Nutrition bank",
          note: "Capsule / bottle / per-capsule pricing; coach picks from bank",
          owner: "Admin / Support",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Amount"],
          toggleable: false,
          upload: true,
        },
        {
          id: "app-drf-bank",
          name: "DRF activity bank",
          note: "Admin creates activities; coach enables and sets target count",
          owner: "Admin / WC / AWC",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: [],
          upload: true,
        },
        {
          id: "app-rx-bank",
          name: "Wellness prescription bank",
          note: "Master book; WC/AWC can pick and edit",
          owner: "Admin / WC / AWC",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: [],
          toggleable: false,
          upload: true,
        },
        {
          id: "app-commitment-letter",
          name: "Commitment letter",
          note: "Coach signs at onboarding and shares with clients",
          owner: "Admin / WC / AWC",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: [],
          toggleable: false,
          upload: true,
        },
        {
          id: "app-gallery",
          name: "Gallery",
          note: "Admin-only view of every client and common image",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Upload"],
          upload: true,
        },
      ],
    },
    {
      name: "App · System",
      items: [
        {
          id: "app-launch",
          name: "LAUNCH",
          note: "Onboarding assessment",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: [],
          upload: true,
        },
        {
          id: "app-ai-enable",
          name: "AI enable",
          note: "AI report interpretation and summaries",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: [],
          toggleable: false,
          upload: true,
        },
      ],
    },
  ],
  web: [
    {
      name: "Testimonials",
      items: [
        {
          id: "web-program-testimonials",
          name: "Program Testimonials",
          note: "Like Transformation but scoped to one program",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Upload", "Text"],
        },
      ],
    },
    {
      name: "Web · Footer",
      items: [
        {
          id: "web-footer",
          name: "Footer setting",
          note: "Links, policies, contact and copyright line",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "web-fs-social",
          name: "FS · Social media links",
          note: "Facebook, Instagram, YouTube, LinkedIn",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "web-fs-links",
          name: "FS · Website links (Coming soon)",
          note: "Primary site navigation links",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "web-fs-privacy",
          name: "FS · Privacy policy",
          note: "Legal copy",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "web-fs-tos",
          name: "FS · Terms of service",
          note: "Website & app legal copy · shared with App · Terms of service",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "web-fs-guidelines",
          name: "FS · Community guidelines",
          note: "Community rules",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "web-fs-contact",
          name: "FS · Contact us",
          note: "Phone, email, support hours",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
      ],
    },
    {
      name: "Web · Brand",
      items: [
        {
          id: "web-app-content",
          name: "App Content",
          note: "App name, email, mobile and address",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
          toggleable: false,
        },
        {
          id: "web-logo",
          name: "Logo edit",
          note: "Website, admin, and favicon from App Config",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Upload"],
        },
        {
          id: "web-location",
          name: "Edit location",
          note: "Registered and clinic addresses on the map",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
      ],
    },
  ],
  common: [
    {
      name: "Banners & cards",
      items: [
        {
          id: "common-banner",
          name: "Banner",
          note: "Multiple placements · aspect ratio adapts per type",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Upload"],
        },
        {
          id: "common-champion",
          name: "Champion of the month",
          note: "Pick a designed card or upload a new one",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Upload"],
        },
        {
          id: "common-birthday",
          name: "Birthday card",
          note: "Auto-sent on a client or coach birthday",
          owner: "Admin / Support",
          app: true,
          web: true,
          upload: true,
          live: true,
          on: true,
          tags: ["Upload"],
        },
      ],
    },
    {
      name: "Testimonials",
      items: [
        {
          id: "common-transformation",
          name: "Transformation",
          note: "Before / after comparison · data points · priority order",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Upload", "Text"],
        },
        {
          id: "common-client-review",
          name: "Client Review",
          note: "Submitted in-app · approve or reject",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Upload", "Text"],
        },
        {
          id: "common-real-people",
          name: "Real People Real Healing",
          note: "Comparison + rating + health concern tag",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Upload", "Text"],
        },
        {
          id: "common-voice",
          name: "Voice of Healing",
          note: "Video or link with cover image",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Video", "Text"],
        },
      ],
    },
    {
      name: "Leadership and team",
      items: [
        {
          id: "common-cofounder",
          name: "Co-Founder Message",
          note: "Video + audio • preview on app and web",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Video", "Text"],
        },
        {
          id: "common-leadership",
          name: "Leadership Profile",
          note: "Same as co-founder • multiple leaders",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: false,
          on: false,
          tags: ["Video", "Text"],
        },
        {
          id: "common-wellness-team",
          name: "Wellness Team Profile",
          note: "Live coach and nutritionist profiles with photo, designation, and message",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Video", "Text"],
        },
      ],
    },
    {
      name: "About",
      items: [
        {
          id: "common-about",
          name: "Description, Vision, Mission, Goal",
          note: "Title and description for About Us, Vision, Mission, and Goal",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "common-google-review",
          name: "Google Review & Followers",
          note: "Rating, review count, follower counts",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
      ],
    },
    {
      name: "Settings",
      items: [
        {
          id: "common-dropdowns",
          name: "Dropdown options",
          note: "Manage every dropdown list used across the panel",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Text"],
        },
      ],
    },
    {
      name: "Body, Mind & Soul",
      items: [
        {
          id: "common-mental-wellbeing",
          name: "Mental & Emotional Wellbeing",
          note: "Private video & audio library · coaches pick what appears in a client app",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Video", "Upload"],
          toggleable: false,
        },
        {
          id: "common-wellness-yoga",
          name: "Yoga",
          note: "Private yoga library · coaches pick what appears in a client app",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Video", "Upload"],
          toggleable: false,
        },
        {
          id: "common-physical-exercise",
          name: "Physical Exercise",
          note: "Private exercise library · coaches pick what appears in a client app",
          owner: "Admin",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Video", "Upload"],
          toggleable: false,
        },
      ],
    },
    {
      name: "Wellnesspedia",
      items: [
        {
          id: "common-health-disorders",
          name: "Health disorders",
          note: "Acute & chronic disorder catalog · HealthDisorder table",
          owner: "Admin / Support",
          app: true,
          web: false,
          live: true,
          on: true,
          tags: ["Text"],
        },
        {
          id: "common-recipes",
          name: "Healthy recipes",
          note: "Video + written recipes",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Upload", "Text"],
        },
        {
          id: "common-yoga",
          name: "Yoga & Pranayam",
          note: "Video library",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
          tags: ["Video", "Text"],
        },
      ],
    },
  ],
};

export function findConfigItem(configId) {
  for (const [tab, groups] of Object.entries(CONFIG_GROUPS)) {
    for (const group of groups) {
      const item = group.items.find((entry) => entry.id === configId);
      if (item) {
        return { item, groupName: group.name, tab };
      }
    }
  }
  return null;
}

/** Access Control feature id used to gate a config screen. */
export function configPermissionPrefix(configId) {
  if (configId === "common-banner") return "bn";
  if (
    configId === "web-program-testimonials" ||
    configId === "common-champion" ||
    configId === "common-birthday" ||
    configId === "common-transformation" ||
    configId === "common-client-review" ||
    configId === "common-real-people" ||
    configId === "common-voice" ||
    configId === "common-cofounder" ||
    configId === "common-leadership" ||
    configId === "common-wellness-team" ||
    configId === "common-about" ||
    configId === "common-google-review" ||
    configId === "common-recipes" ||
    configId === "common-yoga"
  ) {
    return "ct";
  }
  return "cf";
}

export function listConfigItems() {
  const items = [];
  for (const [tab, groups] of Object.entries(CONFIG_GROUPS)) {
    for (const group of groups) {
      for (const item of group.items) {
        items.push({ item, groupName: group.name, tab });
      }
    }
  }
  return items;
}

export function getConfigStateLabel(item, on) {
  if (item.id === "app-gst") return on ? "On" : "Off";
  if (item.id === "app-payment-gateway") {
    return typeof on === "string" ? on : "Not set";
  }
  if (item.toggleable === false) return item.live ? "Live" : "Hidden";
  return on ? "Live" : "Hidden";
}
