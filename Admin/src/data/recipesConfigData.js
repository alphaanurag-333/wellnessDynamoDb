export const RECIPE_CATEGORIES = [
  "Fat loss",
  "Protein rich",
  "Diabetes friendly",
  "Gut reset",
  "Low GI",
  "PCOD friendly",
  "Thyroid friendly",
  "High fibre",
];

export const RECIPES_EDITOR = {
  appOn: true,
  webOn: true,
};

export const RECIPE_ITEMS = [
  {
    id: "rc-1",
    title: "Gut-reset khichdi",
    category: "Gut reset",
    type: "TEXT",
    duration: "4 min read",
    description: "A one-pot moong dal khichdi that settles digestion — low spice, high fibre, ready in 25 minutes.",
    live: true,
    cover: true,
    videoLink: "",
  },
  {
    id: "rc-2",
    title: "Overnight oats · high protein",
    category: "Protein rich",
    type: "TEXT",
    duration: "3 min read",
    description: "Rolled oats soaked with curd and chia, topped with soaked almonds. 22 g protein per bowl.",
    live: true,
    cover: true,
    videoLink: "",
  },
  {
    id: "rc-3",
    title: "Beetroot detox juice",
    category: "Fat loss",
    type: "VIDEO",
    duration: "2:40",
    description: "Beetroot, carrot and amla pressed cold — the functional juice used in the morning protocol.",
    live: true,
    cover: true,
    videoLink: "",
  },
  {
    id: "rc-4",
    title: "Paneer bhurji · low oil",
    category: "Protein rich",
    type: "VIDEO",
    duration: "6:15",
    description: "A five-ingredient bhurji cooked in one teaspoon of ghee. Works for lunch or dinner.",
    live: true,
    cover: true,
    videoLink: "",
  },
];

export const RECIPE_GALLERY_OWNERS = ["All owners", "Anita Rao", "Ishita Sen", "Rohan Das", "Priya Nair", "Admin"];

export const RECIPE_GALLERY = [
  { id: "rc-g1", title: "Gut-reset khichdi cover", owner: "Anita Rao", date: "18 Jul 2026", size: "1.2 MB", versions: 2, live: true },
  { id: "rc-g2", title: "Overnight oats cover", owner: "Ishita Sen", date: "12 Jul 2026", size: "980 KB", versions: 1, live: true },
  { id: "rc-g3", title: "Beetroot juice — method", owner: "Rohan Das", date: "05 Jul 2026", size: "48 MB", versions: 3, live: false },
  { id: "rc-g4", title: "Paneer bhurji — stove top", owner: "Priya Nair", date: "28 Jun 2026", size: "62 MB", versions: 2, live: false },
];
