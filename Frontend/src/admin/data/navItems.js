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
      { to: "consultancy/transactions", label: "Transactions", icon: "wallet" },
      { to: "consultancy/enrolled-users", label: "Enrolled Users", icon: "users" },
    ],
  },
  { to: "coaches", label: "Wellness Coaches", icon: "users" },
  { to: "awcs", label: "Assistant Coaches", icon: "users" },
  { to: "specializations", label: "Specializations", icon: "sliders" },

  { to: "health-concerns", label: "Health Concerns", icon: "heart" },
  { to: "health-tools", label: "Health Tools", icon: "sliders" },
  { to: "health-recipes", label: "Health Recipes", icon: "utensils" },
  { to: "health-disorders", label: "Health Disorders", icon: "activity" },
  { to: "yoga", label: "Yoga", icon: "yoga" },
  {
    id: "testimonials",
    label: "Testimonials & Media",
    icon: "users",
    children: [
      { to: "client-testimonials", label: "Client Testimonials", icon: "users" },
      { to: "video-testimonials", label: "Video Testimonials", icon: "users" },
    ],
  },
  { to: "transformations", label: "Transformations", icon: "image" },
  { to: "banners", label: "Banner Management", icon: "image" },
  { to: "celebration-banners", label: "Celebration Banners", icon: "image" },
  { to: "notifications", label: "Notifications", icon: "bell" },
  { to: "coupons", label: "Coupons", icon: "percent" },
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
