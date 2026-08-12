export const PHOTO_ANGLES = ["Front", "Side", "Back"];

export const BODY_ANALYTICS = {
  latestPhotoDate: "18 Jul 2026",
  weeklyHint: "Weekly data covers the last 8 weeks — for older history, switch to Monthly. Empty periods are skipped.",
  weeklyPeriods: ["15 Jul", "08 Jul", "01 Jul"],
  monthlyPeriods: ["Jul", "Jun", "May"],
  weeklyOptions: ["15 Jul", "08 Jul", "01 Jul", "24 Jun", "17 Jun", "10 Jun", "03 Jun", "27 May"],
  monthlyOptions: ["Jul", "Jun", "May", "Apr", "Mar", "Feb", "Jan", "Dec"],
  photos: {
    Front: [
      { date: "18 Jul 2026" },
      { date: "18 Jun 2026" },
      { date: "18 May 2026" },
      { date: "18 Apr 2026" },
      { date: "18 Mar 2026" },
      { date: "18 Feb 2026" },
    ],
    Side: [
      { date: "18 Jul 2026" },
      { date: "18 Jun 2026" },
      { date: "18 May 2026" },
      { date: "18 Apr 2026" },
      { date: "18 Mar 2026" },
      { date: "18 Feb 2026" },
    ],
    Back: [
      { date: "18 Jul 2026" },
      { date: "18 Jun 2026" },
      { date: "18 May 2026" },
      { date: "18 Apr 2026" },
      { date: "18 Mar 2026" },
      { date: "18 Feb 2026" },
    ],
  },
  measurements: {
    weekly: {
      cm: [
        { label: "Neck", values: ["38.0", "38.1", "38.3"], delta: "-0.1 cm", tone: "good" },
        { label: "Shoulder", values: ["112.0", "111.9", "111.8"], delta: "+0.1 cm", tone: "bad" },
        { label: "Chest", values: ["96.0", "96.5", "97.0"], delta: "-0.5 cm", tone: "good" },
        { label: "Waist", values: ["82.0", "83.0", "84.0"], delta: "-1 cm", tone: "good" },
        { label: "Hip", values: ["98.0", "98.5", "99.0"], delta: "-0.5 cm", tone: "good" },
        { label: "Thighs", values: ["56.0", "56.3", "56.5"], delta: "-0.3 cm", tone: "good" },
      ],
      inch: [
        { label: "Neck", values: ["15.0", "15.0", "15.1"], delta: "-0.1 in", tone: "good" },
        { label: "Shoulder", values: ["44.1", "44.1", "44.0"], delta: "+0.1 in", tone: "bad" },
        { label: "Chest", values: ["37.8", "38.0", "38.2"], delta: "-0.4 in", tone: "good" },
        { label: "Waist", values: ["32.3", "32.7", "33.1"], delta: "-0.8 in", tone: "good" },
        { label: "Hip", values: ["38.6", "38.8", "39.0"], delta: "-0.4 in", tone: "good" },
        { label: "Thighs", values: ["22.0", "22.2", "22.2"], delta: "-0.2 in", tone: "good" },
      ],
    },
    monthly: {
      cm: [
        { label: "Neck", values: ["38.0", "38.5", "39.0"], delta: "-0.5 cm", tone: "good" },
        { label: "Shoulder", values: ["112.0", "111.5", "111.0"], delta: "+0.5 cm", tone: "bad" },
        { label: "Chest", values: ["96.0", "98.0", "100.0"], delta: "-2 cm", tone: "good" },
        { label: "Waist", values: ["82.0", "86.0", "90.0"], delta: "-4 cm", tone: "good" },
        { label: "Hip", values: ["98.0", "100.0", "102.0"], delta: "-2 cm", tone: "good" },
        { label: "Thighs", values: ["56.0", "57.0", "58.0"], delta: "-1 cm", tone: "good" },
      ],
      inch: [
        { label: "Neck", values: ["15.0", "15.2", "15.4"], delta: "-0.2 in", tone: "good" },
        { label: "Shoulder", values: ["44.1", "43.9", "43.7"], delta: "+0.2 in", tone: "bad" },
        { label: "Chest", values: ["37.8", "38.6", "39.4"], delta: "-0.8 in", tone: "good" },
        { label: "Waist", values: ["32.3", "33.9", "35.4"], delta: "-1.6 in", tone: "good" },
        { label: "Hip", values: ["38.6", "39.4", "40.2"], delta: "-0.8 in", tone: "good" },
        { label: "Thighs", values: ["22.0", "22.4", "22.8"], delta: "-0.4 in", tone: "good" },
      ],
    },
  },
  metabolic: {
    weekly: [
      { label: "BMI", values: ["27.4", "27.6", "27.8"], delta: "-0.2", tone: "good" },
      { label: "BMR", values: ["1420 kcal", "1416.3 kcal", "1412.5 kcal"], delta: "+3.7", tone: "bad" },
      { label: "TDEE", values: ["2050 kcal", "2042.5 kcal", "2035 kcal"], delta: "+7.5", tone: "bad" },
      { label: "Body fat %", values: ["31.2%", "31.6%", "32%"], delta: "-0.4", tone: "good" },
      { label: "Lean muscle %", values: ["27.8%", "27.6%", "27.4%"], delta: "+0.2", tone: "good" },
      { label: "Visceral fat", values: ["9", "9.3", "9.5"], delta: "-0.3", tone: "good" },
      { label: "Fatty liver idx", values: ["1.8", "1.9", "1.9"], delta: "-0.1", tone: "good" },
    ],
    monthly: [
      { label: "BMI", values: ["27.4", "28.1", "28.8"], delta: "-0.7", tone: "good" },
      { label: "BMR", values: ["1420 kcal", "1405 kcal", "1390 kcal"], delta: "+15", tone: "bad" },
      { label: "TDEE", values: ["2050 kcal", "2020 kcal", "1990 kcal"], delta: "+30", tone: "bad" },
      { label: "Body fat %", values: ["31.2%", "32.8%", "34.4%"], delta: "-1.6", tone: "good" },
      { label: "Lean muscle %", values: ["27.8%", "26.9%", "26.1%"], delta: "+0.9", tone: "good" },
      { label: "Visceral fat", values: ["9", "10", "11"], delta: "-1", tone: "good" },
      { label: "Fatty liver idx", values: ["1.8", "2.1", "2.4"], delta: "-0.3", tone: "good" },
    ],
  },
};
