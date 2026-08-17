import { SITE_SECTION_PATHS } from "./siteSections.js";

/** Primary navigation for the public site. */

export const SITE_NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: SITE_SECTION_PATHS.about },
  { label: "Services", to: SITE_SECTION_PATHS.services },
  { label: "Testimonials", to: SITE_SECTION_PATHS.testimonials },
  { label: "Contact", to: SITE_SECTION_PATHS.contact },
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
];

export const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
  { label: "WhatsApp", href: "https://wa.me", icon: "whatsapp" },
];
