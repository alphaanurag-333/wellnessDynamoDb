import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaApple,
  FaFacebookF,
  FaGooglePlay,
  FaInstagram,
  FaLink,
  FaLinkedinIn,
  FaPinterest,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Mail, Phone } from "lucide-react";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { fetchStaticPageBySlugSafe, footerCopyFromStaticPage } from "../api/publicMisc.js";
import { HEALTH_SOLUTION_LINKS } from "../data/siteNav.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";

const BRAND_NAME = "India Redefining Wellness";

const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  linkedin: FaLinkedinIn,
  x: FaXTwitter,
  pinterest: FaPinterest,
  play: FaGooglePlay,
  apple: FaApple,
  link: FaLink,
};

const FOOTER_PROGRAM_LINKS = HEALTH_SOLUTION_LINKS;

const FOOTER_EXPLORE_LINKS = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about-us" },
  { label: "Success Stories", to: "/success-stories" },
  { label: "Wellnesspedia", to: "/wellnesspedia" },
  { label: "Contact Us", to: "/contact-us" },
];

/** Order matches SEO footer recommendation. */
const FOOTER_LEGAL_LINKS = [
  { slug: "privacy-policy", label: "Privacy Policy", to: "/privacy-policy" },
  { slug: "terms-and-conditions", label: "Terms and Conditions", to: "/terms-and-conditions", keepLabel: true },
  { slug: "medical-disclaimer", label: "Medical Disclaimer", to: "/medical-disclaimer" },
  { slug: "community-guideline", label: "Community Guidelines", to: "/community-guideline" },
];

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function toWhatsAppHref(phone) {
  const digits = digitsOnly(phone);
  if (!digits) return "";
  const withCountry =
    digits.startsWith("91") && digits.length >= 12
      ? digits
      : digits.length === 10
        ? `91${digits}`
        : digits;
  return `https://wa.me/${withCountry}`;
}

function toMailHref(email) {
  const address = String(email || "").trim();
  return address ? `mailto:${address}` : "";
}

function socialAriaLabel(networkLabel) {
  const network = String(networkLabel || "social media").trim() || "social media";
  return `${BRAND_NAME} on ${network}`;
}

function resolveCopyright(preferred, year) {
  const raw = String(preferred || "").trim();
  if (!raw) {
    return `© ${year} ${BRAND_NAME}. All rights reserved.`;
  }
  if (/IR\s*Wellness/i.test(raw) && !/India Redefining Wellness/i.test(raw)) {
    const expanded = raw.replace(/IR\s*Wellness/gi, BRAND_NAME);
    if (/all rights reserved/i.test(expanded)) return expanded;
    return `${expanded.replace(/\.\s*$/, "")}. All rights reserved.`;
  }
  return raw;
}

function FooterBrandText({ text }) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className="site-footer__brand-copy">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function FooterLinkList({ links }) {
  return (
    <ul className="site-footer__link-list">
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className="site-footer__nav-link">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const { footerText, footerCopyright, footerCredit, contact, social } = useSiteConfig();
  const [legalLinks, setLegalLinks] = useState(FOOTER_LEGAL_LINKS);
  const [cmsCopyright, setCmsCopyright] = useState("");
  const [cmsCredit, setCmsCredit] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchStaticPageBySlugSafe("footer-text"),
      ...FOOTER_LEGAL_LINKS.map((item) =>
        item.slug ? fetchStaticPageBySlugSafe(item.slug) : Promise.resolve(null),
      ),
    ]).then(([footerPage, ...pages]) => {
      if (cancelled) return;

      const copy = footerCopyFromStaticPage(footerPage);
      setCmsCopyright(copy.copyright);
      setCmsCredit(copy.credit);

      setLegalLinks(
        FOOTER_LEGAL_LINKS.map((item, index) => {
          const page = pages[index];
          return {
            ...item,
            label: item.keepLabel ? item.label : page?.title || item.label,
          };
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const logoSrc = brandLogoUrl || defaultLogo;
  const year = new Date().getFullYear();
  const copyrightLine = resolveCopyright(footerCopyright || cmsCopyright, year);
  const creditLine = footerCredit || cmsCredit;
  const whatsappHref = toWhatsAppHref(contact.phone);
  //const mailHref = toMailHref(contact.email);
const mailHref = contact?.email
  ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}`
  : "";
  return (
    <footer className="site-footer">
      <div className="site-footer__accent" aria-hidden="true" />

      <div className="site-container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link
              to="/"
              className="site-footer__brand-head"
              aria-label={`${BRAND_NAME} — Home`}
            >
              <img
                src={logoSrc}
                alt=""
                className="site-footer__brand-logo"
              />
              <span className="site-footer__brand-name">{BRAND_NAME}</span>
            </Link>

            <FooterBrandText text={footerText} />

            {social.length > 0 ? (
              <div className="site-footer__social" aria-label="Social media links">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.icon] || FaLink;
                  const label = socialAriaLabel(item.label);

                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                    >
                      {Icon ? <Icon aria-hidden="true" /> : null}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <nav className="site-footer__column" aria-label="Wellness programs">
            <p className="site-footer__heading">Programs</p>
            <FooterLinkList links={FOOTER_PROGRAM_LINKS} />
          </nav>

          <nav className="site-footer__column" aria-label="Explore pages">
            <p className="site-footer__heading">Explore</p>
            <FooterLinkList links={FOOTER_EXPLORE_LINKS} />
          </nav>

          <div className="site-footer__column site-footer__contact">
            <p className="site-footer__heading">Contact Us</p>

            {/* {whatsappHref ? (
              <div className="site-footer__contact-row">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <FaWhatsapp size={16} />
                </span>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chat on Whatsapp
                </a>
              </div>
            ) : null} */}
            {whatsappHref ? (
  <div className="site-footer__contact-row">
    <span className="site-footer__contact-icon" aria-hidden="true">
  <FaWhatsapp size={18} color="#25D366" />
</span>

    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      Chat on WhatsApp
    </a>
  </div>
) : null}

            {mailHref ? (
              <div className="site-footer__contact-row">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <a  target="_blank" href={mailHref}>{contact.email}</a>
              </div>
            ) : null}

            {(contact.details || [])
              .filter((row) => !/phone|mobile|email|mail|whatsapp|tel/i.test(row.label))
              .map((row) => (
                <div key={row.id} className="site-footer__contact-row">
                  <span className="site-footer__contact-icon" aria-hidden="true">
                    <Phone size={16} />
                  </span>
                  <p>
                    {row.label}: {row.value}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="site-footer__bottom">
          <nav className="site-footer__bottom-links" aria-label="Legal links">
            {legalLinks.map((link, index) => (
              <Fragment key={link.to}>
                {index > 0 ? (
                  <span className="site-footer__bottom-sep" aria-hidden="true">
                    |
                  </span>
                ) : null}
                <Link to={link.to}>{link.label}</Link>
              </Fragment>
            ))}
          </nav>

          <div className="site-footer__bottom-meta">
            <p>{copyrightLine}</p>
            {creditLine ? (
              <p className="site-footer__credit">{creditLine}</p>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
