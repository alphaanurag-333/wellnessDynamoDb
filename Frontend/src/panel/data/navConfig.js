/**
 * Unified Panel navigation — one nav list rendered by every account type's
 * shell (Admin/Coach/Assistant/Staff), replacing the three portal-specific
 * `navItems.js` files. Reuses the *existing* feature pages at their
 * historical URLs (`/admin/...`, `/coach/...`) rather than moving them, so
 * each item's `scope` tells the sidebar how to resolve its link:
 *
 *   - `scope: "admin"` (default) — admin-catalog module, always lives at
 *     `/admin/<to>` regardless of which layout is currently rendering the
 *     sidebar (a custom Staff role browsing from `/panel` still lands on the
 *     real `/admin/<module>` page).
 *   - `scope: "home"` — resolves *relative* to whichever layout is currently
 *     mounted (Dashboard/Profile under `/admin`, `/coach`, `/assistant` or
 *     `/panel`; "My Clients"/"Meal Approvals"/"Assistants (AWC)" only ever
 *     render while a Coach/Assistant is in their own `/coach` or `/assistant`
 *     layout, so relative resolution always lands on the right prefix).
 *   - `scope: "panel"` — Panel-native pages (Staff Accounts, Roles) that only
 *     exist under `/panel/...`, regardless of which layout the Super Admin
 *     happens to be browsing from.
 *
 * `accountTypes`, when present, restricts a group/leaf to specific staff
 * account types (mirrors `Backend/config/staffPermissionCatalog.js`'s
 * `STAFF_ONLY_NAV_GROUP` for the Coach/Assistant-only "My Team" items).
 * Permission gating itself uses the same `<to>.view` slug convention as the
 * backend catalog — see `panel/utils/navAccess.js`.
 */
export const panelNavItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid", scope: "home", alwaysVisible: true },
  { to: "users", label: "User Management", icon: "users" },
  {
    id: "consultancy",
    label: "Consultancy Payments",
    icon: "wallet",
    children: [
      { to: "consultancy/transactions", label: "Transactions", icon: "receipt" },
      { to: "consultancy/enrolled-users", label: "Enrolled Users", icon: "user-check" },
      { to: "consultancy/pending-assignment", label: "Pending Assignment", icon: "user-plus" },
    ],
  },
  {
    id: "energy-exchange",
    label: "Energy Exchange",
    icon: "zap",
    children: [{ to: "energy-exchange/transactions", label: "Transactions", icon: "receipt" }],
  },
  {
    id: "wellness-program",
    label: "Wellness Programs",
    icon: "briefcase",
    children: [
      { to: "programs", label: "Catalog", icon: "list" },
      { to: "programs/transactions", label: "Transactions", icon: "receipt" },
    ],
  },
  // Wellness Coach / Assistant Coach account management now lives entirely
  // under Administration > Staff Accounts (`/panel/staff-accounts`) — the
  // old separate `/admin/coaches` and `/admin/awcs` pages are retired
  // (see `Frontend/src/admin/routes/adminRoutes.jsx`).
  { to: "specializations", label: "Specializations", icon: "award" },
  {
    id: "myTeam",
    label: "My Team",
    icon: "users",
    accountTypes: ["wellness_coach", "assistant_wellness_coach"],
    children: [
      {
        to: "my-users",
        label: "My Clients",
        icon: "clipboard-list",
        scope: "home",
        accountTypes: ["wellness_coach", "assistant_wellness_coach"],
      },
      {
        to: "meal-approvals",
        label: "Meal Approvals",
        icon: "clipboard-list",
        scope: "home",
        accountTypes: ["wellness_coach", "assistant_wellness_coach"],
      },
      {
        to: "my-assistants",
        label: "Assistants (AWC)",
        icon: "user-plus",
        scope: "home",
        accountTypes: ["wellness_coach", "assistant_wellness_coach"],
      },
    ],
  },
  {
    id: "health",
    label: "Health Library",
    icon: "heart",
    children: [
      { to: "health-concerns", label: "Health Concerns", icon: "heart" },
      { to: "health-recipes", label: "Health Recipes", icon: "utensils" },
      { to: "health-disorders", label: "Health Disorders", icon: "activity" },
      { to: "yoga", label: "Yoga", icon: "yoga" },
      { to: "physical-exercises", label: "Physical Exercise", icon: "activity" },
      { to: "supplements", label: "Supplements", icon: "box" },
      { to: "medical-condition-questions", label: "Medical Conditions", icon: "clipboard-list" },
    ],
  },
  {
    id: "launchAssessment",
    label: "LAUNCH Assessment",
    icon: "zap",
    children: [
      { to: "launch-questions", label: "Questions", icon: "clipboard-list" },
      { to: "launch-focus-areas", label: "Area to Focus", icon: "list" },
    ],
  },
  {
    id: "prakrutiAssessment",
    label: "Prakruti Assessment",
    icon: "leaf",
    children: [
      { to: "prakruti-questions", label: "Questions", icon: "clipboard-list" },
      { to: "prakruti-things-to-avoid", label: "Things to Avoid", icon: "list" },
      { to: "prakruti-recommendations", label: "Recommendations", icon: "sparkles" },
    ],
  },
  {
    id: "catalogs",
    label: "Catalogs",
    icon: "list",
    children: [
      { to: "test-catalog", label: "Test Catalog", icon: "activity" },
      { to: "diet-plan-catalog", label: "Diet Plan Catalog", icon: "utensils" },
      { to: "wellness-prescriptions", label: "Wellness Prescriptions", icon: "clipboard-list" },
      { to: "mental-wellbeing", label: "Mental Wellbeing", icon: "sparkles" },
    ],
  },
  {
    id: "testimonials",
    label: "Testimonials & Media",
    icon: "message-circle",
    children: [
      { to: "client-testimonials", label: "Client Reviews", icon: "quote" },
      { to: "program-testimonials", label: "Program Testimonials", icon: "quote" },
      { to: "real-people-testimonials", label: "Real People : Real Healing", icon: "quote" },
      { to: "video-testimonials", label: "Voice of Healing : Unfiltered", icon: "video" },
      { to: "transformations", label: "Transformations", icon: "trending-up" },
      { to: "commitment-letters", label: "Commitment Letters", icon: "file" },
    ],
  },
  {
    id: "leadership",
    label: "Leadership Messages",
    icon: "quote",
    children: [
      { to: "leadership-notes", label: "Leadership Notes", icon: "message-circle" },
      { to: "cofounder-message", label: "Cofounder Message", icon: "quote" },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: "award",
    children: [
      { to: "banners", label: "Banner Management", icon: "layout" },
      { to: "birthday-posts", label: "Birthday Posts", icon: "cake" },
      { to: "birthday-notifications", label: "Birthday Notifications", icon: "bell" },
      { to: "monthly-champions", label: "Monthly Champions", icon: "award" },
      { to: "notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    id: "content",
    label: "Site Content",
    icon: "file",
    children: [
      { to: "faq", label: "FAQ", icon: "help" },
      { to: "contact-inquiries", label: "Contact Inquiries", icon: "mail" },
      { to: "static-pages", label: "Static Pages", icon: "file" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "gear",
    children: [{ to: "settings", label: "App Settings", icon: "gear" }],
  },
  {
    id: "administration",
    label: "Administration",
    icon: "shield",
    // Meta-admin functionality (who can log in, what roles exist) must never
    // be delegable via a role's permissions — Super Admin only, same rule as
    // the legacy admin panel's "Administration" nav group.
    superAdminOnly: true,
    children: [
      { to: "staff-accounts", label: "Staff Accounts", icon: "users", scope: "panel" },
      { to: "roles", label: "Roles & Permissions", icon: "clipboard-list", scope: "panel" },
    ],
  },
  { to: "profile", label: "My Profile", icon: "profile", scope: "home", alwaysVisible: true },
];

export function flattenPanelNavLinks(items) {
  const out = [];
  for (const item of items) {
    if (Array.isArray(item.children)) {
      for (const c of item.children) out.push({ to: c.to, label: c.label });
    } else if (item.to) {
      out.push({ to: item.to, label: item.label });
    }
  }
  return out;
}
