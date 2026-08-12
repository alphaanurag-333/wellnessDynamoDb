export const CAL_LEGEND = [
  { label: "Confirmed", color: "#2b8f5b" },
  { label: "Held", color: "#e0b23a" },
  { label: "Blocked", color: "#5e6ad2" },
  { label: "Free", color: "#dde3ec" },
];

export const CAL_WEEK_LABEL = "04 Aug – 10 Aug 2026";

export const CAL_DAYS = [
  { dow: "Tue", num: 4, tag: "1 session · 1 block", active: true, today: true },
  { dow: "Wed", num: 5, tag: "1 session", active: false },
  { dow: "Thu", num: 6, tag: "2 sessions", active: false },
  { dow: "Fri", num: 7, tag: "free", active: false },
  { dow: "Sat", num: 8, tag: "free", active: false },
  { dow: "Sun", num: 9, tag: "free", active: false },
  { dow: "Mon", num: 10, tag: "free", active: false },
];

export const CAL_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export const CAL_EVENTS = [
  { top: "28%", height: "12%", label: "Madhupriya Bilas", sub: "10:00 – 10:45 · Fat Loss", type: "confirmed" },
  { top: "48%", height: "10%", label: "Blocked", sub: "Admin hold", type: "blocked" },
  { top: "62%", height: "12%", label: "Held · Hetu Mehra", sub: "15:00 – 15:45", type: "held" },
];

export const CAL_BOOKED = [
  { client: "Madhupriya Bilas", meta: "10:00 – 10:45 · Fat Loss consult", initial: "MB" },
];

export const CAL_HELD = [
  {
    client: "Hetu Mehra",
    meta: "PCOD / PCOS · awaiting pick",
    initial: "HM",
    slots: ["15:00", "16:30", "17:15"],
    hint: "2 of 3 slots still open",
  },
];

export const CAL_CHANGES = [
  {
    client: "Rhea Kapoor",
    meta: "Requested reschedule",
    initial: "RK",
    reason: "Travel conflict on original slot — prefers afternoon this week.",
    wants: ["Thu 6 Aug · 4pm", "Fri 7 Aug · 11am"],
  },
];
