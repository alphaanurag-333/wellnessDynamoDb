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

export const GUIDELINE_BLOCKS = [
  {
    id: "respect",
    title: "Be respectful",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Share your journey without judging anyone else's. No body shaming, ever.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Be kind in comments and posts. Do not shame anyone's body, pace or results.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Treat every member with respect. Harassment of any kind is not allowed.",
      },
    ],
  },
  {
    id: "medical",
    title: "No medical advice",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Do not prescribe medication or dosages to other members — leave that to the coaches.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Do not share prescriptions or tell others what to take. Coaches handle clinical guidance.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Members may not give medical advice. Speak with your coach or clinician.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy first",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: defaultAssets(),
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Never share another member's photos, labs or results outside the community.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Keep other members' photos, labs and progress private. Do not post them elsewhere.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Do not share another person's information or images without their consent.",
      },
    ],
  },
];
