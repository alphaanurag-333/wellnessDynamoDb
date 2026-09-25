import { useEffect } from "react";

const SITE_ORIGIN = "https://irwellness.in";

function ensureMetaByName(name) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return el;
}

function ensureMetaByProperty(property) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonicalLink() {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  return el;
}

function toAbsoluteCanonical(path) {
  if (!path || path === "/") return `${SITE_ORIGIN}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

/**
 * Sets document title, meta description, and canonical URL for the current route.
 * Call from page components so SPA navigation keeps SEO tags accurate.
 */
export function usePageSeo({ title, description, path = "/" } = {}) {
  useEffect(() => {
    if (title) {
      document.title = title;
      ensureMetaByProperty("og:title").setAttribute("content", title);
      ensureMetaByName("twitter:title").setAttribute("content", title);
    }

    if (description) {
      ensureMetaByName("description").setAttribute("content", description);
      ensureMetaByProperty("og:description").setAttribute("content", description);
      ensureMetaByName("twitter:description").setAttribute("content", description);
    }

    const canonicalHref = toAbsoluteCanonical(path);
    ensureCanonicalLink().setAttribute("href", canonicalHref);
    ensureMetaByProperty("og:url").setAttribute("content", canonicalHref);
  }, [title, description, path]);
}

export const HOME_SEO = {
  title: "Personalised Wellness & Functional Nutrition | IRW",
  description:
    "India Redefining Wellness (IRW) offers personalised wellness, functional nutrition and 1:1 guidance for weight, diabetes, thyroid, PMOS and gut health.",
  path: "/",
};

export { SITE_ORIGIN };
