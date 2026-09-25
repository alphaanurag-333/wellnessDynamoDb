/**
 * Static marketing copy and section config for the public site.
 * Edit this file to update headlines and CTAs without touching components.
 */

export const HERO_CONTENT = {
  headline: "A Personalized Path to Better Health!",
  subtext:
    "One-on-one wellness consultations, expert coaching, and a supportive community to help you heal, thrive, and stay consistent on your journey.",
  ctaLabel: "Download the App",
  tagline: "Inspiring Wellness, One Step at a Time",
};

export const ABOUT_SECTION = {
  id: "about",
  eyebrow: "About Us",
  title: "Join India's Growing Wellness Community",
  body:
    "India has been a hub of healing and wellness since Vedic times. We bring that richness into modern, accessible programs — combining nutrition, movement, mindset, and community support so you can transform sustainably.",
};

export const SERVICES_SECTION = {
  id: "services",
  // eyebrow: "What We Offer",
  title: "Holistic Wellness Programs for Sustainable Results",
  items: [
    {
      icon: "consult",
      title: "1:1 Wellness Coaching",
      description:
        "Work closely with an IRW Wellness Coach for personalised guidance, regular reviews and consistent support aligned with your health and wellness goals.",
    },
    {
      icon: "challenge",
      title: "Health & Lifestyle Assessment",
      description:
        "Understand the factors influencing your wellbeing through a structured review of your health history, nutrition, lifestyle, activity, sleep, stress and available health reports.",
    },
    {
      icon: "recipe",
      title: "Daily Tracking & Progress",
      description:
        "Track meals, water intake, activity, body measurements and wellness progress through the IRW platform to stay aware, accountable and consistent.",
    },
    {
      icon: "community",
      title: "Community Support",
      description:
        "Stay motivated through a supportive wellness community where shared experiences, expert guidance, encouragement and accountability help you stay on track.",
    },
  ],
};

export const CHALLENGE_BANNER = {
  title: "21-Day Metabolic Challenge",
  description:
    "A guided reset for metabolism, energy, and daily habits — with coaching support every step of the way.",
  ctaLabel: "Join on the App",
};

export const CONSULTATION_CTA = {
  title: "Ready for Your Consultation?",
  description: "Book consultations, track progress, and connect with coaches — all in our mobile app.",
  ctaLabel: "Open Mobile App",
};

export const COMMUNITY_CTA = {
  title: "IRW Community",
  description: "Connect with like-minded members for tips, motivation, and daily wellness inspiration.",
  ctaLabel: "Join in the App",
  ctaHref: "https://wa.me",
};

export const CONTACT_SECTION = {
  id: "contact",
  eyebrow: "Get in Touch",
  title: "Start Your Wellness Journey Today",
  description: "Download our mobile app to book consultations, join programs, and stay connected with your coach.",
};

export const TESTIMONIALS_SECTION = {
  id: "testimonials",
  title: "Client Reviews",
  subtitle: "Real people, real healing — stories from our community.",
  viewMoreLabel: "View More",
};

/**
 * Mobile app labels + seed/dummy store URLs used only when Admin App Config
 * (Configs → Social links) has no genuine Google Play / App Store / QR link yet.
 */
export const MOBILE_APP = {
  ctaLabel: "Download the App",
  headerLabel: "Get the App",
  /** Dummy seed — replace via Admin → Social links */
  androidUrl: "https://play.google.com/store/apps/details?id=com.example.irwellness",
  iosUrl: "https://apps.apple.com/app/id0000000000",
  /** Defaults — override via Admin → Social links → Google Play / App Store QR */
  playQrUrl: "https://play.google.com/store/apps/details?id=com.example.irwellness",
  iosQrUrl: "https://apps.apple.com/app/id0000000000",
  qrUrl: "https://apps.apple.com/app/id0000000000",
};
