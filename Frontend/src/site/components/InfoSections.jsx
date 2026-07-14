import { IoFitnessOutline, IoPeopleOutline, IoRestaurantOutline, IoVideocamOutline } from "react-icons/io5";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteCard } from "./SiteCard.jsx";

const SERVICE_ICONS = {
  consult: IoVideocamOutline,
  challenge: IoFitnessOutline,
  recipe: IoRestaurantOutline,
  community: IoPeopleOutline,
};

export function AboutSection() {
  const { about } = useSiteConfig();

  return (
    <section id={about.id} className="site-section site-section--about" aria-labelledby="about-heading">
      <div className="site-container">
        <div className="site-section__header site-section__header--centered">
          <p className="site-eyebrow">{about.eyebrow}</p>
          <h2 id="about-heading" className="site-heading site-heading--center">
            {about.title}
          </h2>
          <p className="site-subtext site-subtext--center">{about.body}</p>
        </div>
      </div>
    </section>
  );
}

export function ServicesSection() {
  const { services } = useSiteConfig();

  return (
    <section id={services.id} className="site-section site-section--muted" aria-labelledby="services-heading">
      <div className="site-container">
        <div className="site-section__header site-section__header--centered">
          <p className="site-eyebrow">{services.eyebrow}</p>
          <h2 id="services-heading" className="site-heading site-heading--center">
            {services.title}
          </h2>
        </div>

        <div className="site-services__grid">
          {services.items.map((item, index) => {
            const Icon = SERVICE_ICONS[item.icon] || IoPeopleOutline;
            return (
              <SiteCard key={item.title} className="site-service-card site-service-card--hover">
                {/* <span className="site-service-card__index" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span> */}
                <div className="site-service-card__icon" aria-hidden>
                  <Icon />
                </div>
                <h3 className="site-service-card__title">{item.title}</h3>
                <p className="site-service-card__text">{item.description}</p>
              </SiteCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
