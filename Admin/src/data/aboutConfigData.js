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

export const ABOUT_DESCRIPTION_TITLE = "Meet Your Wellness Partner";
export const ABOUT_DESCRIPTION_BODY =
  "<p>We merge advanced clinical diagnostics with restorative holistic practices to create your personalized path to vitality.</p>";

export const ABOUT_DESCRIPTION_BLOCKS = [
  pageBlock("intro", ABOUT_DESCRIPTION_TITLE, ABOUT_DESCRIPTION_BODY),
];

export const ABOUT_VISION_TITLE = "Our Vision";
export const ABOUT_VISION_HEADLINE = "To Inspire & Educate India to live a Healthy & Happy Life.";
export const ABOUT_VISION_BODY =
  "<p>Usually people are reactive and disease oriented when it comes to health. We should be inspired for the cause of being healthy inside-out to live a disease free life. Current health situation is getting deteriorated primarily because of change in lifestyle hence it is important to get educated rightly about the good health practices.</p>";

export const ABOUT_VISION_BLOCKS = [
  pageBlock("headline", ABOUT_VISION_HEADLINE, ABOUT_VISION_BODY, {
    webVersion: 1,
    appVersion: 1,
  }),
];

export const ABOUT_MISSION_TITLE = "Our Mission";
export const ABOUT_MISSION_HEADLINE = "Reinvigorating India’s Wellness Heritage.";
export const ABOUT_MISSION_BODY =
  "<p>We’re passionate about redefining India’s rich heritage of wellness practices in context to the modern era backed by science &amp; research. Drawing inspiration from Ayurveda, Yoga, Meditation, and other traditional systems of medicine, we seek to blend ancient wisdom with contemporary science to promote holistic well-being for individuals across India.</p>";

export const ABOUT_MISSION_BLOCKS = [
  pageBlock("headline", ABOUT_MISSION_HEADLINE, ABOUT_MISSION_BODY, {
    webVersion: 1,
    appVersion: 1,
  }),
];

export const ABOUT_GOAL_TITLE = "Our Goal";
export const ABOUT_GOAL_HEADLINE =
  "Reach out One million families help them living a Healthy & Medicine Free life.";
export const ABOUT_GOAL_BODY =
  "<p>Our goal is to reach out to One million families, empowering them to achieve a healthy and medicine-free life by addressing and reversing lifestyle disorders through holistic and sustainable fat-loss methods. By integrating comprehensive wellness strategies that encompass balanced nutrition, regular physical activity, stress management, and natural healing practices, we aim to transform lives and foster long-term health improvements.</p>";

export const ABOUT_GOAL_BLOCKS = [
  pageBlock("headline", ABOUT_GOAL_HEADLINE, ABOUT_GOAL_BODY, {
    webVersion: 1,
    appVersion: 1,
  }),
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
    label: "Description",
    defaultTitle: ABOUT_DESCRIPTION_TITLE,
    defaultHeadline: "",
    hasHeadline: false,
    sitePath: "irwellness.in/about-us",
    noun: "description section",
    fallbackBlocks: ABOUT_DESCRIPTION_BLOCKS,
  },
  {
    slug: "our-vision",
    label: "Vision",
    defaultTitle: ABOUT_VISION_TITLE,
    defaultHeadline: ABOUT_VISION_HEADLINE,
    hasHeadline: true,
    sitePath: "irwellness.in/about-us",
    noun: "vision section",
    fallbackBlocks: ABOUT_VISION_BLOCKS,
  },
  {
    slug: "our-mission",
    label: "Mission",
    defaultTitle: ABOUT_MISSION_TITLE,
    defaultHeadline: ABOUT_MISSION_HEADLINE,
    hasHeadline: true,
    sitePath: "irwellness.in/about-us",
    noun: "mission section",
    fallbackBlocks: ABOUT_MISSION_BLOCKS,
  },
  {
    slug: "our-goal",
    label: "Goal",
    defaultTitle: ABOUT_GOAL_TITLE,
    defaultHeadline: ABOUT_GOAL_HEADLINE,
    hasHeadline: true,
    sitePath: "irwellness.in/about-us",
    noun: "goal section",
    fallbackBlocks: ABOUT_GOAL_BLOCKS,
  },
];
