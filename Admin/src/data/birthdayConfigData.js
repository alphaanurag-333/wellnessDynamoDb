export const BIRTHDAY_EDITOR = {
  appOn: true,
  webOn: true,
  triggerOn: true,
  triggerTime: "00:00",
  retryOn: true,
  headline: "Happy Birthday, {first_name}!",
  subline: "From everyone at IR Wellness",
  description: "Wishing you a year of steady energy, better sleep and one more milestone on your wellness journey.",
  footer: "Team IRW",
  showPhoto: true,
  photoPosition: "top",
  photoSource: "upload",
  design: "balloons",
};

export const BIRTHDAY_TIMES = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00"];

export const BIRTHDAY_RUNS = {
  last: { when: "28 Jul · 00:00", note: "3 cards sent" },
  next: { when: "29 Jul · 00:00", note: "2 birthdays queued" },
  fail: { when: "27 Jul · 00:00", note: "1 retry succeeded" },
};

export const BIRTHDAY_QUEUE = [
  { id: "bd-q1", name: "Hetu Mehra", role: "Client · Fat Loss", time: "00:00", status: "sent" },
  { id: "bd-q2", name: "Vikram Sethi", role: "Wellness Coach", time: "00:00", status: "sent" },
  { id: "bd-q3", name: "Ananya Rao", role: "Client · Everyday Wellness", time: "00:01", status: "sent" },
  { id: "bd-q4", name: "Lata Pawar", role: "Client · Hypertension", time: "—", status: "queued" },
  { id: "bd-q5", name: "Ritu Sharma", role: "Trainee", time: "00:00", status: "failed" },
];

export const BIRTHDAY_DESIGNS = [
  { id: "balloons", label: "Balloons & confetti", icon: "🎈" },
  { id: "botanical", label: "Botanical wishes", icon: "🌿" },
  { id: "typo", label: "Bold typographic", icon: "✨" },
  { id: "coach", label: "Coach greeting card", icon: "💌" },
];

export const BIRTHDAY_GALLERY_OWNERS = ["All owners", "Anita Rao", "Ishita Sen", "Rohan Das", "Priya Nair"];

export const BIRTHDAY_GALLERY = [
  { id: "bd-g1", title: "Birthday card — evergreen", owner: "Ishita Sen", date: "04 Aug 2026", size: "312 KB", versions: 2, live: true },
  { id: "bd-g2", title: "Birthday card — milestone 1 year", owner: "Rohan Das", date: "28 Jul 2026", size: "402 KB", versions: 3, live: false },
  { id: "bd-g3", title: "Birthday card — coach signed", owner: "Priya Nair", date: "19 Jun 2026", size: "388 KB", versions: 2, live: false },
  { id: "bd-g4", title: "Birthday card — balloons", owner: "Anita Rao", date: "12 Jul 2026", size: "480 KB", versions: 3, live: false },
];
