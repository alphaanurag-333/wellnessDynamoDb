function asset(kind, surface, format, size, uploaded, tone) {
  return { kind, surface, format, size, uploaded, tone };
}

function defaultAssets() {
  return {
    webIcon: asset("icon", "web", "SVG", "48×48", true, "web"),
    appIcon: asset("icon", "app", "PNG", "96×96", true, "app"),
    appPhoto: asset("photo", "app", "JPG", "1200×800", false, "app"),
  };
}

export const ABOUT_EDITOR = {
  appOn: true,
  webOn: true,
};

export const ABOUT_BLOCKS = [
  {
    id: "vision",
    title: "Vision",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "A country where preventive wellness is the default, not the exception.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Preventive wellness as the everyday standard for every household.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Make preventive care the first choice, not the last.",
      },
    ],
  },
  {
    id: "mission",
    title: "Mission",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Put a qualified wellness coach and a measurable protocol within reach of every household.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "A coach and a protocol for every household.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Make expert wellness coaching affordable.",
      },
    ],
  },
  {
    id: "goal",
    title: "Goal",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Reverse metabolic disease for 1,00,000 clients by 2030.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Help 50,000 clients reverse metabolic disease by 2028.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Prove that a protocol plus a coach can reverse metabolic disease at scale.",
      },
    ],
  },
];
