import { AWC_DEFAULT, USERS } from "./usersData.js";

const USER_ID_BY_NAME = Object.fromEntries(USERS.map((u) => [u.name, u.n]));

const PLAN_META = {
  registered: { title: "Registered program", price: "Rs. 25,000", note: "one-time" },
  app: { title: "App user", price: "Rs. 400", note: "per month" },
};

function clientRow(name, coach, awc) {
  return {
    name,
    coach: coach || "Not assigned",
    awc: awc || "Not assigned",
    userId: USER_ID_BY_NAME[name] ?? null,
  };
}

function rowsFromUsers(goal) {
  return USERS.filter((u) => u.goal === goal).map((u) =>
    clientRow(u.name, u.coach, u.awc || AWC_DEFAULT[u.coach]),
  );
}

/** Reference-aligned client lists per program category */
export const PROGRAM_CATEGORY_MODALS = {
  "Fat Loss": {
    label: "Fat Loss",
    rows: [
      clientRow("Madhupriya Bilas", "Anita Rao", "Ishita Sen"),
      clientRow("Dipti Patil", "Anita Rao", "Ishita Sen"),
      clientRow("Banita Acharya", "Priya Nair", "Neha Pillai"),
      clientRow("Sana Iqbal", "Anita Rao", "Ishita Sen"),
    ],
  },
  "Diabetes Reversal": {
    label: "Diabetes Reversal",
    rows: rowsFromUsers("Diabetes Reversal"),
  },
  "Thyroid Care": {
    label: "Thyroid Care",
    rows: rowsFromUsers("Thyroid Care"),
  },
  "PCOD / PCOS": {
    label: "PCOD / PCOS",
    rows: rowsFromUsers("PCOD / PCOS"),
  },
  "Overall Wellbeing": {
    label: "Overall Wellbeing",
    groups: [
      {
        ...PLAN_META.registered,
        rows: [
          clientRow("Trisha Menon", "Anita Rao", "Ishita Sen"),
          clientRow("Rohit Ambekar", "Anita Rao", "Ishita Sen"),
        ],
      },
      {
        ...PLAN_META.app,
        rows: [clientRow("Devansh Gill", "Priya Nair", "Neha Pillai")],
      },
    ],
    rows: [
      clientRow("Trisha Menon", "Anita Rao", "Ishita Sen"),
      clientRow("Rohit Ambekar", "Anita Rao", "Ishita Sen"),
      clientRow("Devansh Gill", "Priya Nair", "Neha Pillai"),
    ],
  },
  Hypertension: {
    label: "Hypertension",
    rows: rowsFromUsers("Hypertension"),
  },
  "Everyday Wellness": {
    label: "Everyday Wellness",
    rows: rowsFromUsers("Everyday Wellness"),
  },
};

export function getProgramCategoryModal(label) {
  return PROGRAM_CATEGORY_MODALS[label] ?? null;
}

export function programClientCount(label) {
  const modal = getProgramCategoryModal(label);
  if (!modal) return 0;
  return modal.rows?.length ?? 0;
}
