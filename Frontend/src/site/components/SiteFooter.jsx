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
        Personalized wellness coaching, community support, and programs designed
        for lasting health transformation.
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

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer__top">
          {/* Brand */}
          <div className="site-footer__brand">
            <img
              src={logoSrc}
              alt={appName}
              className="site-footer__brand-logo"
            />

            <h3 className="site-footer__brand-name">{appName}</h3>

            <FooterBrandText text={footerText} />

            {social.length > 0 && (
              <div className="site-footer__social">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.icon];

                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {Icon && <Icon />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="site-footer__links-wrap">
            <h4>QUICK LINKS</h4>

            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/about">About Us</Link>
              </li>
              <li>
                <Link to="/solutions">Health Solutions</Link>
              </li>
              <li>
                <Link to="/stories">Success Stories</Link>
              </li>
              <li>
                <Link to="/resources">Clinical Resources</Link>
              </li>
              <li>
                <Link to="/contact">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="site-footer__contact">
            <h4>CONTACT US</h4>

            <div className="site-footer__contact-item">
              <p>{contact.address}</p>
            </div>

            <div className="site-footer__contact-item">
              <a href={`tel:${contact.phone}`}>{contact.phone}</a>
            </div>

            <div className="site-footer__contact-item">
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="site-footer__newsletter">
            <h4>STAY INFORMED</h4>

            <p>
              Join our mailing list for latest medical research updates and
              wellness tips.
            </p>

            <input type="email" placeholder="Email Address" />

            <button type="button">Subscribe Now</button>
          </div>
        </div>

        {/* Bottom */}

        <div className="site-footer__bottom">
          <p>
            © {year} {appName}. All rights reserved.
          </p>

          <div className="site-footer__bottom-links">
            <Link to="/privacy-policy">Privacy Policy</Link>

            <Link to="/terms">Terms of Service</Link>

            <Link to="/cookies">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
