import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BookConsultationButton } from "./AppDownloadModalContext.jsx";
import discoveryImg from "../images/discovery.png";
import analysisImg from "../images/analysis.png";
import programImg from "../images/program.png";

const methodologyData = [
  {
    id: 1,
    image: discoveryImg,
    title: "1:1 Discovery Call",
    headTitle: "Understanding You First",
    description:
      "Your wellness journey begins with a personalised 1:1 conversation. Your Wellness Coach takes time to understand your health history, current lifestyle, nutrition, daily routine, challenges and wellness goals—creating the foundation for guidance that is truly relevant to you.",
    learnMoreLabel: "Learn About Discovery Call",
  },
  {
    id: 2,
    image: analysisImg,
    title: "Root Cause & Lifestyle Assessment",
    headTitle: "Looking Beyond the Symptoms",
    description:
      "We look beyond isolated symptoms to understand the factors that may be influencing your wellbeing. Your health history, nutrition, lifestyle, metabolic health, activity, sleep, stress and available health reports are considered together to identify patterns and areas that may benefit from focused lifestyle support.",
    learnMoreLabel: "Learn About Our Assessment",
  },
  {
    id: 3,
    image: programImg,
    title: "Personalised Program",
    headTitle: "Designed Around You",
    description:
      "Because every individual has different health needs, routines and challenges, your IRW program is personalised around you. Nutrition, movement, sleep, stress management and sustainable lifestyle strategies are combined with dedicated 1:1 coaching, regular reviews and ongoing support to help you work towards your wellness goals.",
    learnMoreLabel: "Learn About Personalised Programs",
  },
];

function MethodologyCard({ item, expanded, onToggle }) {
  const descRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return undefined;

    const measure = () => {
      if (expanded) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [item.description, expanded]);

  const showToggle = overflows || expanded;

  return (
    <article className={`methodology-card${expanded ? " methodology-card--expanded" : ""}`}>
      <div className="methodology-card__image">
        <img src={item.image} alt={item.title} />
      </div>

      <div className="methodology-card__content">
        <h3>{item.title}</h3>
        <p className="methodology-card__subtitle">{item.headTitle}</p>
        <p
          ref={descRef}
          className={`methodology-card__desc${expanded ? " methodology-card__desc--expanded" : ""}`}
        >
          {item.description}
        </p>

        {showToggle ? (
          <button
            type="button"
            className="methodology-card__more"
            onClick={() => onToggle(item.id)}
            aria-expanded={expanded}
          >
            {expanded ? "Show Less" : item.learnMoreLabel}
            {expanded ? (
              <ArrowUpRight size={14} aria-hidden />
            ) : (
              <ArrowRight size={14} aria-hidden />
            )}
          </button>
        ) : (
          <span
            className="methodology-card__more methodology-card__more--spacer"
            aria-hidden
          >
            {item.learnMoreLabel}
          </span>
        )}

        <BookConsultationButton className="methodology-card__cta">
          Book Your Discovery Call
        </BookConsultationButton>
      </div>
    </article>
  );
}

export default function Methodology() {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="methodology">
      <div className="site-container">
        <div className="methodology__header">
          <h2>Our Wellness Roadmap</h2>
          <p>
          Our personalised wellness approach connects nutrition,lifestyle, metabolic health and overall wellbeing—combining 1:1 consultation, detailed health and
lifestyle assessment, and personalised guidance to create a sustainable path towards better
health
          </p>
        </div>

        <div className="methodology__cards">
          {methodologyData.map((item) => (
            <MethodologyCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={toggleExpanded}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
