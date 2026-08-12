import { STAFF_BY_ROLE } from "./teamsData.js";

const DEFAULT_REMIND_MESSAGE =
  "A quick nudge on your pending items — please take a look when you get a moment.";

const TEAM_META = {
  wc: {
    sectionTitle: "Wellness coaches (WC)",
    rosterTitle: "Total wellness coaches",
    defaultRemindAllTitle: "Remind everyone",
    defaultRemindMessage: DEFAULT_REMIND_MESSAGE,
    roster: [
      { name: "Anita Rao", detail: "12 clients · 4 consults today" },
      { name: "Priya Nair", detail: "9 clients · 2 consults today" },
      { name: "Vikram Sethi", detail: "8 clients · 3 consults today" },
      { name: "Meera Joshi", detail: "7 clients · 1 consult today" },
      { name: "Nikhil Rao", detail: "6 clients · 0 consults today" },
      { name: "Sneha Kaur", detail: "5 clients · 2 consults today" },
    ],
  },
  awc: {
    sectionTitle: "Assistant wellness coaches (AWC)",
    rosterTitle: "Total AWCs",
    defaultRemindAllTitle: "Remind everyone",
    defaultRemindMessage: DEFAULT_REMIND_MESSAGE,
  },
  support: {
    sectionTitle: "Support",
    rosterTitle: "Total support users",
    defaultRemindAllTitle: "Remind everyone",
    defaultRemindMessage: DEFAULT_REMIND_MESSAGE,
  },
  trainee: {
    sectionTitle: "Trainee",
    rosterTitle: "Total trainees",
    defaultRemindAllTitle: "Remind everyone",
    defaultRemindMessage: DEFAULT_REMIND_MESSAGE,
    roster: [
      { name: "Ritu Sharma", detail: "Shadowing Anita Rao · week 4" },
      { name: "Vivek Menon", detail: "Shadowing Priya Nair · week 3" },
      { name: "Pooja Rane", detail: "Onboarding week 2" },
    ],
  },
};

function rosterFromStaff(roleId) {
  return (STAFF_BY_ROLE[roleId] || []).map((person) => ({
    name: person.name,
    detail: person.meta,
  }));
}

export const TEAM_STAFF = Object.fromEntries(
  Object.entries(TEAM_META).map(([roleId, config]) => [
    roleId,
    {
      ...config,
      roster: config.roster ?? rosterFromStaff(roleId),
    },
  ]),
);

export function staffRemindMessage(name) {
  const first = String(name).split(" ")[0];
  return `Hi ${first}, a quick reminder on your pending items — please take a look when you get a moment.`;
}

export function remindSubtitle(title, count) {
  const suffix = count === 1 ? "1 recipient" : `${count} recipients`;
  return `${title} · ${suffix}`;
}
