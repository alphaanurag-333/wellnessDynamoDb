const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMealPhotoAi, UNRELATED_MESSAGE } = require("../utils/mealPhotoAi");

test("normalizeMealPhotoAi keeps food macros", () => {
  const result = normalizeMealPhotoAi({
    related: true,
    message: "Amla beetroot juice",
    proteinGm: 4.2,
    fatsGm: 1,
    carbsGm: 22,
    caloriesKcal: 118,
    items: [{ name: "Juice", quantityGm: 250 }],
  });

  assert.equal(result.related, true);
  assert.equal(result.proteinGm, 4.2);
  assert.equal(result.caloriesKcal, 118);
  assert.equal(result.items[0].name, "Juice");
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

test("normalizeMealPhotoAi uses a default decline message", () => {
  const result = normalizeMealPhotoAi({ related: false });
  assert.equal(result.message, UNRELATED_MESSAGE);
});
