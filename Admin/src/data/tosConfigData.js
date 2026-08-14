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

export const TOS_BLOCKS = [
  {
    id: "website-use",
    title: "Website use",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Content on this site is for general information and is not a substitute for medical advice.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Information on this website is provided for general wellness guidance only.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Use of this website is subject to these terms and is for personal, non-commercial purposes.",
      },
    ],
  },
  {
    id: "ip",
    title: "Intellectual property",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "All protocols, copy and imagery remain the property of India Redefining Wellness Pvt. Ltd.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Programmes, branding and site content belong to India Redefining Wellness.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "All rights in the site content are reserved.",
      },
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "We are not liable for outcomes that depend on how you follow your protocol, or on advice from your own clinician.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "India Redefining Wellness is not responsible for decisions taken without medical supervision.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Use of the site and programme is at your own risk.",
      },
    ],
  },
];
