const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyFatLoss,
  classifyHba1c,
  looksLikeA1cSeries,
  isHealClientInOnboarding,
  buildOnboardingRow,
  coachNameFromMap,
  wellnessCoachIdsForUser,
  formatChangeKg,
  formatChangePts,
  resolveGoalWeightKg,
  buildFatLossConcernIdSet,
  isFatLossPrimaryConcern,
  isFatLossConcernTitle,
  resolveWeightSeriesForUser,
  extractHba1cFromLabReport,
  listHba1cReadingsFromLabReports,
  labReportsToHba1cReadings,
  mergeHba1cReadings,
} = require("../utils/programProgressCalculations");

describe("classifyFatLoss", () => {
  it("flags 6–10 kg down independently of goal buckets", () => {
    const flags = classifyFatLoss({ startKg: 92, currentKg: 84.2, heightCm: 165 });
    assert.equal(flags.down610, true);
    assert.ok(flags.lost >= 6);
  });

  it("flags at / 2 kg short when current is within 2 kg of coach target", () => {
    const flags = classifyFatLoss({
      startKg: 78,
      currentKg: 69.2,
      heightCm: null,
      goalKg: 68,
    });
    assert.equal(flags.neartarget, true);
    assert.equal(flags.goalKg, 68);
  });

  it("flags halfway when at least 50% of coach target loss is done but not near target", () => {
    const flags = classifyFatLoss({
      startKg: 98,
      currentKg: 91,
      heightCm: 168,
      goalKg: 88,
    });
    assert.equal(flags.halfway, true);
    assert.equal(flags.neartarget, false);
    assert.equal(flags.goalKg, 88);
  });

  it("skips goal buckets without coach target but still flags 6–10 kg down", () => {
    const flags = classifyFatLoss({ startKg: 92, currentKg: 84.2, heightCm: 165 });
    assert.equal(flags.down610, true);
    assert.equal(flags.halfway, false);
    assert.equal(flags.neartarget, false);
    assert.equal(flags.goalKg, null);
  });

  it("coach target scenarios (start 80 kg, target 60 kg)", () => {
    const base = { startKg: 80, goalKg: 60, heightCm: null };
    const twelve = classifyFatLoss({ ...base, currentKg: 68 });
    assert.equal(twelve.halfway, true);
    assert.equal(twelve.neartarget, false);
    assert.equal(twelve.down610, false);

    const ten = classifyFatLoss({ ...base, currentKg: 70 });
    assert.equal(ten.down610, true);
    assert.equal(ten.halfway, true);
    assert.equal(ten.neartarget, false);

    const near = classifyFatLoss({ ...base, currentKg: 61 });
    assert.equal(near.neartarget, true);
    assert.equal(near.halfway, false);
    assert.equal(near.down610, false);
  });

  it("uses coach-set target weight when provided", () => {
    const flags = classifyFatLoss({
      startKg: 80,
      currentKg: 62,
      heightCm: null,
      goalKg: 60,
    });
    assert.equal(flags.goalKg, 60);
    assert.equal(flags.neartarget, true);
  });
});

describe("fat loss client filter", () => {
  it("matches Fat Loss catalog titles", () => {
    assert.equal(isFatLossConcernTitle("Fat Loss"), true);
    assert.equal(isFatLossConcernTitle("Weight Loss Program"), true);
    assert.equal(isFatLossConcernTitle("Diabetes Reversal"), false);
  });

  it("includes purchased clients with primary Fat Loss concern id", () => {
    const catalog = [{ id: "hc-fat", title: "Fat Loss", status: "active" }];
    const ids = buildFatLossConcernIdSet(catalog);
    const user = {
      programPurchased: true,
      primaryHealthConcern: "hc-fat",
    };
    assert.equal(isFatLossPrimaryConcern(user, ids), true);
    assert.equal(
      isFatLossPrimaryConcern({ ...user, primaryHealthConcern: "hc-diabetes" }, ids),
      false,
    );
    assert.equal(isFatLossPrimaryConcern({ ...user, programPurchased: false }, ids), false);
  });
});

describe("resolveWeightSeriesForUser", () => {
  it("returns earliest and latest weights across sources", () => {
    const series = resolveWeightSeriesForUser(
      [{ weightKg: 80, recordedAt: "2026-01-01" }],
      [{ weightKg: 75, weightUnit: "kg", recordedAt: "2026-02-01" }],
    );
    assert.equal(series.skip, false);
    assert.equal(series.startKg, 80);
    assert.equal(series.actualKg, 75);
  });

  it("skips a single unchanged reading", () => {
    const series = resolveWeightSeriesForUser([{ weightKg: 80, recordedAt: "2026-01-01" }], []);
    assert.equal(series.skip, true);
  });
});

describe("classifyHba1c", () => {
  it("treats 2+ point drops and values below 6.5", () => {
    const flags = classifyHba1c({ start: 8.9, current: 6.4 });
    assert.equal(flags.down2, true);
    assert.equal(flags.under65, true);
  });

  it("ignores glucose-scale mg/dL readings", () => {
    assert.equal(looksLikeA1cSeries([112, 98, 104]), false);
    const flags = classifyHba1c({ start: 112, current: 98 });
    assert.equal(flags.down2, false);
    assert.equal(flags.under65, false);
  });
});

describe("lab report HbA1c extraction", () => {
  it("reads analysed AI panels and ignores non-A1c glucose logs", () => {
    const report = {
      aiStatus: "analysed",
      reportDate: "2026-07-12",
      aiAnalysis: {
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", value: "6.8%", tone: "bad", note: "Elevated" }],
        }],
      },
    };
    assert.deepEqual(extractHba1cFromLabReport(report), {
      value: 6.8,
      recordedAt: "2026-07-12",
    });

    const readings = mergeHba1cReadings(
      [{ value: 112, recordedAt: "2026-06-01T00:00:00.000Z", createdAt: "2026-06-01T00:00:00.000Z" }],
      [
        {
          aiStatus: "analysed",
          reportDate: "2026-03-01",
          aiAnalysis: {
            panels: [{ title: "GLUCOSE", rows: [{ name: "HbA1c", value: "8.9" }] }],
          },
        },
        report,
      ],
    );
    assert.equal(readings.length, 2);
    assert.equal(readings[0].value, 8.9);
    assert.equal(readings[1].value, 6.8);
    const flags = classifyHba1c({
      start: readings[0].value,
      current: readings[1].value,
    });
    assert.equal(flags.down2, true);
    assert.equal(flags.under65, false);
  });

  it("skips reports without analysed AI output", () => {
    assert.equal(extractHba1cFromLabReport({ aiStatus: "pending" }), null);
    assert.equal(labReportsToHba1cReadings([{ aiStatus: "failed" }]).length, 0);
  });

  it("returns the latest seven deduped HbA1c readings from blood reports", () => {
    const mk = (id, reportDate, value) => ({
      id,
      aiStatus: "analysed",
      reportDate,
      updatedAt: `${reportDate}T12:00:00.000Z`,
      aiAnalysis: {
        panels: [{
          title: "GLUCOSE",
          rows: [{ name: "HbA1c", value: String(value), tone: "bad", note: "Note", rr: "< 5.7%" }],
        }],
      },
    });

    const reports = [];
    for (let i = 0; i < 10; i += 1) {
      const month = String(i + 1).padStart(2, "0");
      reports.push(mk(`r${i}`, `2026-${month}-15`, 5 + i * 0.1));
    }
    reports.push(mk("dup", "2026-10-15", 9.9));

    const readings = listHba1cReadingsFromLabReports(reports);
    assert.equal(readings.length, 7);
    assert.equal(readings[0].value, 5.3);
    assert.equal(readings[6].value, 9.9);
    assert.equal(readings[6].reportId, "dup");
    assert.equal(readings[6].rr, "< 5.7%");
  });
});

describe("onboarding journey", () => {
  it("includes heal clients who have not finished the 10 steps", () => {
    const user = {
      userTier: "heal",
      paidOnboardingCompleted: false,
      paidOnboardingStepStatus: {
        personalDetails: "done",
        bodyAnalytics: "pending",
      },
      name: "Test Client",
      lastActiveAt: new Date().toISOString(),
    };
    assert.equal(isHealClientInOnboarding(user), true);
    const row = buildOnboardingRow(user, "Anita Rao");
    assert.match(row.step, /Step 2 of 10/);
    assert.equal(row.coach, "Anita Rao");
  });

  it("resolves the wellness coach from the account id, including a direct assignee", () => {
    const user = {
      parentCoachId: "coach-account-1",
      assignedCoachId: "coach-account-1",
      assignedCoachType: "wellness_coach",
    };
    assert.deepEqual(wellnessCoachIdsForUser(user), ["coach-account-1"]);
    const names = new Map([["coach-account-1", "Rahul Mehta"]]);
    assert.equal(coachNameFromMap(user, names), "Rahul Mehta");
  });

  it("uses a directly assigned wellness coach when the parent id has no name", () => {
    const user = {
      parentCoachId: "",
      assignedCoachId: "coach-2",
      assignedCoachType: "wellness_coach",
    };
    const names = new Map([["coach-2", "Anita Rao"]]);
    assert.equal(coachNameFromMap(user, names), "Anita Rao");
  });

  it("stays unassigned when neither coach id resolves", () => {
    assert.equal(
      coachNameFromMap({ parentCoachId: "missing", assignedCoachType: "assistant_wellness_coach", assignedCoachId: "awc-1" }, new Map()),
      "Not assigned",
    );
  });

  it("excludes completed heal clients", () => {
    const user = {
      userTier: "heal",
      paidOnboardingCompleted: true,
      paidOnboardingStepStatus: {
        personalDetails: "done",
        bodyAnalytics: "done",
        internalParameter: "done",
        launch: "done",
        rca: "done",
        reportsBriefing: "done",
        hap: "done",
        protocolSettings: "done",
        commitmentLetter: "done",
        programInitiation: "done",
      },
    };
    assert.equal(isHealClientInOnboarding(user), false);
  });
});

describe("formatters", () => {
  it("formats kg and point deltas", () => {
    assert.equal(formatChangeKg(9.5), "−9.5 kg");
    assert.equal(formatChangePts(2.5), "−2.5 pts");
  });

  it("uses a 10 kg default goal when height is missing", () => {
    assert.equal(resolveGoalWeightKg(80, null), 70);
  });
});
