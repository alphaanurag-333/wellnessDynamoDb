const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMealPhotoAi, normalizeMealItemsAi, UNRELATED_MESSAGE } = require("../utils/mealPhotoAi");

test("normalizeMealPhotoAi keeps food macros", () => {
  const result = normalizeMealPhotoAi({
    related: true,
    message: "Amla beetroot juice",
    proteinGm: 4.2,
    fatsGm: 1,
    carbsGm: 22,
    caloriesKcal: 118,
    items: [{
      name: "Juice",
      quantityGm: 250,
      proteinGm: 4.2,
      fatsGm: 1,
      carbsGm: 22,
      caloriesKcal: 118,
    }],
  });

  assert.equal(result.related, true);
  assert.equal(result.proteinGm, 4);
  assert.equal(result.caloriesKcal, 118);
  assert.equal(result.items[0].name, "Juice");
  assert.equal(result.items[0].proteinGm, 4.2);
});

test("normalizeMealPhotoAi meal totals equal the rounded item rows", () => {
  const result = normalizeMealPhotoAi({
    related: true,
    message: "Lunch",
    proteinGm: 50,
    fatsGm: 20,
    carbsGm: 80,
    caloriesKcal: 900,
    items: [
      { name: "Rice", quantityGm: 150, proteinGm: 4.6, fatsGm: 0.4, carbsGm: 40.4, caloriesKcal: 180.4 },
      { name: "Dal", quantityGm: 100, proteinGm: 8.6, fatsGm: 3.4, carbsGm: 18.2, caloriesKcal: 140.6 },
    ],
  });

  assert.equal(result.proteinGm, 5 + 9);
  assert.equal(result.fatsGm, 0 + 3);
  assert.equal(result.carbsGm, 40 + 18);
  assert.equal(result.caloriesKcal, 180 + 141);
  assert.equal(result.items[0].proteinGm, 4.6);
  assert.equal(result.items[1].caloriesKcal, 140.6);
});

test("normalizeMealPhotoAi distributes meal macros to items without per-item macros", () => {
  const result = normalizeMealPhotoAi({
    related: true,
    message: "Lunch plate",
    proteinGm: 40,
    fatsGm: 20,
    carbsGm: 60,
    caloriesKcal: 600,
    items: [
      { name: "Roti", quantityGm: 100 },
      { name: "Dal", quantityGm: 100 },
    ],
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].proteinGm, 20);
  assert.equal(result.items[1].proteinGm, 20);
  assert.equal(result.items[0].caloriesKcal, 300);
});

test("normalizeMealPhotoAi declines unrelated images with zero macros", () => {
  const result = normalizeMealPhotoAi({
    related: false,
    message: "This is a selfie, not food.",
    proteinGm: 40,
    fatsGm: 12,
    carbsGm: 8,
    caloriesKcal: 300,
  });

  assert.equal(result.related, false);
  assert.equal(result.proteinGm, 0);
  assert.equal(result.fatsGm, 0);
  assert.equal(result.carbsGm, 0);
  assert.equal(result.caloriesKcal, 0);
  assert.equal(result.items.length, 0);
  assert.match(result.message, /selfie/i);
});

test("normalizeMealItemsAi keeps the submitted name and quantity", () => {
  const result = normalizeMealItemsAi({
    related: true,
    message: "Egg, carrot, and papaya",
    items: [
      { name: "2 eggs", quantityGm: 100, proteinGm: 12.4, fatsGm: 10, carbsGm: 1.1, caloriesKcal: 144 },
      { name: "Carrot", quantityGm: 80, proteinGm: 0.9, fatsGm: 0.2, carbsGm: 9.6, caloriesKcal: 41 },
      { name: "Papaya", quantityGm: 200, proteinGm: 0.7, fatsGm: 0.4, carbsGm: 16, caloriesKcal: 64 },
    ],
  }, [
    { name: "Egg", quantityGm: 2 },
    { name: "Gajar", quantityGm: 100 },
    { name: "Papita", quantityGm: 150 },
  ]);

  assert.deepEqual(result.items.map((item) => [item.name, item.quantityGm]), [
    ["Egg", 2],
    ["Gajar", 100],
    ["Papita", 150],
  ]);
  assert.equal(result.items[0].proteinGm, 12.4);
  assert.equal(result.items[1].caloriesKcal, 41);
  assert.equal(result.proteinGm, 12 + 1 + 1);
  assert.equal(result.caloriesKcal, 144 + 41 + 64);
  assert.equal(result.related, true);
});

test("normalizeMealPhotoAi uses a default decline message", () => {
  const result = normalizeMealPhotoAi({ related: false });
  assert.equal(result.message, UNRELATED_MESSAGE);
});
