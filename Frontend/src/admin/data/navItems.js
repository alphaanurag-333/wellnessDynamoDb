/**
 * Central navigation config: path segments under /admin/*
 * Items with `children` render as collapsible groups; leaf entries use `to` relative to /admin.
 * Order: core → users → payments → programs/team → health → assessments → catalogs → content → settings.
 */
export const navItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
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
  {
    id: "team",
    label: "Team & Coaches",
    icon: "users",
    children: [
      { to: "coaches", label: "Wellness Coaches", icon: "user" },
      { to: "awcs", label: "Assistant Coaches", icon: "user-plus" },
      { to: "specializations", label: "Specializations", icon: "award" },
    ],
  },
  {
    id: "health",
    label: "Health Library",
    icon: "heart",
    children: [
      { to: "health-concerns", label: "Health Concerns", icon: "heart" },
      // { to: "health-tools", label: "Health Tools", icon: "stethoscope" },
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
      { to: "client-testimonials", label: "Client Testimonials", icon: "quote" },
      { to: "program-testimonials", label: "Program Testimonials", icon: "quote" },
      { to: "real-people-testimonials", label: "Real People : Real Healing", icon: "quote" },
      { to: "video-testimonials", label: "Video Testimonials", icon: "video" },
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
      // { to: "coupons", label: "Coupons", icon: "percent" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "gear",
    children: [
      { to: "settings", label: "App Settings", icon: "gear" },
      { to: "profile", label: "Admin Profile", icon: "profile" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: "shield",
    // Super Admin only — not permission-gated like every other group above,
    // since sub-admin/role management is meta-admin functionality that must
    // never be delegable via a role's permissions.
    superAdminOnly: true,
    children: [
      { to: "sub-admins", label: "Sub-Admins", icon: "users" },
      { to: "roles", label: "Roles & Permissions", icon: "clipboard-list" },
    ],
  },
];

export function flattenNavLinks(items) {
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
