function asset(kind, surface, format, size, uploaded, tone) {
  return { kind, surface, format, size, uploaded, tone };
}

export const PRIVACY_BLOCKS = [
  {
    id: "collect",
    title: "Data we collect",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: {
      webIcon: asset("icon", "web", "SVG", "48×48", true, "web"),
      appIcon: asset("icon", "app", "PNG", "96×96", true, "app"),
      appPhoto: asset("photo", "app", "JPG", "1200×800", false, "app"),
    },
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "Account details, health inputs you provide, and app usage needed to deliver your program.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Name, contact details and the health information you enter in the app.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Basic account and programme information used to run your wellness plan.",
      },
    ],
  },
  {
    id: "use",
    title: "How we use it",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: {
      webIcon: asset("icon", "web", "SVG", "48×48", true, "web"),
      appIcon: asset("icon", "app", "PNG", "96×96", true, "app"),
      appPhoto: asset("photo", "app", "JPG", "1200×800", false, "app"),
    },
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "To personalise your protocol, compute progress, and let your coach support you. We never sell personal data.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "To deliver coaching, track progress and improve the programme. We do not sell your data.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Used only to run your programme and support you in the app.",
      },
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    shown: true,
    webVersion: 3,
    appVersion: 3,
    assets: {
      webIcon: asset("icon", "web", "SVG", "48×48", true, "web"),
      appIcon: asset("icon", "app", "PNG", "96×96", true, "app"),
      appPhoto: asset("photo", "app", "JPG", "1200×800", false, "app"),
    },
    versions: [
      {
        n: 3,
        date: "28 Jul 2026",
        author: "Admin",
        text: "You can export or delete your data at any time from Settings, or by writing to care@irwellness.in.",
      },
      {
        n: 2,
        date: "12 Jun 2026",
        author: "Support",
        text: "Request an export or deletion of your data from Settings or support.",
      },
      {
        n: 1,
        date: "03 Mar 2026",
        author: "Admin",
        text: "Contact support to access or delete the information we hold.",
      },
    ],
  },
];

import { asCopyString } from "./bannerConfigData.js";

export function liveVersionText(block, surface = "web") {
  const n = surface === "app" ? block.appVersion : block.webVersion;
  const version = block.versions.find((entry) => entry.n === n) ?? block.versions[0];
  return asCopyString(version?.text);
}

export function surfaceVersionLabel(block) {
  if (block.webVersion === block.appVersion) return `Web + App · v${block.webVersion}`;
  return `Web v${block.webVersion} · App v${block.appVersion}`;
}

export function versionLiveLabel(block, n) {
  const onWeb = block.webVersion === n;
  const onApp = block.appVersion === n;
  if (onWeb && onApp) return "LIVE ON BOTH";
  if (onWeb) return "LIVE ON WEB";
  if (onApp) return "LIVE ON APP";
  return "NOT LIVE";
}
