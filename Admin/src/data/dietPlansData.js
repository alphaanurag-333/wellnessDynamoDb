export const DIET_PLANS = [
  {
    id: "dp-gut-reset",
    title: "Gut Reset · 7 day",
    content:
      "Start on an empty stomach with warm lemon water, then a light vegetable broth before noon. No dairy, wheat, sugar or packaged food for seven days. Herbal teas only after noon. Day four adds cooked moong dal and steamed vegetables. Resume normal meals on day eight.",
    live: true,
  },
  {
    id: "dp-diabetes",
    title: "Diabetes friendly · low GI",
    content:
      "Three fixed meals, no snacking. Each plate is half non-starchy vegetables, a quarter protein and a quarter low-GI carbohydrate (millet, brown rice, whole dal). Fruit only with a fat or protein, never alone. Dinner two hours before bed, followed by a 15-minute walk. Fasting glucose logged every morning.",
    live: true,
  },
  {
    id: "dp-pcod",
    title: "PCOD balance",
    content:
      "Anti-inflammatory base: seasonal vegetables, cold-pressed oils and 1.2 g protein per kg body weight. Seed cycling through the cycle — flax and pumpkin in the follicular phase, sesame and sunflower in the luteal. Caffeine capped at one cup, sugar and refined flour removed. Strength work three times a week.",
    live: true,
  },
  {
    id: "dp-fat-loss",
    title: "Fat loss · high protein",
    content:
      "A 400-500 kcal deficit with protein at every meal — eggs, fish, paneer or dal. Vegetables fill half the plate. Carbs timed around training. Water 3 litres, no liquid calories. Weigh in weekly, not daily. One free meal on day seven if the week was logged honestly.",
    live: true,
  },
];

export function dietPlanWordCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
