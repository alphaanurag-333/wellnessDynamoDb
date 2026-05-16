/**
 * Central navigation config: path segments under /admin/*
 * Items with `children` render as collapsible groups; leaf entries use `to` relative to /admin.
 */
export const navItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "users", label: "User Management", icon: "users" },

  {
    id: "wellness",
    label: "Wellness Management",
    icon: "map",
    children: [
      { to: "nutrition-plans", label: "Nutrition Plans", icon: "list" },
      { to: "support-tickets", label: "Support Tickets", icon: "list" },
      { to: "camp-events", label: "Camp Events", icon: "list" },
      { to: "program-completions", label: "Program Completions", icon: "list" },
    ],
  },

  {
    id: "program",
    label: "Program Management",
    icon: "zap",
    children: [
      { to: "programs", label: "Programs", icon: "list" },
      { to: "coaches", label: "Coaches", icon: "list" },
      { to: "awcs", label: "AWCs", icon: "list" },
    ],
  },
  { to: "banners", label: "Banner Management", icon: "image" },
  { to: "health-concerns", label: "Health Concerns", icon: "list" },
  { to: "health-tools", label: "Health Tools", icon: "list" },
  { to: "health-recipes", label: "Health Recipes", icon: "list" },
  { to: "transformations", label: "Transformations", icon: "image" },
  { to: "faq", label: "FAQ", icon: "help" },
  { to: "notifications", label: "Notifications", icon: "bell" },
  { to: "celebration-banners", label: "Celebration Banners", icon: "image" },
  { to: "client-testimonials", label: "Client Testimonials", icon: "users" },
  { to: "video-testimonials", label: "Video Testimonials", icon: "users" },
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
