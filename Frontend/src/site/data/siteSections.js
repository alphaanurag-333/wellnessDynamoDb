/** Path-based section routes (no hash URLs). */

export const SITE_SECTION_PATHS = {
  about: "/about",
  services: "/services",
  testimonials: "/testimonials",
  contact: "/contact",
};

export const PATH_TO_SECTION_ID = Object.fromEntries(
  Object.entries(SITE_SECTION_PATHS).map(([id, path]) => [path, id])
);

export const SITE_SECTION_ROUTE_PATHS = Object.values(SITE_SECTION_PATHS).map((path) =>
  path.replace(/^\//, "")
);
