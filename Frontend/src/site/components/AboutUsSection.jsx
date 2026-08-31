import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  fetchCofounderMessage,
  fetchFaqs,
  fetchLeadershipNotes,
  fetchWellnessTeamNotes,
  fetchStaticPageBySlugSafe,
  pillarCopyFromStaticPage,
  heroCopyFromStaticPage,
} from "../api/publicMisc.js";

import clinicImage from "../images/about-hero.png";
import oilImage from "../images/Exercise.jpg";
import CardOne from "../images/about-card-one.png";
import CardTwo from "../images/about-card-two.png";
import CardThree from "../images/about-card-three.png";
import img1 from "../images/about-faq-1.png";
import img2 from "../images/about-faq-2.png";
import img3 from "../images/about-faq-3.png";
import img4 from "../images/about-faq-4.png";

import {
  Flame,
  Activity,
  HeartPulse,
  ShieldPlus,
  Heart,
  Dumbbell,
  Target,
  Eye,
  Sparkles,
  Gauge,
  Tags,
  CreditCard,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import Methodology from "./Methodology.jsx";
import { LeadershipMessageSection, LeadershipNotesSlider } from "./LeadershipMessageSection.jsx";
import FinalCTA from "./FinalCTA.jsx";

function highlightWellnessTitle(title) {
  const text = String(title || "");
  const match = text.match(/wellness/i);
  if (!match || match.index == null) return text;
  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {text.slice(0, start)}
      <span>{text.slice(start, end)}</span>
      {text.slice(end)}
    </>
  );
}

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function PillarDescription({ headTitle, html, text }) {
  const [expanded, setExpanded] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const headingRef = useRef(null);
  const clampRef = useRef(null);
  const source = html && looksLikeHtml(html) ? html : "";

  const measure = useCallback(() => {
    if (expanded) return;
    const heading = headingRef.current;
    const body = clampRef.current;
    const headingOverflows = heading ? heading.scrollWidth > heading.clientWidth + 1 : false;
    const bodyOverflows = body ? body.scrollHeight > body.clientHeight + 1 : false;
    setCanToggle(headingOverflows || bodyOverflows);
  }, [expanded, source, text, headTitle]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const nodes = [headingRef.current, clampRef.current].filter(Boolean);
    if (!nodes.length || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [measure]);

  return (
    <>
      {headTitle ? (
        <h5
          ref={headingRef}
          className={`pillar-card__head-title${expanded ? " is-expanded" : " is-clamped"}`}
        >
          {headTitle}
        </h5>
      ) : null}
      {source ? (
        <div
          ref={clampRef}
          className={`pillar-card__description mb-0 static-page-content${expanded ? "" : " is-clamped"}`}
          dangerouslySetInnerHTML={{ __html: source }}
        />
      ) : (
        <p
          ref={clampRef}
          className={`pillar-card__description mb-0${expanded ? "" : " is-clamped"}`}
        >
          {text}
        </p>
      )}
      {canToggle ? (
        <button
          type="button"
          className="pillar-card__more"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Read Less" : "Read More"}
          {expanded ? <ArrowUpRight size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
        </button>
      ) : null}
    </>
  );
}

const PROCESS_FAQ_ICONS = [Gauge, Tags, CreditCard, HeartPulse];

const PROCESS_FAQS = [
  {
    id: 1,
    question: "Our approach includes the following.",
    answer:
      "Our healing process starts with understanding your health history, lifestyle, nutrition, sleep, stress levels and long-term wellness goals. Every recommendation is personalized to your body and lifestyle.",
    Icon: Gauge,
  },
  {
    id: 2,
    question: "Delve deep into health history, current lifestyle and aspired health goals.",
    answer:
      "We carefully analyze your reports, eating habits, stress levels, exercise routine and medical history before preparing your wellness roadmap.",
    Icon: Tags,
  },
  {
    id: 3,
    question: "There is no one-size-fits-all solution.",
    answer:
      "Each individual receives a customized wellness plan that combines nutrition, diagnostics, therapy and sustainable lifestyle changes.",
    Icon: CreditCard,
  },
  {
    id: 4,
    question: "We support you with ongoing guidance and follow-up.",
    answer:
      "Your wellness plan is reviewed regularly so nutrition, diagnostics, therapy and lifestyle changes stay aligned with your progress, reports and long-term health goals.",
    Icon: HeartPulse,
  },
];

function iconForProcessFaq(item, index) {
  const question = String(item.question || "").trim().toLowerCase();
  const matched = PROCESS_FAQS.find((faq) => faq.question.toLowerCase() === question);
  const Icon =
    item.Icon || matched?.Icon || PROCESS_FAQ_ICONS[index % PROCESS_FAQ_ICONS.length];
  return <Icon size={18} aria-hidden />;
}

function withProcessFaqs(incoming) {
  const source = Array.isArray(incoming) ? incoming : [];
  const existing = new Set(
    source.map((item) => String(item.question || "").trim().toLowerCase()).filter(Boolean),
  );
  const extras = PROCESS_FAQS.filter(
    (faq) => !existing.has(faq.question.toLowerCase()),
  );
  return source.length ? [...source, ...extras] : PROCESS_FAQS;
}

const FALLBACK_DESCRIPTION_TITLE = "Meet Your Wellness Partner";
const FALLBACK_DESCRIPTION_BODY =
  "We merge advanced clinical diagnostics with restorative holistic practices to create your personalized path to vitality.";

const FALLBACK_PILLARS = [
  {
    id: 1,
    slug: "our-vision",
    title: "Our Vision",
    headTitle: "To Inspire & Educate India to live a Healthy & Happy Life.",
    description:
      "Usually people are reactive and disease oriented when it comes to health. We should be inspired for the cause of being healthy inside-out to live a disease free life. Current health situation is getting deteriorated primarily because of change in lifestyle hence it is important to get educated rightly about the good health practices.",
    icon: CardOne,
  },
  {
    id: 2,
    slug: "our-mission",
    title: "Our Mission",
    headTitle: "Reinvigorating India’s Wellness Heritage.",
    description:
      "We’re passionate about redefining India’s rich heritage of wellness practices in context to the modern era backed by science & research. Drawing inspiration from Ayurveda, Yoga, Meditation, and other traditional systems of medicine, we seek to blend ancient wisdom with contemporary science to promote holistic well-being for individuals across India.",
    icon: CardTwo,
  },
  {
    id: 3,
    slug: "our-goal",
    title: "Our Goal",
    headTitle: "Reach out One million families help them living a Healthy & Medicine Free life.",
    description:
      "Our goal is to reach out to One million families, empowering them to achieve a healthy and medicine-free life by addressing and reversing lifestyle disorders through holistic and sustainable fat-loss methods. By integrating comprehensive wellness strategies that encompass balanced nutrition, regular physical activity, stress management, and natural healing practices, we aim to transform lives and foster long-term health improvements.",
    icon: CardThree,
  },
];

const AboutUsSection = () => {
  const items = [
    { title: "Fat Loss", icon: <Flame size={18} /> },
    { title: "Thyroid", icon: <Activity size={18} /> },
    
    { title: "PCOS", icon: <ShieldPlus size={18} /> },
    { title: "Gut Health", icon: <Heart size={18} /> },
    { title: "Stress Management", icon: <Dumbbell size={18} /> },
  ];

  const [faqItems, setFaqItems] = useState(PROCESS_FAQS);
  const [faqItemsLoading, setFaqItemsLoading] = useState(true);
  const [cofounderMessage, setCofounderMessage] = useState(null);
  const [leadershipNotes, setLeadershipNotes] = useState([]);
  const [leadershipNotesLoading, setLeadershipNotesLoading] = useState(true);
  const [wellnessTeamNotes, setWellnessTeamNotes] = useState([]);
  const [wellnessTeamNotesLoading, setWellnessTeamNotesLoading] = useState(true);
  const [aboutPage, setAboutPage] = useState(null);
  const [pillarPages, setPillarPages] = useState({});
  const [aboutPagesLoaded, setAboutPagesLoaded] = useState(false);

  const faqData = (faqItems.length ? faqItems : PROCESS_FAQS)
    .map((item, index) => ({
      id: item.id || `faq-${index}`,
      icon: iconForProcessFaq(item, index),
      question: String(item.question || "").trim(),
      answer: String(item.answer || "").trim(),
    }))
    .filter((item) => item.question && item.answer);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setFaqItemsLoading(true);
      try {
        const response = await fetchFaqs({ page: 1, limit: 50, platform: "web" });
        if (!cancelled) {
          const incoming = Array.isArray(response?.faqs) ? response.faqs : [];
          setFaqItems(withProcessFaqs(incoming));
        }
      } catch {
        if (!cancelled) setFaqItems(PROCESS_FAQS);
      } finally {
        if (!cancelled) setFaqItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [description, mission, vision, goal] = await Promise.all([
        fetchStaticPageBySlugSafe("about-us"),
        fetchStaticPageBySlugSafe("our-mission"),
        fetchStaticPageBySlugSafe("our-vision"),
        fetchStaticPageBySlugSafe("our-goal"),
      ]);
      if (cancelled) return;
      setAboutPage(description);
      setPillarPages({
        "our-mission": mission,
        "our-vision": vision,
        "our-goal": goal,
      });
      setAboutPagesLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetchCofounderMessage();
        if (!cancelled) {
          setCofounderMessage(response?.data || null);
        }
      } catch {
        if (!cancelled) setCofounderMessage(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLeadershipNotesLoading(true);
      try {
        const response = await fetchLeadershipNotes({ page: 1, limit: 50, platform: "web" });
        if (!cancelled) {
          setLeadershipNotes(
            Array.isArray(response?.leadershipNotes) ? response.leadershipNotes : [],
          );
        }
      } catch {
        if (!cancelled) setLeadershipNotes([]);
      } finally {
        if (!cancelled) setLeadershipNotesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setWellnessTeamNotesLoading(true);
      try {
        const response = await fetchWellnessTeamNotes({ page: 1, limit: 50, platform: "web" });
        if (!cancelled) {
          setWellnessTeamNotes(
            Array.isArray(response?.wellnessTeamNotes) ? response.wellnessTeamNotes : [],
          );
        }
      } catch {
        if (!cancelled) setWellnessTeamNotes([]);
      } finally {
        if (!cancelled) setWellnessTeamNotesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const cofounderName = cofounderMessage?.name?.trim() || "";
  const cofounderBody = cofounderMessage?.message?.trim() || "";
  const cofounderProfileImage = cofounderMessage?.profileImage || "";
  const cofounderVideoType = cofounderMessage?.type || "none";
  const cofounderYtLink = cofounderMessage?.ytLink || "";
  const cofounderVideo = cofounderMessage?.video || "";
  const showCofounderMessage = Boolean(cofounderName && cofounderBody);

  const marqueeItems = [...items, ...items, ...items, ...items];
  const aboutHero = heroCopyFromStaticPage(aboutPage, {
    title: FALLBACK_DESCRIPTION_TITLE,
    body: FALLBACK_DESCRIPTION_BODY,
  });
  const aboutTitle = aboutHero.title || FALLBACK_DESCRIPTION_TITLE;
  const aboutBody = aboutHero.bodyHtml;
  const aboutRest = aboutHero.rest;
  const pillars = aboutPagesLoaded
    ? FALLBACK_PILLARS.map((fallback) => {
      const page = pillarPages[fallback.slug];
      if (!page) return null;
      const copy = pillarCopyFromStaticPage(page, fallback);
      const remoteIcon = String(page.icon || copy.icon || "").trim();
      return {
        ...fallback,
        title: copy.title || fallback.title,
        headTitle: copy.headTitle || fallback.headTitle,
        description: copy.description || fallback.description,
        html: copy.html || "",
        icon: remoteIcon || fallback.icon,
      };
    }).filter(Boolean)
    : [];

  return (
    <section className="about-wellness about-page p-0 pt-3">
      <div className="container">
        <div className="wellness__wrapper">
          <div className="wellness__content">
            {/* <span className="wellness__label">WELCOME TO OUR SPACE</span> */}

            <h2 className="wellness__title">
              {highlightWellnessTitle(aboutTitle)}
            </h2>

            {aboutBody ? (
              looksLikeHtml(aboutBody) ? (
              <div
                className="wellness__text mt-0 mb-0 static-page-content"
                dangerouslySetInnerHTML={{ __html: aboutBody }}
              />
              ) : (
              <p className="wellness__text mt-0 mb-0">
                {aboutBody}
              </p>
              )
            ) : (
              <p className="wellness__text mt-0 mb-0">
                {FALLBACK_DESCRIPTION_BODY}
              </p>
            )}
          </div>

          <div className="wellness__imageArea">
            <div className="wellness__image">
              <img src={clinicImage} alt="Clinic" />
            </div>

            {/* <div className="wellness__floatingCard displaymain">
              <img src={oilImage} alt="Essential Oil" />
            </div> */}
          </div>
        </div>
      </div>

      {aboutRest ? (
        <div className="site-container pt-3 pb-3">
          <div
            className="static-page-content"
            dangerouslySetInnerHTML={{ __html: aboutRest }}
          />
        </div>
      ) : null}

      <section className="marquee-section mt-2">
        <div className="marquee">
          <div className="marquee-track">
            {marqueeItems.map((item, index) => (
              <div className="marquee-item" key={index}>
                <span className="marquee-text">{item.title}</span>

                <span className="marquee-icon">{item.icon}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showCofounderMessage ? (
      <LeadershipMessageSection
        title="Co-Founder's Message"
        name={cofounderName}
        message={cofounderBody}
        profileImage={cofounderProfileImage}
        videoType={cofounderVideoType}
        ytLink={cofounderYtLink}
        video={cofounderVideo}
      />
      ) : null}

      

      {pillars.length ? (
      <section className="pillars pt-3 pb-3">
        <div className="site-container">
          <div className="pillars__heading">
            <h2 className="pillars__title">Our Vision, Mission & Goal</h2>
          </div>

          <div className="pillars__wrapper">
            {pillars.map((item) => (
              <article className="pillar-card" key={item.slug}>
                <div className="pillar-card__icon">
                  <img
                    src={item.icon}
                    alt={item.title || ""}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="pillar-card__content">
                  <h3 className="pillar-card__title">{item.title}</h3>
                  <PillarDescription
                    headTitle={item.headTitle}
                    html={item.html}
                    text={item.description}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      <Methodology />

<LeadershipNotesSlider
        notes={wellnessTeamNotes}
        loading={wellnessTeamNotesLoading}
        label="Wellness team profiles"
        heading="Our Wellness Team"
        subheading="Coaches and nutritionists walking this programme with you"
        loadingLabel="Loading wellness team profiles…"
      />

<LeadershipNotesSlider notes={leadershipNotes} loading={leadershipNotesLoading} />


      <section className="aboutFaq pt-2">
        <div className="site-container">
          <div className="aboutFaq__wrapper">
            {/* LEFT */}

           <div className="aboutFaq__gallery d-none d-lg-flex">
  <div className="aboutFaq__column">
    <div className="aboutFaq__image aboutFaq__image--large">
      <img src={img1} alt="Wellness" />
    </div>

    <div className="aboutFaq__image aboutFaq__image--small">
      <img src={img3} alt="Yoga" />
    </div>
  </div>

  <div className="aboutFaq__column">
    <div className="aboutFaq__image aboutFaq__image--small">
      <img src={img2} alt="Nutrition" />
    </div>

    <div className="aboutFaq__image aboutFaq__image--large">
      <img src={img4} alt="Diagnostics" />
    </div>
  </div>
</div>

            {/* RIGHT */}

            <div className="aboutFaq__content">
              <span className="aboutFaq__label pl-0">OUR PROCESS</span>

             <p className="aboutFaq__para managmt mt-0">
  We believe in a holistic approach towards health & Wellness.
  <br />
  Holistic Health recognizes the interconnectedness of mind, body
  & spirit and treats them as one which emphasizes the importance
  of nurturing each aspect to achieve optimal well-being.
</p>

<div className="aboutFaq__gallery d-flex d-lg-none manageimg">
  <div className="aboutFaq__column">
    <div className="aboutFaq__image aboutFaq__image--large">
      <img src={img1} alt="Wellness" />
    </div>

    <div className="aboutFaq__image aboutFaq__image--small">
      <img src={img3} alt="Yoga" />
    </div>
  </div>

  <div className="aboutFaq__column">
    <div className="aboutFaq__image aboutFaq__image--small">
      <img src={img2} alt="Nutrition" />
    </div>

    <div className="aboutFaq__image aboutFaq__image--large">
      <img src={img4} alt="Diagnostics" />
    </div>
  </div>
</div>

              {faqItemsLoading && !faqData.length ? null : faqData.length ? (
              <div
                className="accordion aboutFaqAccordion"
                id="aboutFaqAccordion"
              >
                {faqData.map((item, index) => (
                  <div className="accordion-item" key={item.id}>
                    <h2 className="accordion-header" id={`heading${item.id}`}>
                      <button
                        className={`accordion-button ${index !== 0 ? "collapsed" : ""
                          }`}
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse${item.id}`}
                        aria-expanded={index === 0}
                        aria-controls={`collapse${item.id}`}
                      >
                        <div className="aboutFaqAccordion__header">
                          <div className="aboutFaqAccordion__icon">
                            {item.icon}
                          </div>

                          <span className="aboutFaqAccordion__question">
                            {item.question}
                          </span>
                        </div>
                      </button>
                    </h2>

                    <div
                      id={`collapse${item.id}`}
                      className={`accordion-collapse collapse ${index === 0 ? "show" : ""
                        }`}
                      aria-labelledby={`heading${item.id}`}
                      data-bs-parent="#aboutFaqAccordion"
                    >
                      <div className="accordion-body">{item.answer}</div>
                    </div>
                  </div>
                ))}
              </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>


      {/* <section className="final-cta">
        <div className="final-cta__overlay"></div>

        <div className="final-cta__shape final-cta__shape--top"></div>
        <div className="final-cta__shape final-cta__shape--bottom"></div>

        <div className="site-container">
          <div className="final-cta__content">
            <h2 className="final-cta__title">
              Are you tired of facing your wellness journey alone?
            </h2>

            <p className="final-cta__description" style={{maxWidth:'100%',textAlign:'justify'}}>
              Discover a healthier, happier you with our vibrant wellness
              community. Connect, learn, and grow alongside like-minded
              individuals on your journey to well-being. Take the first step
              towards a balanced life – join us today and transform your
              tomorrow.
            </p>

            <button
              type="button"
              className="final-cta__button mt-0 mb-0"
              onClick={() =>
                window.open(
                  "https://chat.whatsapp.com/Lcv5qyt7tvX6nrif7poqBB",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              JOIN IRW COMMUNITY
              
            </button>
          </div>
        </div>
      </section> */}
     <FinalCTA/>
    </section>
  );
};

export default AboutUsSection;
