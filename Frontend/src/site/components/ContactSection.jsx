import { IoCallOutline, IoLocationOutline, IoMailOutline } from "react-icons/io5";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { AppDownloadButtons } from "./AppDownloadButtons.jsx";
import { SiteCard } from "./SiteCard.jsx";

export function ContactSection() {
  const { contact } = useSiteConfig();

  return (
    <section id={contact.id} className="site-section site-section--contact" aria-labelledby="contact-heading">
      <div className="site-container">
        <div className="site-contact__grid">
          <div>
            <p className="site-eyebrow">{contact.eyebrow}</p>
            <h2 id="contact-heading" className="site-heading">
              {contact.title}
            </h2>
            <p className="site-subtext">{contact.description}</p>

            <div className="site-contact__info">
              {contact.email ? (
                <p className="site-contact__item site-contact__item--static">
                  <IoMailOutline size={20} aria-hidden />
                  <span>{contact.email}</span>
                </p>
              ) : null}
              {contact.phone ? (
                <a className="site-contact__item" href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                  <IoCallOutline size={20} aria-hidden />
                  <span>{contact.phone}</span>
                </a>
              ) : null}
              {contact.address ? (
                <p className="site-contact__item site-contact__item--static">
                  <IoLocationOutline size={20} aria-hidden />
                  <span>{contact.address}</span>
                </p>
              ) : null}
            </div>
          </div>

          <SiteCard className="site-contact__card site-contact__card--app">
            <h3 className="site-cta-card__title">Get the Mobile App</h3>
            <p className="site-cta-card__text">
              Download the app to book consultations, track your progress, and stay connected with your wellness
              coach.
            </p>
            <AppDownloadButtons block tone="light" />
          </SiteCard>
        </div>
      </div>
    </section>
  );
}
