const { describe, it, mock, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const subscriptionModel = require("../models/energyExchangeSubscriptionModel");
const userModel = require("../models/userModel");
const userConversionModel = require("../models/userConversionModel");
const {
  runEnergyExchangeFyPromotion,
  maybeConvertExpiredUserToSeek,
} = require("../services/energyExchangeFyPromotionService");

describe("energyExchangeFyPromotionService — Seek on expiry", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("converts Maintenance users to Seek when no coverage remains", async () => {
    mock.method(subscriptionModel, "listActiveSubscriptionsEndingBefore", async () => [
      { id: "sub-old", userId: "u1", endsAt: "2026-03-31T23:59:59.999Z" },
    ]);
    mock.method(subscriptionModel, "updateSubscription", async (id, updates) => ({
      id,
      ...updates,
    }));
    mock.method(subscriptionModel, "listSubscriptionsByUserId", async (_userId, opts = {}) => {
      if (opts.status === "queued") return { items: [] };
      return { items: [{ id: "sub-old", status: "expired", endsAt: "2026-03-31T23:59:59.999Z" }] };
    });
    mock.method(userModel, "getUserById", async () => ({
      id: "u1",
      userTier: "maintenance",
    }));
    let converted = false;
    mock.method(userConversionModel, "convertMaintenanceToSeek", async () => {
      converted = true;
      return { id: "u1", userTier: "seek" };
    });

    const result = await runEnergyExchangeFyPromotion(new Date("2026-04-01T00:00:00.000Z"));
    assert.equal(result.expired, 1);
    assert.equal(result.activated, 0);
    assert.equal(result.convertedToSeek, 1);
    assert.equal(converted, true);
  });

  it("does not convert when a queued FY subscription is activated", async () => {
    mock.method(subscriptionModel, "listActiveSubscriptionsEndingBefore", async () => [
      { id: "sub-old", userId: "u1", endsAt: "2026-03-31T23:59:59.999Z" },
    ]);
    mock.method(subscriptionModel, "updateSubscription", async (id, updates) => ({
      id,
      ...updates,
    }));
    mock.method(subscriptionModel, "listSubscriptionsByUserId", async (_userId, opts = {}) => {
      if (opts.status === "queued") {
        return {
          items: [
            {
              id: "sub-next",
              fyStartYear: 2026,
              status: "queued",
              endsAt: "2027-03-31T23:59:59.999Z",
            },
          ],
        };
      }
      return {
        items: [
          { id: "sub-old", status: "expired", endsAt: "2026-03-31T23:59:59.999Z" },
          {
            id: "sub-next",
            status: "active",
            endsAt: "2027-03-31T23:59:59.999Z",
          },
        ],
      };
    });
    mock.method(userModel, "getUserById", async () => ({
      id: "u1",
      userTier: "maintenance",
    }));
    let converted = false;
    mock.method(userConversionModel, "convertMaintenanceToSeek", async () => {
      converted = true;
      return { id: "u1", userTier: "seek" };
    });

    const result = await runEnergyExchangeFyPromotion(new Date("2026-04-01T00:00:00.000Z"));
    assert.equal(result.activated, 1);
    assert.equal(result.convertedToSeek, 0);
    assert.equal(converted, false);
  });

  it("maybeConvertExpiredUserToSeek skips Heal users", async () => {
    mock.method(userModel, "getUserById", async () => ({
      id: "u-heal",
      userTier: "heal",
    }));
    let converted = false;
    mock.method(userConversionModel, "convertMaintenanceToSeek", async () => {
      converted = true;
    });
    const result = await maybeConvertExpiredUserToSeek("u-heal", Date.now());
    assert.equal(result, false);
    assert.equal(converted, false);
  });
});
