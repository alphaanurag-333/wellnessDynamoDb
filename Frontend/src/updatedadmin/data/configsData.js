export const CONFIG_TABS = [
  { id: "app", label: "App" },
  { id: "web", label: "Web" },
  { id: "common", label: "Common" },
  { id: "flags", label: "Feature flags" },
];

export const CONFIG_GROUPS = {
  common: [
    {
      name: "Banners & cards",
      items: [
        {
          name: "Banner",
          note: "Multiple placements · aspect ratio adapts per type",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
        },
        {
          name: "Champion of the month",
          note: "Pick a designed card or upload a new one",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
        },
        {
          name: "Birthday card",
          note: "Auto-sent on a client or coach birthday",
          owner: "Admin / Support",
          app: true,
          web: true,
          upload: true,
          live: true,
          on: true,
        },
      ],
    },
    {
      name: "Social proof",
      items: [
        {
          name: "Google rating",
          note: "Shown on web footer and app About",
          owner: "Admin / Support",
          app: true,
          web: true,
          live: true,
          on: true,
        },
        {
          name: "Instagram followers",
          note: "Live count from social API",
          owner: "Admin / Support",
          app: false,
          web: true,
          live: true,
          on: true,
        },
      ],
    },
  ],
  app: [
    {
      name: "App · Heal",
      items: [
        { name: "Diet plans", note: "Master book of plans · Admin writes them, coaches read and apply them", owner: "Admin", app: true, web: false, live: true, on: true },
        { name: "LAUNCH", note: "Onboarding assessment", owner: "Admin", app: true, web: false, live: true, on: true },
        { name: "AI enable", note: "AI report interpretation and summaries", owner: "Admin", app: true, web: false, live: false, on: true },
      ],
    },
    {
      name: "App · Banks",
      items: [
        { name: "Nutrition bank", note: "Capsule / bottle / per-capsule pricing; coach picks from bank", owner: "Admin / Support", app: true, web: false, live: true, on: true },
        { name: "Wellness prescription bank", note: "Master book; WC/AWC can pick and edit", owner: "Admin / WC / AWC", app: true, web: false, live: true, on: true },
        { name: "Gallery", note: "Admin-only view of every client and common image", owner: "Admin", app: true, web: false, live: true, on: true },
      ],
    },
  ],
  web: [
    {
      name: "Web · Brand",
      items: [
        { name: "Logo edit", note: "Header, footer, favicon and app icon slots", owner: "Admin / Support", app: false, web: true, live: true, on: true },
        { name: "Edit location", note: "Registered and clinic addresses on the map", owner: "Admin / Support", app: false, web: true, live: true, on: true },
      ],
    },
    {
      name: "Web · Footer",
      items: [
        { name: "Footer setting", note: "Links, policies, contact and copyright line", owner: "Admin / Support", app: false, web: true, live: true, on: true },
        { name: "FS · Privacy policy", note: "Legal copy", owner: "Admin / Support", app: false, web: true, live: true, on: true },
        { name: "FS · Terms of service", note: "Legal copy", owner: "Admin / Support", app: false, web: true, live: true, on: true },
      ],
    },
  ],
  flags: [
    {
      name: "Feature flags",
      items: [
        { name: "Community feed", note: "Broadcasts, celebrations and onboarding cards on dashboard", owner: "Admin", app: true, web: true, live: true, on: true },
        { name: "Champion leaderboard", note: "Monthly ranking from Daily Reflection scores", owner: "Admin", app: true, web: false, live: true, on: true },
        { name: "Revenue analytics", note: "Admin-only financial charts on dashboard", owner: "Admin", app: false, web: false, live: true, on: true },
      ],
    },
  ],
};
