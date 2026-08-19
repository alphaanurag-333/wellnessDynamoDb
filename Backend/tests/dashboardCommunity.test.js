const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatBirthdayWhen,
  formatScoreDisplay,
  nextBirthdayFromDob,
  pickUpcomingBirthdays,
} = require("../services/dashboardCommunityService");

describe("formatBirthdayWhen", () => {
  it("labels today and upcoming dates like the dashboard chips", () => {
    assert.equal(formatBirthdayWhen(0, "2026-08-18"), "Today");
    assert.equal(formatBirthdayWhen(1, "2026-07-26"), "26 Jul");
    assert.equal(formatBirthdayWhen(8, "2026-08-02"), "2 Aug");
  });
});

describe("formatScoreDisplay", () => {
  it("renders reflection averages as percents", () => {
    assert.equal(formatScoreDisplay(96), "96%");
    assert.equal(formatScoreDisplay(91.25), "91.3%");
  });
});

describe("nextBirthdayFromDob", () => {
  it("keeps remaining dates this year and wraps past dates to next year", () => {
    assert.deepEqual(nextBirthdayFromDob("1990-08-18", "2026-08-18"), {
      dateOnly: "2026-08-18",
      offset: 0,
    });
    assert.equal(nextBirthdayFromDob("1991-12-01", "2026-08-18").dateOnly, "2026-12-01");
    assert.equal(nextBirthdayFromDob("1991-03-05", "2026-08-18").dateOnly, "2027-03-05");
  });
});

describe("pickUpcomingBirthdays", () => {
  it("returns the next 10 birthdays across the year, not only the current month", () => {
    const users = [
      { id: "1", name: "Today User", dob: "1990-08-18" },
      { id: "2", name: "Later Aug", dob: "1991-08-28" },
      { id: "3", name: "Sept User", dob: "1988-09-02" },
      { id: "4", name: "Nov User", dob: "1999-11-30" },
      { id: "5", name: "Dec User", dob: "1992-12-15" },
      { id: "6", name: "Jan User", dob: "1993-01-04" },
      { id: "7", name: "Mar User", dob: "1994-03-12" },
      { id: "8", name: "Apr User", dob: "1995-04-01" },
      { id: "9", name: "May User", dob: "1996-05-20" },
      { id: "10", name: "Jun User", dob: "1997-06-08" },
      { id: "11", name: "Jul User", dob: "1998-07-26" },
      { id: "12", name: "No Dob" },
    ];

    const rows = pickUpcomingBirthdays(users, 10, "2026-08-18");
    assert.equal(rows.length, 10);
    assert.equal(rows[0].when, "Today");
    assert.equal(rows[0].name, "Today User");
    assert.equal(rows[2].when, "2 Sep");
    assert.equal(rows[4].when, "15 Dec");
    assert.equal(rows[5].when, "4 Jan");
    assert.equal(rows.some((row) => row.name === "Jul User"), false);
    assert.equal(rows.some((row) => row.name === "No Dob"), false);
  });
});
