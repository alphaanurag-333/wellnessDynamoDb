import { USERS } from "./usersData.js";

const USER_ID_BY_NAME = Object.fromEntries(USERS.map((u) => [u.name, u.n]));

function clientId(name) {
  return USER_ID_BY_NAME[name] ?? null;
}

function onboardingStateTone(state) {
  if (/idle/.test(state)) {
    const days = parseInt(state, 10);
    return days >= 4 ? "danger" : "warn";
  }
  return "good";
}

function metricRow(name, coach, start, current, change) {
  return { name, coach, start, current, change, userId: clientId(name) };
}

function onboardingRow(name, coach, step, state) {
  return {
    name,
    coach,
    step,
    state,
    stateTone: onboardingStateTone(state),
    userId: clientId(name),
  };
}

export const ONBOARDING_PROGRESS_MODAL = {
  type: "onboarding",
  icon: "🚀",
  title: "Onboarding status",
  subtitle: "6 HEAL clients in their onboarding journey",
  rows: [
    onboardingRow("Madhupriya Bilas", "Anita Rao", "Step 8 of 10 · Protocol Settings", "2 days idle"),
    onboardingRow("Dipti Patil", "Anita Rao", "Step 5 of 10 · RCA", "1 day idle"),
    onboardingRow("Bikash Sharma", "Priya Nair", "Step 10 of 10 · Program initiation", "Ready to launch"),
    onboardingRow("Kabir Shah", "Priya Nair", "Step 3 of 10 · Internal Parameters", "4 days idle"),
    onboardingRow("Arjun Verma", "Meera Joshi", "Step 6 of 10 · Reports Briefing", "today"),
    onboardingRow("Banita Acharya", "Priya Nair", "Step 2 of 10 · Body Analytics", "5 days idle"),
  ],
};

export const FAT_PROGRESS_MODALS = {
  down610: {
    type: "fat",
    icon: "📊",
    title: "Fat Loss · 6–10 kg down",
    metricKind: "weight",
    rows: [
      metricRow("Madhupriya Bilas", "Anita Rao", "98 kg", "88.5 kg", "−9.5 kg"),
      metricRow("Dipti Patil", "Anita Rao", "92 kg", "84.2 kg", "−7.8 kg"),
      metricRow("Banita Acharya", "Priya Nair", "86 kg", "79.5 kg", "−6.5 kg"),
      metricRow("Sana Iqbal", "Anita Rao", "78 kg", "69.2 kg", "−8.8 kg"),
    ],
  },
  halfway: {
    type: "fat",
    icon: "📊",
    title: "Fat Loss · Halfway to goal",
    metricKind: "weight",
    rows: [
      metricRow("Madhupriya Bilas", "Anita Rao", "98 kg", "88.5 kg", "−9.5 kg"),
      metricRow("Dipti Patil", "Anita Rao", "92 kg", "84.2 kg", "−7.8 kg"),
      metricRow("Banita Acharya", "Priya Nair", "86 kg", "79.5 kg", "−6.5 kg"),
    ],
  },
  neartarget: {
    type: "fat",
    icon: "📊",
    title: "Fat Loss · At / 2 kg short",
    metricKind: "weight",
    rows: [metricRow("Sana Iqbal", "Anita Rao", "78 kg", "69.2 kg", "−8.8 kg")],
  },
};

export const A1C_PROGRESS_MODALS = {
  down2: {
    type: "a1c",
    icon: "📊",
    title: "HbA1c · 2+ points down",
    metricKind: "a1c",
    rows: [
      metricRow("Bikash Sharma", "Priya Nair", "8.9", "6.4", "−2.5 pts"),
      metricRow("Dheer Barve", "Vikram Sethi", "8.4", "6.2", "−2.2 pts"),
      metricRow("Arjun Verma", "Meera Joshi", "9.4", "6.8", "−2.6 pts"),
    ],
  },
  under65: {
    type: "a1c",
    icon: "📊",
    title: "HbA1c · Below 6.5",
    metricKind: "a1c",
    rows: [
      metricRow("Bikash Sharma", "Priya Nair", "8.9", "6.4", "−2.5 pts"),
      metricRow("Dheer Barve", "Vikram Sethi", "8.4", "6.2", "−2.2 pts"),
      metricRow("Kabir Shah", "Priya Nair", "7.9", "6.3", "−1.6 pts"),
    ],
  },
};

export const FAT_METRIC_KEYS = {
  "6–10 kg down": "down610",
  "Halfway to goal": "halfway",
  "At / 2 kg short": "neartarget",
};

export const A1C_METRIC_KEYS = {
  "2+ points down": "down2",
  "Below 6.5": "under65",
};

export function getProgressModal(modalKey) {
  if (modalKey === "onboarding") return ONBOARDING_PROGRESS_MODAL;
  if (modalKey?.kind === "fat") return FAT_PROGRESS_MODALS[modalKey.key] ?? null;
  if (modalKey?.kind === "a1c") return A1C_PROGRESS_MODALS[modalKey.key] ?? null;
  return null;
}

export function onboardingRemindCopy(row) {
  const first = row.name.split(" ")[0];
  return {
    title: `Remind ${row.name}`,
    subtitle: `Onboarding · ${row.step} · coach ${row.coach}`,
    recipients: [row.name, row.coach],
    defaultMessage: `Hi ${first}, you're one step away — ${row.step}. Finish it whenever you're ready and your coach will take it from there.`,
  };
}
