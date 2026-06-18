import { SITE_SECTION_PATHS } from "./siteSections.js";

/** Primary navigation and portal login links for the public site. */

export const SITE_NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: SITE_SECTION_PATHS.about },
  { label: "Services", to: SITE_SECTION_PATHS.services },
  { label: "Testimonials", to: SITE_SECTION_PATHS.testimonials },
  { label: "Contact", to: SITE_SECTION_PATHS.contact },
];

export const LOGIN_PORTAL_LINKS = [
  { label: "Admin Login", to: "/admin/login" },
  { label: "Coach Login", to: "/coach/login" },
  { label: "Assistant Coach Login", to: "/assistant/login" },
];

export const FOOTER_NAV_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "Home", to: "/" },
      { label: "About", to: SITE_SECTION_PATHS.about },
      { label: "Services", to: SITE_SECTION_PATHS.services },
      { label: "Testimonials", to: SITE_SECTION_PATHS.testimonials },
    ],
  },
  {
    title: "Portals",
    links: [
      { label: "Admin", to: "/admin/login" },
      { label: "Coach", to: "/coach/login" },
      { label: "Assistant Coach", to: "/assistant/login" },
    ],
  },
];

export const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
  { label: "WhatsApp", href: "https://wa.me", icon: "whatsapp" },
];
