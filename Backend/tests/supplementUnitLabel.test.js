const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { formatSupplementQuantityLabel } = require("../utils/supplementUnitLabel");

describe("formatSupplementQuantityLabel", () => {
  it("uses singular supplement units when count is 1", () => {
    assert.equal(formatSupplementQuantityLabel(1, "Caps"), "1 Cap");
    assert.equal(formatSupplementQuantityLabel(1, "Tablets"), "1 Tablet");
    assert.equal(formatSupplementQuantityLabel(1, "Drops"), "1 Drop");
  });

  it("uses plural supplement units when count is not 1", () => {
    assert.equal(formatSupplementQuantityLabel(2, "Caps"), "2 Caps");
    assert.equal(formatSupplementQuantityLabel(10, "Caps"), "10 Caps");
  });

  it("leaves mass and volume units unchanged", () => {
    assert.equal(formatSupplementQuantityLabel(1, "mg"), "1 mg");
    assert.equal(formatSupplementQuantityLabel(2, "g"), "2 g");
  });
});
