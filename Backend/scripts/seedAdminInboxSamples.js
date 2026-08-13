require("dotenv").config();
const {
  emitAdminActivity,
} = require("../services/adminActivityService");

async function main() {
  const samples = [
    {
      kind: "payment",
      title: "Program payment received – Rs. 12,500",
      from: "Billing",
      href: "/users",
    },
    {
      kind: "calendar",
      title: "Hetu Mehra's birthday is today",
      from: "Community",
      href: "/calendar",
    },
    {
      kind: "champion",
      title: "Madhupriya Bilas leads Jul 2026 leaderboard",
      from: "Daily Reflection",
      href: "/dashboard",
    },
    {
      kind: "feedback",
      title: "New contact inquiry from Support queue",
      from: "Support",
      href: "/dashboard",
    },
  ];

  for (const sample of samples) {
    const row = await emitAdminActivity(sample);
    console.log("seeded", row.kind, row.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
