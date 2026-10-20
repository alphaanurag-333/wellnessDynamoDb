const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_POINTS,
  MAX_SECTIONS,
  flattenSectionPoints,
  normalizeSections,
  sectionsFromStored,
} = require("../utils/protocolSections");

describe("protocol sections", () => {
  it("keeps a heading and up to 50 points on each section", () => {
    const sections = normalizeSections([
      { id: "morning", heading: "Morning", points: ["Wake at 6", "Walk 20 minutes"] },
      { id: "evening", heading: "Evening", points: ["Lights out by 10"] },
    ]);

    assert.equal(sections.length, 2);
    assert.equal(sections[0].id, "morning");
    assert.deepEqual(flattenSectionPoints(sections), [
      "Wake at 6",
      "Walk 20 minutes",
      "Lights out by 10",
    ]);
  });

  it("turns an older flat point list into one section", () => {
    const sections = sectionsFromStored({
      id: "version-1",
      points: ["Drink water", "Eat on time"],
    });

    assert.equal(sections.length, 1);
    assert.equal(sections[0].heading, "Protocol");
    assert.deepEqual(sections[0].points, ["Drink water", "Eat on time"]);
  });

  it("rejects a section without a heading or with too many points", () => {
    assert.throws(
      () => normalizeSections([{ heading: " ", points: ["Walk"] }]),
      /needs a heading/
    );
    assert.throws(
      () => normalizeSections([{
        heading: "Meals",
        points: Array.from({ length: MAX_POINTS + 1 }, (_, index) => `Point ${index + 1}`),
      }]),
      /cannot have more than 50 points/
    );
    assert.throws(
      () => normalizeSections(
        Array.from({ length: MAX_SECTIONS + 1 }, (_, index) => ({
          heading: `Section ${index + 1}`,
          points: ["One point"],
        }))
      ),
      /cannot have more than 20 sections/
    );
  });
});
