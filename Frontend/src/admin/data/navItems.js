/**
 * Central navigation config: path segments under /admin/*
 * Items with `children` render as collapsible groups; leaf entries use `to` relative to /admin.
 * Order mirrors adminRoutes.jsx: core → users → program → wellness → content → health → testimonials → settings.
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
  { to: "coaches", label: "Wellness Coaches", icon: "user" },
  { to: "awcs", label: "Assistant Coaches", icon: "user-plus" },
  { to: "specializations", label: "Specializations", icon: "award" },

  { to: "health-concerns", label: "Health Concerns", icon: "heart" },
  // { to: "health-tools", label: "Health Tools", icon: "stethoscope" },
  { to: "health-recipes", label: "Health Recipes", icon: "utensils" },
  { to: "health-disorders", label: "Health Disorders", icon: "activity" },
  { to: "yoga", label: "Yoga", icon: "yoga" },
  { to: "physical-exercises", label: "Physical Exercise", icon: "activity" },
  { to: "supplements", label: "Supplements", icon: "box" },
  { to: "medical-condition-questions", label: "Medical Conditions", icon: "clipboard-list" },
  { to: "test-catalog", label: "Test Catalog", icon: "activity" },
  { to: "mental-wellbeing", label: "Mental Wellbeing", icon: "sparkles" },
  {
    id: "testimonials",
    label: "Testimonials & Media",
    icon: "message-circle",
    children: [
      { to: "client-testimonials", label: "Client Testimonials", icon: "quote" },
      { to: "video-testimonials", label: "Video Testimonials", icon: "video" },
    ],
  },
  { to: "transformations", label: "Transformations", icon: "trending-up" },
  { to: "banners", label: "Banner Management", icon: "layout" },
  { to: "birthday-posts", label: "Birthday Posts", icon: "cake" },
  { to: "birthday-notifications", label: "Birthday Notifications", icon: "bell" },
  { to: "notifications", label: "Notifications", icon: "bell" },
  // { to: "coupons", label: "Coupons", icon: "percent" },
  { to: "faq", label: "FAQ", icon: "help" },
  { to: "static-pages", label: "Static Pages", icon: "file" },
  { to: "settings", label: "App Settings", icon: "gear" },
  { to: "profile", label: "Admin Profile", icon: "profile" },
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
