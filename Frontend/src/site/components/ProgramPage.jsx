import { Link } from "react-router-dom";
import FinalCTA from "./FinalCTA";
import { CONSULTATION_WHATSAPP } from "../data/programPages";

function openConsultation(e) {
  e.preventDefault();
  window.open(CONSULTATION_WHATSAPP, "_blank", "noopener,noreferrer");
}

export default function ProgramPage({
  title,
  eyebrow = "India Redefining Wellness",
  description,
  image,
  imageAlt,
  paragraphs = [],
  aboutMode = "split",
  conditions = [],
  children,
  showFinalCta = true,
}) {
  const heroStyle = image
    ? { "--program-hero-image": `url(${image})` }
    : undefined;

  return (
    <article className="program-page">
      <section className="program-hero" style={heroStyle}>
        <div className="program-hero__overlay" aria-hidden="true" />
        <div className="site-container">
          <div className="program-hero__content">
            <span className="program-hero__eyebrow">{eyebrow}</span>
            <h1 className="program-hero__title">{title}</h1>
            {description ? (
              <p className="program-hero__description">{description}</p>
            ) : null}
            <Link
              to="#"
              className="program-hero__cta"
              onClick={openConsultation}
            >
              Book a consultation
            </Link>
          </div>
        </div>
      </section>

      <section
        className={`pt-3 pb-3 program-about${aboutMode === "gut" ? " program-about--gut" : ""}`}
      >
        <div className="site-container">
          {aboutMode === "gut" ? (
            <div className="program-about__gut">
              <div className="program-about__intro">
                <h2 className="program-about__heading text-center">Understanding Gut Health</h2>
                {paragraphs.map((text) => (
                  <p className="text-center" key={text.slice(0, 48)}>{text}</p>
                ))}
              </div>

              {conditions.length > 0 ? (
                <div className="program-conditions">
                  {conditions.map((item) => (
                    <article key={item.title} className="program-condition-card">
                      <h3 className="program-condition-card__title">
                        {item.title}
                      </h3>
                      <p className="program-condition-card__body">{item.body}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="program-about__wrapper">
              {image ? (
                <div className="program-about__media">
                  <img src={image} alt={imageAlt || title} />
                </div>
              ) : null}
              <div className="program-about__content">
                <h2 className="program-about__heading mb-0">About the program</h2>
                {paragraphs.map((text) => (
                  <p key={text.slice(0, 48)}>{text}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {children}

      {showFinalCta ? <FinalCTA /> : null}
    </article>
  );
}
