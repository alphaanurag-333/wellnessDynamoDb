const { describe, it, mock, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

/**
 * energyExchangeEntitlementService destructures createSubscription at load time,
 * so we must reload subscription + entitlement modules after installing mocks.
 */
function loadGrantDurationWithMocks({ program, listItems, capture }) {
  delete require.cache[require.resolve("../models/energyExchangeSubscriptionModel")];
  delete require.cache[require.resolve("../models/energyExchangeProgramModel")];
  delete require.cache[require.resolve("../models/userModel")];
  delete require.cache[require.resolve("../services/energyExchangeEntitlementService")];

  const programModel = require("../models/energyExchangeProgramModel");
  const subscriptionModel = require("../models/energyExchangeSubscriptionModel");
  const userModel = require("../models/userModel");

  mock.method(programModel, "getEnabledProgramForUser", async () => program);
  mock.method(subscriptionModel, "listSubscriptionsByUserId", async () => ({ items: listItems }));
  mock.method(subscriptionModel, "createSubscription", async (input) => {
    if (capture) capture(input);
    return { id: "sub-new", ...input };
  });
  mock.method(userModel, "getUserById", async (id) => ({
    id,
    energyExchangeEnabled: true,
  }));

  return require("../services/energyExchangeEntitlementService").grantBundledDurationAppSubscription;
}

describe("grantBundledDurationAppSubscription", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("starts at paidAt when there is no prior coverage", async () => {
    let created;
    const grantBundledDurationAppSubscription = loadGrantDurationWithMocks({
      program: { id: "prog-1", monthlyAmount: 100, currency: "INR" },
      listItems: [],
      capture: (input) => {
        created = input;
      },
    });

    await grantBundledDurationAppSubscription(
      { id: "u1" },
      { id: "txn-1" },
      { enabled: true, durationPresetId: "30d" },
      "2026-06-15T10:00:00.000Z",
    );

    assert.equal(created.startsAt, "2026-06-15T10:00:00.000Z");
    assert.equal(created.status, "active");
    assert.ok(new Date(created.endsAt).getTime() > new Date(created.startsAt).getTime());
  });

  it("extends from latest endsAt when still covered at payment time", async () => {
    let created;
    const grantBundledDurationAppSubscription = loadGrantDurationWithMocks({
      program: { id: "prog-1", monthlyAmount: 100, currency: "INR" },
      listItems: [
        {
          id: "sub-old",
          status: "active",
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2026-12-31T23:59:59.999Z",
        },
      ],
      capture: (input) => {
        created = input;
      },
    });

    await grantBundledDurationAppSubscription(
      { id: "u1" },
      { id: "txn-2" },
      { enabled: true, durationPresetId: "30d" },
      "2026-06-15T10:00:00.000Z",
    );

    assert.equal(created.startsAt, "2026-12-31T23:59:59.999Z");
  });
});
