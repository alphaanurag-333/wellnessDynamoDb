const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveClientCategoryFromSubscriptionItem,
  resolveClientCategoryForSubscriptionPayment,
  resolveSubscriptionPlanFromItem,
} = require("../services/subscriptionCategoryService");

describe("subscription category resolution", () => {
  it("tags Eagles Subscription by name", () => {
    assert.equal(
      resolveClientCategoryFromSubscriptionItem({ id: "eagles", name: "Eagles Subscription", amount: 4999 }),
      "eagle"
    );
  });

  it("prefers an explicit clientCategory on the catalog row", () => {
    assert.equal(
      resolveClientCategoryFromSubscriptionItem({
        id: "corp",
        name: "Corporate plan",
        amount: 1000,
        clientCategory: "eagle",
      }),
      "eagle"
    );
  });

  it("tags a Maintenance plan by name", () => {
    assert.deepEqual(
      resolveSubscriptionPlanFromItem({ id: "maint", name: "Maintenance Plan", amount: 1999 }),
      { kind: "maintenance", clientCategory: "individual", userTier: "maintenance" }
    );
  });

  it("prefers an explicit maintenance clientCategory on the catalog row", () => {
    assert.equal(
      resolveSubscriptionPlanFromItem({
        id: "keep-access",
        name: "Continue app access",
        amount: 1999,
        clientCategory: "maintenance",
      }).kind,
      "maintenance"
    );
  });

  it("defaults non-eagle subscriptions to individual", () => {
    assert.equal(
      resolveClientCategoryFromSubscriptionItem({ id: "sub-year", name: "App subscription · yearly", amount: 4999 }),
      "individual"
    );
  });

  it("resolves category from catalog item id during payment", async () => {
    const category = await resolveClientCategoryForSubscriptionPayment({
      catalogItemId: "eagles-sub",
      catalogItemName: "Eagles Subscription",
      config: {
        app_subscription_pricing: [
          { id: "eagles-sub", name: "Eagles Subscription", amount: 4999 },
          { id: "sub-year", name: "App subscription · yearly", amount: 4999 },
        ],
      },
    });
    assert.equal(category, "eagle");
  });
});
