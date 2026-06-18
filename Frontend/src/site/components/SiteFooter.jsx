import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { FOOTER_NAV_GROUPS } from "../data/siteNav.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";

const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  twitter: FaXTwitter,
  linkedin: FaLinkedinIn,
};

function FooterBrandText({ text }) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return (
      <p className="site-footer__brand-text">
        Personalized wellness coaching, community support, and programs designed for lasting health
        transformation.
      </p>
    );
  }

  return lines.map((line) => (
    <p key={line} className="site-footer__brand-text">
      {line}
    </p>
  ));
}

export function SiteFooter() {
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const { appName, footerText, contact, social } = useSiteConfig();
  const logoSrc = brandLogoUrl || defaultLogo;
  const year = new Date().getFullYear();
  const showBottomCopyright = !String(footerText || "").includes("©");

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer__grid">
          <div>
            <img className="site-footer__brand-logo" src={logoSrc} alt="" width={48} height={48} />
            <p className="site-footer__brand-name">{appName}</p>
            <FooterBrandText text={footerText} />
            {social.length > 0 ? (
              <div className="site-footer__social" aria-label="Social media">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.icon];
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                    >
                      {Icon ? <Icon size={18} /> : item.label}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {FOOTER_NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="site-footer__group-title">{group.title}</p>
              <ul className="site-footer__links">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="site-footer__group-title">Contact</p>
            <ul className="site-footer__links">
              {contact.email ? (
                <li>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              ) : null}
              {contact.phone ? (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>
                </li>
              ) : null}
              {contact.address ? <li>{contact.address}</li> : null}
            </ul>
          </div>
        </div>

        {showBottomCopyright ? (
          <div className="site-footer__bottom">
            <p>
              &copy; {year} {appName}. All rights reserved.
            </p>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
