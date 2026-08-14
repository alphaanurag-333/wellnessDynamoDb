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

export const FOOTER_TEXT_BLOCKS = [
  {
    id: "copyright",
    title: "Copyright line",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "© 2026 India Redefining Wellness Pvt. Ltd. All rights reserved.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "© 2026 India Redefining Wellness. All rights reserved.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "© India Redefining Wellness. All rights reserved.",
      },
    ],
  },
  {
    id: "secondary",
    title: "Secondary line",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Made in India · GSTIN 27AACCI1234K1ZP",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Made in India",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "India Redefining Wellness · Mumbai",
      },
    ],
  },
];
