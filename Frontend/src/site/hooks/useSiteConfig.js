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
  const num = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(num)) return s;
  if (num >= 10000) return `${Math.round(num / 1000)}K+`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${num.toLocaleString("en-IN")}+`;
}

function formatRating(value) {
  const num = Number(str(value));
  if (!Number.isFinite(num)) return "";
  return num % 1 === 0 ? String(num) : num.toFixed(1);
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
    const email = pick(config?.app_email, CONTACT_SECTION.email);
    const phone = pick(config?.app_mobile, CONTACT_SECTION.phone);
    const address = pick(config?.address);
    const shortDetail = pick(config?.app_detail, config?.app_details);
    const longDetail = pick(config?.app_details, config?.app_detail, ABOUT_SECTION.body);
    const amountLabel = formatAmount(consultancyAmount || config?.consultancy_amount);
    const mobileApp = buildMobileAppLinks(config, appName);
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

    const stats = [
      {
        key: "rating",
        value: formatRating(config?.average_rating),
        label: "Average Rating",
        showStars: true,
        rating: Number(config?.average_rating) || 0,
      },
      {
        key: "success",
        value: config?.success_rate ? `${str(config.success_rate)}%` : "",
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

    const social = SOCIAL_FIELDS.map(({ key, label, icon }) => ({
      key,
      label,
      icon,
      href: str(key === "youtube" ? (config?.youtube ?? config?.twitter) : config?.[key]),
    })).filter((item) => item.href);

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
      community: {
        ...COMMUNITY_CTA,
        ctaHref: mobileApp.primaryUrl,
        ctaLabel: "Join in the App",
        description: `Be part of the ${appName} community — programs, recipes, and coach support in one place.`,
      },
      contact,
      testimonials: TESTIMONIALS_SECTION,
      stats,
      social,
      consultancyAmount: amountLabel,
    };
  }, [appName, config, consultancyAmount, footerText]);
}
