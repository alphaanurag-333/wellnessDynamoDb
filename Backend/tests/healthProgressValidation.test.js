const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseHealthWeightKg,
  parseGlucoseValue,
  parseBloodPressureSys,
  parseBloodPressureDia,
  parseRequiredDateOnly,
  parseMenstrualDates,
  parseConditionBodyPart,
  healthProgressToday,
  normalizeGlucoseType,
} = require("../utils/healthProgressHelpers");

describe("health progress weight", () => {
  it("accepts kg greater than 0 up to 500", () => {
    assert.equal(parseHealthWeightKg("0.1", "kg"), 0.1);
    assert.equal(parseHealthWeightKg(80.5, "kg"), 80.5);
    assert.equal(parseHealthWeightKg("500", "kg"), 500);
  });

  it("converts lbs then checks the 500 kg cap", () => {
    assert.equal(parseHealthWeightKg("180", "lbs"), 81.65);
    assert.equal(parseHealthWeightKg("1102", "lbs"), 499.86);
  });

  it("rejects empty, zero, oversized, and unsafe values", () => {
    assert.equal(parseHealthWeightKg("", "kg"), null);
    assert.throws(() => parseHealthWeightKg("0", "kg"), /positive number/);
    assert.throws(() => parseHealthWeightKg("501", "kg"), /at most 500/);
    assert.throws(() => parseHealthWeightKg("2000", "lbs"), /at most 500/);
    assert.throws(() => parseHealthWeightKg("100000000000000000000", "lbs"), /at most 500/);
    assert.throws(() => parseHealthWeightKg("1e20", "kg"), /positive number/);
  });
});

describe("health progress glucose", () => {
  it("requires fbs or ppbs and value 0 < n <= 600", () => {
    assert.equal(normalizeGlucoseType("FBS"), "fbs");
    assert.equal(normalizeGlucoseType("ppbs"), "ppbs");
    assert.throws(() => normalizeGlucoseType("hba1c"), /fbs or ppbs/);
    assert.equal(parseGlucoseValue("112"), 112);
    assert.equal(parseGlucoseValue(600), 600);
    assert.equal(parseGlucoseValue(""), null);
    assert.throws(() => parseGlucoseValue("0"), /positive number/);
    assert.throws(() => parseGlucoseValue("601"), /at most 600/);
  });
});

describe("health progress blood pressure", () => {
  it("caps sys at 300 and dia at 200 without requiring sys > dia", () => {
    assert.equal(parseBloodPressureSys("120"), 120);
    assert.equal(parseBloodPressureDia("80"), 80);
    assert.equal(parseBloodPressureSys("110"), 110);
    assert.equal(parseBloodPressureDia("130"), 130);
    assert.throws(() => parseBloodPressureSys("301"), /at most 300/);
    assert.throws(() => parseBloodPressureDia("201"), /at most 200/);
    assert.throws(() => parseBloodPressureSys("0"), /positive number/);
  });
});

describe("health progress dates", () => {
  it("requires YYYY-MM-DD and rejects future dates", () => {
    const today = healthProgressToday();
    assert.equal(parseRequiredDateOnly(today, "date"), today);
    assert.equal(parseRequiredDateOnly("2020-01-15", "date"), "2020-01-15");
    assert.throws(() => parseRequiredDateOnly("", "date"), /required/);
    assert.throws(() => parseRequiredDateOnly("15-01-2020", "date"), /YYYY-MM-DD/);
    assert.throws(() => parseRequiredDateOnly("2099-01-01", "date"), /future/);
  });

  it("requires menstrual endDate on or after startDate", () => {
    const dates = parseMenstrualDates({ startDate: "2026-08-01", endDate: "2026-08-01" });
    assert.equal(dates.startDate, "2026-08-01");
    assert.equal(dates.endDate, "2026-08-01");
    assert.throws(
      () => parseMenstrualDates({ startDate: "2026-08-10", endDate: "2026-08-01" }),
      /on or after startDate/
    );
    assert.throws(
      () => parseMenstrualDates({ startDate: "2099-01-01", endDate: "2099-01-02" }),
      /future/
    );
  });
});

describe("health progress condition comparison", () => {
  it("requires a known body part and bodyPartOther when other", () => {
    assert.deepEqual(parseConditionBodyPart({ bodyPart: "face" }), {
      bodyPart: "face",
      bodyPartOther: null,
    });
    assert.deepEqual(parseConditionBodyPart({ bodyPart: "other", bodyPartOther: "scalp" }), {
      bodyPart: "other",
      bodyPartOther: "scalp",
    });
    assert.throws(() => parseConditionBodyPart({ bodyPart: "chest" }), /Invalid body part/);
    assert.throws(
      () => parseConditionBodyPart({ bodyPart: "other" }),
      /bodyPartOther is required/
    );
  });
});
