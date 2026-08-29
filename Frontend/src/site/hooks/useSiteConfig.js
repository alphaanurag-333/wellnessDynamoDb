import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  selectAppConfigData,
  selectAppDisplayName,
  selectAppFooterText,
  selectConsultancyAmount,
} from "../../store/appConfigSelectors.js";
import {
  ABOUT_SECTION,
  CHALLENGE_BANNER,
  COMMUNITY_CTA,
  CONSULTATION_CTA,
  CONTACT_SECTION,
  HERO_CONTENT,
  SERVICES_SECTION,
  TESTIMONIALS_SECTION,
} from "../data/siteContent.js";
import { SITE_SECTION_PATHS } from "../data/siteSections.js";
import { buildMobileAppLinks } from "../utils/mobileAppLink.js";

function str(value) {
  return value != null ? String(value).trim() : "";
}

function pick(...values) {
  for (const value of values) {
    const s = str(value);
    if (s) return s;
  }
  return "";
}

function formatMetric(value) {
  const s = str(value);
  if (!s) return "";
  // Keep display-ready admin values (e.g. "8.5K+", "10,000+") as entered.
  if (/[kKmM+]/.test(s) || /[^\d.,]/.test(s.replace(/,/g, ""))) return s;
  const num = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(num)) return s;
  if (num >= 10000) return `${Math.round(num / 1000)}K+`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${num.toLocaleString("en-IN")}+`;
}

function formatRating(value) {
  const s = str(value);
  if (!s) return "";
  const num = Number(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return s;
  return num % 1 === 0 ? String(num) : num.toFixed(1);
}

function formatSuccessRate(value) {
  const s = str(value);
  if (!s) return "";
  if (/%\s*$/.test(s)) return s;
  const num = Number(s.replace(/[^\d.]/g, ""));
  if (Number.isFinite(num)) return `${num % 1 === 0 ? String(num) : num.toFixed(1)}%`;
  return s;
}

function formatAmount(amount) {
  const s = str(amount);
  if (!s) return "";
  const num = Number(s);
  if (!Number.isFinite(num)) return s;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook", icon: "facebook" },
  { key: "instagram", label: "Instagram", icon: "instagram" },
  { key: "youtube", label: "YouTube", icon: "youtube" },
  { key: "linkedin", label: "LinkedIn", icon: "linkedin" },
];

const STORE_FIELDS = [
  { key: "android_app_link", label: "Google Play", icon: "play" },
  { key: "ios_app_link", label: "App Store", icon: "apple" },
];

const DEFAULT_FOOTER_TAGLINE =
  "Personalized wellness coaching, community support, and programs designed for lasting health transformation.";

function parseAppFooterText(text) {
  const raw = str(text);
  if (!raw) {
    return { brandLine: "", copyright: "", credit: "" };
  }

  const segments = raw
    .split(/\|\|/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    const copyright = segments.find((part) => /©|copyright/i.test(part)) || "";
    const credit = segments.find((part) => /powered by/i.test(part)) || "";
    const brandLine = segments.find(
      (part) => part !== copyright && part !== credit && !/©|copyright|powered by/i.test(part)
    );

    return {
      brandLine: brandLine || "",
      copyright,
      credit,
    };
  }

  if (/©|copyright/i.test(raw)) {
    return { brandLine: "", copyright: raw, credit: "" };
  }

  if (/powered by/i.test(raw)) {
    return { brandLine: "", copyright: "", credit: raw };
  }

  return { brandLine: raw, copyright: "", credit: "" };
}

export function useSiteConfig() {
  const config = useSelector(selectAppConfigData);
  const appName = useSelector(selectAppDisplayName);
  const footerText = useSelector(selectAppFooterText);
  const consultancyAmount = useSelector(selectConsultancyAmount);

  return useMemo(() => {
    const liveLocations = Array.isArray(config?.web_locations)
      ? config.web_locations.filter((row) => row && row.live !== false && str(row.address))
      : [];
    const liveContactDetails = Array.isArray(config?.web_contact_details)
      ? config.web_contact_details.filter((row) => row && row.live !== false && str(row.value))
      : [];
    const detailByLabel = (matcher) =>
      liveContactDetails.find((row) => matcher.test(String(row.label || "")))?.value || "";

    const email = pick(
      detailByLabel(/email|mail/i),
      config?.app_email,
    );
    const phone = pick(
      detailByLabel(/phone|mobile|whatsapp|tel/i),
      config?.app_mobile,
    );
    const address = pick(liveLocations[0]?.address, config?.address);
    const shortDetail = pick(config?.app_detail, config?.app_details);
    const longDetail = pick(config?.app_details, config?.app_detail, ABOUT_SECTION.body);
    const amountLabel = formatAmount(consultancyAmount || config?.consultancy_amount);
    const mobileApp = buildMobileAppLinks(config);
    const appCtaLabel = amountLabel ? `Get the App — ${amountLabel}` : mobileApp.ctaLabel;

    const hero = {
      tagline: pick(config?.app_detail, HERO_CONTENT.tagline),
      headline: HERO_CONTENT.headline,
      subtext: pick(config?.app_details, config?.app_detail, HERO_CONTENT.subtext),
      ctaLabel: appCtaLabel,
      ctaHref: mobileApp.primaryUrl,
      secondaryLabel: "Explore Features",
      secondaryHref: SITE_SECTION_PATHS.services,
      visualTitle: appName,
      visualText: pick(config?.app_detail, shortDetail) || "Your personalized path to better health and lasting wellness.",
    };

    const about = {
      id: ABOUT_SECTION.id,
      eyebrow: ABOUT_SECTION.eyebrow,
      title: `Join ${appName}'s Growing Wellness Community`,
      body: longDetail || ABOUT_SECTION.body,
    };

    const contact = {
      id: CONTACT_SECTION.id,
      eyebrow: CONTACT_SECTION.eyebrow,
      title: CONTACT_SECTION.title,
      description: shortDetail || CONTACT_SECTION.description,
      email,
      phone,
      address,
      locations: liveLocations.map((row) => ({
        id: str(row.id) || str(row.name),
        name: str(row.name) || "Location",
        address: str(row.address),
      })),
      details: liveContactDetails.map((row) => ({
        id: str(row.id) || str(row.label),
        label: str(row.label),
        value: str(row.value),
      })),
    };

    const consultation = {
      title: CONSULTATION_CTA.title,
      description: amountLabel
        ? `Consultations from ${amountLabel}. Download the app to book sessions and track your wellness journey.`
        : CONSULTATION_CTA.description,
      ctaLabel: CONSULTATION_CTA.ctaLabel,
      ctaHref: mobileApp.primaryUrl,
    };

    const challenge = {
      ...CHALLENGE_BANNER,
      ctaHref: mobileApp.primaryUrl,
    };

    // Driven by Admin → Configs → Google review (`common-google-review` / App Config).
    const ratingValue = formatRating(config?.average_rating);
    const ratingNumber = Number(str(config?.average_rating).replace(/[^\d.]/g, "")) || 0;
    const reviewsValue = formatMetric(config?.google_reviews) || str(config?.google_reviews);
    const facebookFollowers =
      formatMetric(config?.facebook_followers) || str(config?.facebook_followers);

    const stats = [
      {
        key: "rating",
        value: ratingValue,
        label: "Average Rating",
        showStars: true,
        rating: ratingNumber,
      },
      {
        key: "success",
        value: formatSuccessRate(config?.success_rate),
        label: "Success Rate",
        showStars: false,
      },
      {
        key: "clients",
        value: formatMetric(config?.happy_clients),
        label: "Happy Clients",
        showStars: false,
      },
      {
        key: "improved",
        value: formatMetric(config?.improved_user),
        label: "Lives Improved",
        showStars: false,
      },
    ].filter((card) => card.value);

    // Wellnesspedia lower CTA — same rating on both cards; reviews vs followers in meta.
    const socialProof = [];
    if (ratingValue || reviewsValue) {
      const reviewsMeta = reviewsValue
        ? (/review/i.test(reviewsValue) ? reviewsValue : `${reviewsValue} Reviews`)
        : "Google Reviews";
      socialProof.push({
        key: "google",
        platform: "google",
        score: ratingValue || reviewsValue,
        rating: ratingValue ? ratingNumber : 0,
        showStars: Boolean(ratingValue),
        meta: reviewsMeta,
        href: "",
      });
    }
    if (ratingValue || facebookFollowers) {
      const followersMeta = facebookFollowers
        ? (/follow/i.test(facebookFollowers) ? facebookFollowers : `${facebookFollowers} Followers`)
        : "Followers";
      socialProof.push({
        key: "facebook",
        platform: "facebook",
        score: ratingValue || facebookFollowers,
        rating: ratingValue ? ratingNumber : 0,
        showStars: Boolean(ratingValue),
        meta: followersMeta,
        href: str(config?.facebook),
      });
    }

    const social = [
      ...SOCIAL_FIELDS.map(({ key, label, icon }) => ({
        key,
        label,
        icon,
        href: str(key === "youtube" ? (config?.youtube ?? config?.twitter) : config?.[key]),
      })),
      ...STORE_FIELDS.map(({ key, label, icon }) => ({
        key,
        label,
        icon,
        href: str(config?.[key]),
      })),
    ].filter((item) => item.href);

    const footerMeta = parseAppFooterText(footerText);
    const footerBrandText =
      pick(footerMeta.brandLine, config?.app_detail, config?.app_details) || DEFAULT_FOOTER_TAGLINE;

    return {
      appName,
      footerText: footerBrandText,
      footerCopyright: footerMeta.copyright,
      footerCredit: footerMeta.credit,
      mobileApp,
      hero,
      about,
      services: SERVICES_SECTION,
      challenge,
      consultation,
      // community: {
      //   ...COMMUNITY_CTA,
      //   ctaHref: mobileApp.primaryUrl,
      //   ctaLabel: "Join in the App",
      //   description: `Be part of the ${appName} community — programs, recipes, and coach support in one place.`,
      // },
      contact,
      testimonials: TESTIMONIALS_SECTION,
      stats,
      socialProof,
      social,
      consultancyAmount: amountLabel,
    };
  }, [appName, config, consultancyAmount, footerText]);
}
