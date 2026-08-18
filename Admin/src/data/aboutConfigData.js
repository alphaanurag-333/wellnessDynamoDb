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

function pageBlock(id, title, text, extra = {}) {
  return {
    id,
    title,
    shown: true,
    webVersion: extra.webVersion || 1,
    appVersion: extra.appVersion || 1,
    assets: extra.assets || defaultAssets(),
    versions: extra.versions || [
      {
        n: 1,
        date: extra.date || "",
        author: extra.author || "Admin",
        text,
      },
    ],
  };
}

export const ABOUT_DESCRIPTION_BLOCKS = [
  pageBlock(
    "intro",
    "Welcome to India Redefining Wellness",
    "<p>India Redefining Wellness is your trusted partner in holistic health and wellness transformation. We specialize in personalized holistic solutions aimed at addressing a wide range of health concerns, including personalized holistic fat loss, lifestyle disorders reversal like Diabetes, Hypo &amp; Hyper Thyroid, PCOD/PCOS, Gut Health, and Autoimmune Disorders.</p><p>We merge advanced clinical diagnostics with restorative holistic practices to create your personalized path to vitality.</p>"
  ),
  pageBlock(
    "what-we-specialize-in",
    "What We Specialize In",
    "<ul><li>Personalized holistic fat loss</li><li>Lifestyle disorder management and reversal (Diabetes, Thyroid, PCOD/PCOS)</li><li>Gut health restoration</li><li>Autoimmune disorder support</li><li>Stress management and emotional wellbeing</li></ul>"
  ),
  pageBlock(
    "our-approach",
    "Our Approach",
    "<p>We believe our client's health is our responsibility. We develop an understanding of each client's current lifestyle and uncover health conditions through deep root-cause analysis. Our approach includes personalized hand-holding with consistent monitoring of all health pillars—Food &amp; Nutrition, Sleep &amp; Rest, Physical Exercise, and Emotional Health.</p>"
  ),
];

export const ABOUT_VISION_BLOCKS = [
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
];

export const ABOUT_MISSION_BLOCKS = [
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
];

export const ABOUT_GOAL_BLOCKS = [
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

export const ABOUT_BLOCKS = [
  ...ABOUT_DESCRIPTION_BLOCKS,
  ...ABOUT_VISION_BLOCKS,
  ...ABOUT_MISSION_BLOCKS,
  ...ABOUT_GOAL_BLOCKS,
];

export const ABOUT_STATIC_PAGES = [
  {
    slug: "about-us",
    defaultTitle: "About Us",
    sitePath: "irwellness.in/about-us",
    noun: "description section",
    fallbackBlocks: ABOUT_DESCRIPTION_BLOCKS,
  },
  {
    slug: "our-vision",
    defaultTitle: "Our Vision",
    sitePath: "irwellness.in/about-us",
    noun: "vision section",
    fallbackBlocks: ABOUT_VISION_BLOCKS,
  },
  {
    slug: "our-mission",
    defaultTitle: "Our Mission",
    sitePath: "irwellness.in/about-us",
    noun: "mission section",
    fallbackBlocks: ABOUT_MISSION_BLOCKS,
  },
  {
    slug: "our-goal",
    defaultTitle: "Our Goal",
    sitePath: "irwellness.in/about-us",
    noun: "goal section",
    fallbackBlocks: ABOUT_GOAL_BLOCKS,
  },
];
