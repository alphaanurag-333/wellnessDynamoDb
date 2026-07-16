import { Fragment } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube } from "react-icons/fa";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";

const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  linkedin: FaLinkedinIn,
};

const FOOTER_PROGRAM_LINKS = [
  { label: "Fat Loss", to: "/fat-loss" },
  { label: "Diabetes Reversal", to: "/diabetes-reversal" },
  { label: "PCOD / PCOS Reversal", to: "/pcod-pcos-reversal" },
  { label: "Thyroid Care", to: "/thyroid" },
  { label: "Gut Health", to: "/gut-health" },
];

const FOOTER_EXPLORE_LINKS = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about-us" },
  { label: "Success Stories", to: "/success-stories" },
  { label: "Wellnesspedia", to: "/wellnesspedia" },
  { label: "Contact Us", to: "/contact-us" },
];

const FOOTER_LEGAL_LINKS = [
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Service", to: "/terms-and-conditions" },
  { label: "Community Guidelines", to: "/community-guideline" },
  { label: "Contact Us", to: "/contact-us" },
];

function footerNavClass({ isActive }) {
  return isActive ? "site-footer__nav-link is-active" : "site-footer__nav-link";
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
          <NavLink to={link.to} className={footerNavClass} end={link.to === "/"}>
            {link.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const { appName, footerText, footerCopyright, footerCredit, contact, social } = useSiteConfig();

  const logoSrc = brandLogoUrl || defaultLogo;
  const year = new Date().getFullYear();
  const copyrightLine = footerCopyright || `© ${year} ${appName}. All rights reserved.`;

  return (
    <footer className="site-footer">
      <div className="site-footer__accent" aria-hidden="true" />

      <div className="site-container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__brand-head">
              <img src={logoSrc} alt={appName} className="site-footer__brand-logo" />
              <h3 className="site-footer__brand-name">{appName}
                <br/>
                <FooterBrandText text={footerText} />
              </h3>
             
            </Link>

            {/* <FooterBrandText text={footerText} /> */}

            {social.length > 0 ? (
              <div className="site-footer__social" aria-label="Social media links">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.icon];

                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      title={item.label}
                    >
                      {Icon ? <Icon aria-hidden="true" /> : null}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <nav className="site-footer__column" aria-label="Wellness programs">
            <h4 className="site-footer__heading">Programs</h4>
            <FooterLinkList links={FOOTER_PROGRAM_LINKS} />
          </nav>

          <nav className="site-footer__column" aria-label="Explore pages">
            <h4 className="site-footer__heading">Explore</h4>
            <FooterLinkList links={FOOTER_EXPLORE_LINKS} />
          </nav>

          <div className="site-footer__column site-footer__contact">
            <h4 className="site-footer__heading">Contact Us</h4>

            {contact.address ? (
              <div className="site-footer__contact-row">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <MapPin size={16} />
                </span>
                <p>{contact.address}</p>
              </div>
            ) : null}

            {contact.phone ? (
//               <div className="site-footer__contact-row">
//   <a
//     href={`https://wa.me/91${contact.phone.replace(/\D/g, "")}`}
//     target="_blank"
//     rel="noopener noreferrer"
//     className="whatsapp-btn pt-2"
//   >
//     <MessageCircle size={18} />
//     <span>Chat on WhatsApp</span>
//   </a>
// </div>
              <div className="site-footer__contact-row ">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <MessageCircle size={16}/>
                </span>
                <a href={`https://wa.me/91${contact.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="border-bottom border-1 "><span>Chat on WhatsApp</span></a>
              </div>
            ) : null}

            {contact.email ? (
              <div className="site-footer__contact-row">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <a href={`mailto:${contact.email}`} className="border-bottom">{contact.email}</a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__bottom-meta">
            <p>{copyrightLine}</p>
            {footerCredit ? <p className="site-footer__credit">{footerCredit}</p> : null}
          </div>

          <nav className="site-footer__bottom-links" aria-label="Legal links">
            {FOOTER_LEGAL_LINKS.map((link, index) => (
              <Fragment key={link.to}>
                {index > 0 ? (
                  <span className="site-footer__bottom-dot" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <Link to={link.to}>{link.label}</Link>
              </Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
