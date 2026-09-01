import { Fragment, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaApple, FaFacebookF, FaGooglePlay, FaInstagram, FaLink, FaLinkedinIn, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Mail, MessageCircle, Phone } from "lucide-react";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { fetchStaticPageBySlugSafe, footerCopyFromStaticPage } from "../api/publicMisc.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";

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
  { slug: "privacy-policy", label: "Privacy Policy", to: "/privacy-policy" },
  { slug: "terms-and-conditions", label: "Terms of Service", to: "/terms-and-conditions" },
  { slug: "community-guideline", label: "Community Guidelines", to: "/community-guideline" },
  { slug: "contact-us", label: "Contact Us", to: "/contact-us" },
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
  const [legalLinks, setLegalLinks] = useState(FOOTER_LEGAL_LINKS);
  const [cmsCopyright, setCmsCopyright] = useState("");
  const [cmsCredit, setCmsCredit] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchStaticPageBySlugSafe("footer-text"),
      ...FOOTER_LEGAL_LINKS.map((item) => fetchStaticPageBySlugSafe(item.slug)),
    ]).then(([footerPage, ...pages]) => {
      if (cancelled) return;

      const copy = footerCopyFromStaticPage(footerPage);
      setCmsCopyright(copy.copyright);
      setCmsCredit(copy.credit);

      setLegalLinks(
        FOOTER_LEGAL_LINKS.map((item, index) => {
          const page = pages[index];
          return { ...item, label: page?.title || item.label };
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const logoSrc = brandLogoUrl || defaultLogo;
  const year = new Date().getFullYear();
  const copyrightLine =
    cmsCopyright || footerCopyright || `© ${year} ${appName}. All rights reserved.`;
  const creditLine = cmsCredit || footerCredit;

  return (
    <footer className="site-footer">
      <div className="site-footer__accent" aria-hidden="true" />

      <div className="site-container">
        <div className="site-footer__grid">
          <div className="site-footer__brand d-flex gap-2">
            <Link to="/" className="site-footer__brand-head">

              <img src={logoSrc} alt={appName} className="site-footer__brand-logo" />
               </Link>
              <h3 className="site-footer__brand-name">{appName}
                <br/>
                <FooterBrandText text={footerText} />
                {/* <br/> */}
                 {social.length > 0 ? (
              <div className="site-footer__social mt-1" aria-label="Social media links">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.icon] || FaLink;

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
              </h3>
             
           

            {/* <FooterBrandText text={footerText} /> */}

            {/* {social.length > 0 ? (
              <div className="site-footer__social" aria-label="Social media links">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.icon] || FaLink;

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
            ) : null} */}
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


            {contact.phone ? (

              <div className="site-footer__contact-row ">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <MessageCircle size={16}/>
                </span>
                <a href={`https://wa.me/91${contact.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="border-bottom border-1 "><span>Chat on WhatsApp</span></a>
              </div>
            ) : null}

{contact?.email && (
  <div className="site-footer__contact-row">
    <span className="site-footer__contact-icon" aria-hidden="true">
      <Mail size={16} />
    </span>

    <a
      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="border-bottom"
    >
      {contact?.email}
    </a>
  </div>
)}
            {(contact.details || [])
              .filter((row) => !/phone|mobile|email|mail|whatsapp|tel/i.test(row.label))
              .map((row) => (
                <div key={row.id} className="site-footer__contact-row">
                  <span className="site-footer__contact-icon" aria-hidden="true">
                    <Phone size={16} />
                  </span>
                  <p>{row.label}: {row.value}</p>
                </div>
              ))}
          </div>
        </div>

        <div className="site-footer__bottom">
         

          <nav className="site-footer__bottom-links" aria-label="Legal links">
            {legalLinks.map((link, index) => (
              <Fragment key={link.to}>
                {index > 0 ? (
                  <span className="site-footer__bottom-dot" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <Link to={link.to} className="text-dark">{link.label}</Link>
              </Fragment>
            ))}
          </nav>
          <div className="site-footer__bottom-meta">
            <p className="text-dark">{copyrightLine}</p>
            {/* {creditLine ? <p className="site-footer__credit text-dark fw-semibold">{creditLine}</p> : null} */}
          </div>
        </div>
      </div>
    </footer>
  );
}
