import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";

const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  twitter: FaXTwitter,
  linkedin: FaLinkedinIn,
};

const FOOTER_QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about-us" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Service", to: "/terms-and-conditions" },
  { label: "Community Guidelines", to: "/community-guideline" },
  { label: "Contact Us", to: "/contact-us" },
];

const FOOTER_LEGAL_LINKS = FOOTER_QUICK_LINKS.filter((link) => link.to !== "/" && link.to !== "/about-us");

function FooterBrandText({ text }) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => (
    <p key={line} className="site-footer__brand-text">
      {line}
    </p>
  ));
}

export function SiteFooter() {
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const { appName, footerText, footerCopyright, footerCredit, contact, social } = useSiteConfig();

  const logoSrc = brandLogoUrl || defaultLogo;
  const year = new Date().getFullYear();
  const copyrightLine = footerCopyright || `© ${year} ${appName}. All rights reserved.`;

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <div className="site-footer__brand-head">
              <img src={logoSrc} alt={appName} className="site-footer__brand-logo" />
              <h3 className="site-footer__brand-name">{appName}</h3>
            </div>

            <FooterBrandText text={footerText} />

            {social.length > 0 && (
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
                      {Icon && <Icon aria-hidden="true" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="site-footer__links-wrap">
            <h4>Quick Links</h4>
            <ul>
              {FOOTER_QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__contact">
            <h4>Contact Us</h4>

            {contact.address && (
              <div className="site-footer__contact-item">
                <p>{contact.address}</p>
              </div>
            )}

            {contact.phone && (
              <div className="site-footer__contact-item">
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </div>
            )}

            {contact.email && (
              <div className="site-footer__contact-item">
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            )}
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__bottom-meta">
            <p>{copyrightLine}</p>
            {footerCredit && <p className="site-footer__credit">{footerCredit}</p>}
          </div>

          <div className="site-footer__bottom-links">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
