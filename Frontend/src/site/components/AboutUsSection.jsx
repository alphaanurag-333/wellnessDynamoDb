import React, { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import {
  DEFAULT_IMAGE_SRC,
  handleMediaImageError,
  mediaUrl,
} from "../../media.js";
import {
  fetchCofounderMessage,
  fetchWellnessCoaches,
} from "../api/publicMisc.js";

import "swiper/css";
import "swiper/css/navigation";

import clinicImage from "../images/about-hero.png";
import oilImage from "../images/Exercise.jpg";
import founderImg from "../images/Exercise.jpg";
import CardOne from "../images/about-card-one.jpg";
import CardTwo from "../images/about-card-two.jpg";
import CardThree from "../images/about-card-three.jpg";
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
  ArrowRight,
  ArrowUpRight,
  Target,
  Eye,
  Sparkles,
  Gauge,
  Tags,
  CreditCard,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AboutUs from "./About.jsx";
import Methodology from "./Methodology.jsx";

const FALLBACK_COFOUNDER = {
  name: "Ms. Banita Acharya",
  designation: "Co-Founder & CEO",
  message: `India Has Been A Hub Of Healing & Wellness Since Vedic Times With Richness Of Indian Traditional Wellness Techniques. However, Since The Last 2 To 3 Decades, Lifestyle Diseases/Disorders Including Obesity Have Grown Manifolds.

We Rank 3rd Globally In Obesity; Have A Large Population Of Diabetes And Are Rapidly Marching Towards Becoming The Capital. We Register Second Highest In Terms Of Deaths Cancer & Heart Disease Are Rapidly Growing In Urban India.

Despite Medical Science Having Evolved So Much, We Are Just Managing The Disease Or The Condition. There Is Something Missing !

According to me, whatever I have researched.. The primary reasons are lifestyle and hormonal imbalances which lead to such diseases/disorders.. Hence if we correct these, we can improve the disease management and can even reverse them.

India Redefining Wellness is a Holistic Wellness Platform with its unique approach towards your wellbeing by redefining your health. It operates with a blend of our age-old rich Indian philosophy and modern age research & science.

At IRW, we specialize in personalized holistic solutions aimed at addressing a wide range of health concerns, including personalized holistic fat loss, lifestyle disorders reversal like Diabetes, Hypo & Hyper Thyroid, PCOD/PCOS, Gut Health, and other Autoimmune Disorders.

We believe our client’s health is our responsibility.

We develop an understanding of the client’s current lifestyle & uncover the current health conditions through deep root cause analysis. Our approach towards addressing them includes personalized hand holding with consistent & persistent monitoring of all Health pillars like Food & Nutrition, Sleep & Rest, physical exercise & Emotional Health. This cumulative approach yield the desired improvements including the reversal of lifestyle disorders.

Our core principle is to educate and empower our clients with right knowledge and practices so that they can take charge of their health to live a medicine free life.

Our expertise is in extending personalized guidance and hand holding to each of our clients with regular reviews until they achieve their health goal. We understand everybody is unique and they need special attention.

We are currently working on a Project to inspire & educate 10 Lakhs families within the next 2 years and help them live a Healthy & Medicine Free Life. We are also working passionately towards creating a Team of 500 in-house Wellness Coaches and helping them build their identity in the society through Wellness Consultations.

I wish you all the very best ! Come & join us in our mission… Let’s make this world a better place to live !`,
};

function messageParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function coachDesignation(coach) {
  const specialization = coach?.specializationTitle?.trim();
  if (specialization) return specialization.toUpperCase();

  const bio = coach?.bio?.trim();
  if (bio) return bio;

  return "WELLNESS COACH";
}

const AboutUsSection = () => {
  const items = [
    { title: "Fat Loss", icon: <Flame size={18} /> },
    { title: "Thyroid", icon: <Activity size={18} /> },
    { title: "Throat", icon: <HeartPulse size={18} /> },
    { title: "PCOS", icon: <ShieldPlus size={18} /> },
    { title: "Gut Health", icon: <Heart size={18} /> },
    { title: "Stress Management", icon: <Dumbbell size={18} /> },
  ];

  const pillars = [
    {
      id: 1,
      title: "Our Mission",
      headTitle:"Reinvigorating India’s Wellness Heritage.",
      description:
        "We’re passionate about redefining India’s rich heritage of wellness practices in context to the modern era backed by science & research. Drawing inspiration from Ayurveda, Yoga, Meditation, and other traditional systems of medicine, we seek to blend ancient wisdom with contemporary science to promote holistic well-being for individuals across India.",

      icon: CardOne,
      active: true,
    },
    {
      id: 2,
      title: "Our Vision",
            headTitle:"To Inspire & Educate India to live a Healthy & Happy Life.",

      description:
        "Usually people are reactive and disease oriented when it comes to health. We should be inspired for the cause of being healthy inside-out to live a disease free life.  Current health situation is getting deteriorated primarily because of change in lifestyle hence it is important to get educated rightly about the good health practices.",
      icon: CardTwo,
      active: false,
    },
    {
      id: 3,
      title: "Our Goal",
            headTitle:"Reach out One million families help them living a Healthy & Medicine Free life.",

      description:
        "Our goal is to reach out to One million families, empowering them to achieve a healthy and medicine-free life by addressing and reversing lifestyle disorders through holistic and sustainable fat-loss methods. By integrating comprehensive wellness strategies that encompass balanced nutrition, regular physical activity, stress management, and natural healing practices, we aim to transform lives and foster long-term health improvements. ",
      icon: CardThree,
      active: false,
    },
  ];

  const faqData = [
    {
      id: 1,
      icon: <Gauge size={18} />,
      question: "Our approach includes the following.",
      answer:
        "Our healing process starts with understanding your health history, lifestyle, nutrition, sleep, stress levels and long-term wellness goals. Every recommendation is personalized to your body and lifestyle.",
    },
    {
      id: 2,
      icon: <Tags size={18} />,
      question:
        "Delve deep into health history, current lifestyle and aspired health goals.",
      answer:
        "We carefully analyze your reports, eating habits, stress levels, exercise routine and medical history before preparing your wellness roadmap.",
    },
    {
      id: 3,
      icon: <CreditCard size={18} />,
      question: "There is no one-size-fits-all solution.",
      answer:
        "Each individual receives a customized wellness plan that combines nutrition, diagnostics, therapy and sustainable lifestyle changes.",
    },
    // {
    //   id: 4,
    //   icon: <Brain size={18} />,
    //   question:
    //     "Healing is a continuous journey.",
    //   answer:
    //     "Regular follow-ups, continuous monitoring and personalized guidance help you achieve long-lasting health improvements.",
    // },
  ];

  const [expanded, setExpanded] = useState(false);
  const [cofounderMessage, setCofounderMessage] = useState(null);
  const [wellnessCoaches, setWellnessCoaches] = useState([]);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetchCofounderMessage();
        if (!cancelled && response?.data) {
          setCofounderMessage(response.data);
        }
      } catch {
        /* keep fallback content */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setCoachesLoading(true);
      try {
        const response = await fetchWellnessCoaches({ page: 1, limit: 50 });
        if (!cancelled) {
          setWellnessCoaches(
            Array.isArray(response?.wellnessCoaches)
              ? response.wellnessCoaches
              : [],
          );
        }
      } catch {
        if (!cancelled) setWellnessCoaches([]);
      } finally {
        if (!cancelled) setCoachesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const leadershipName =
    cofounderMessage?.name?.trim() || FALLBACK_COFOUNDER.name;
  const leadershipMessage =
    cofounderMessage?.message?.trim() || FALLBACK_COFOUNDER.message;
  const leadershipImage = cofounderMessage?.profileImage
    ? mediaUrl(cofounderMessage.profileImage)
    : founderImg;
  const leadershipParagraphs = messageParagraphs(leadershipMessage);

  const marqueeItems = [...items, ...items, ...items, ...items];

  return (
    <section className="about-wellness">
      <div className="site-container">
        <div className="wellness__wrapper">
          <div className="wellness__content">
            <span className="wellness__label">WELCOME TO OUR SPACE</span>

            <h2 className="wellness__title">
              Meet Your
              <br />
              <span>Wellness</span> Partner
            </h2>

            <p className="wellness__text">
              We merge advanced clinical diagnostics with restorative holistic
              practices to create your personalized path to vitality.
            </p>
          </div>

          <div className="wellness__imageArea">
            <div className="wellness__image">
              <img src={clinicImage} alt="Clinic" />
            </div>

            <div className="wellness__floatingCard">
              <img src={oilImage} alt="Essential Oil" />
            </div>
          </div>
        </div>
      </div>

      <section className="marquee-section">
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

      <section className="leadership">
        <div className="site-container">
          <div className="leadership__card">
            {/* Left Image */}
            <div className="leadership__image">
              <img
                src={leadershipImage || DEFAULT_IMAGE_SRC}
                alt={leadershipName}
                onError={handleMediaImageError}
              />
            </div>

            {/* Right Content */}
            <div className="leadership__content">
              <span className="leadership__badge">A NOTE FROM LEADERSHIP</span>

              <h2 className="leadership__title">Co-Founder's Message</h2>

              <div className="leadership__author">
                <h4>{leadershipName}</h4>
                <span>{FALLBACK_COFOUNDER.designation}</span>
              </div>

              <div
                className={`leadership__description ${
                  expanded ? "expanded" : ""
                }`}
              >
                {leadershipParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <button
                className="leadership__link"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Read Less" : "Read More"}

                {expanded ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="pillars">
        <div className="site-container">
          {/* Heading */}

          <div className="pillars__heading">
            <h2 className="pillars__title">Our Vision, Mission & Goal</h2>
          </div>

          {/* Cards */}

          <div className="pillars__wrapper">
            {pillars.map((item) => (
              <div
                className={`pillar-card ${
                  item.active ? "pillar-card--active" : ""
                }`}
                key={item.id}
              >
                <div className="pillar-card__icon">
                 
                  <img src={item.icon} alt="Founder" />
                </div>

                <div className="pillar-card__content">
                  <h3 className="pillar-card__title">{item.title}</h3>
                  <h5 className="pillar-card__head-title">{item.headTitle}</h5>

                  <p className="pillar-card__description">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Methodology />
      <section className="aboutFaq">
        <div className="site-container">
          <div className="aboutFaq__wrapper">
            {/* LEFT */}

            <div className="aboutFaq__gallery">
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
              <span className="aboutFaq__label">OUR PROCESS</span>

              <h2 className="aboutFaq__title">
                <span> Holistic Approach</span>
              </h2>
              <p className="aboutFaq__para">
                We believe in a holistic approach towards health & Wellness.
                <br />
                Holistic Health recognizes the interconnectedness of mind, body
                & spirit and treats them as one which emphasizes the importance
                of nurturing each aspect to achieve optimal well-being.
              </p>

              <div
                className="accordion aboutFaqAccordion"
                id="aboutFaqAccordion"
              >
                {faqData.map((item, index) => (
                  <div className="accordion-item" key={item.id}>
                    <h2 className="accordion-header" id={`heading${item.id}`}>
                      <button
                        className={`accordion-button ${
                          index !== 0 ? "collapsed" : ""
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
                      className={`accordion-collapse collapse ${
                        index === 0 ? "show" : ""
                      }`}
                      aria-labelledby={`heading${item.id}`}
                      data-bs-parent="#aboutFaqAccordion"
                    >
                      <div className="accordion-body">{item.answer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {(coachesLoading || wellnessCoaches.length > 0) && (
        <section className="medicalBoard">
          <div className="site-container">
            <div className="medicalBoard__top">
              <div className="medicalBoard__heading">
                <h2>Our Wellness Coaches</h2>

                <p>World-class experts dedicated to your sanctuary journey.</p>
              </div>

              {wellnessCoaches.length > 0 && (
                <div className="medicalBoard__navigation">
                  <button
                    ref={prevRef}
                    className="medicalBoard__navBtn"
                    type="button"
                    aria-label="Previous coach"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button
                    ref={nextRef}
                    className="medicalBoard__navBtn"
                    type="button"
                    aria-label="Next coach"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              )}
            </div>

            {coachesLoading ? (
              <p className="medicalBoard__loading">Loading wellness coaches…</p>
            ) : (
              <Swiper
                modules={[Navigation]}
                spaceBetween={28}
                slidesPerView={4}
                onInit={(swiper) => {
                  swiper.params.navigation.prevEl = prevRef.current;
                  swiper.params.navigation.nextEl = nextRef.current;

                  swiper.navigation.destroy();
                  swiper.navigation.init();
                  swiper.navigation.update();
                }}
                navigation={{
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                }}
                breakpoints={{
                  0: {
                    slidesPerView: 1.2,
                    spaceBetween: 18,
                  },
                  768: {
                    slidesPerView: 2.3,
                    spaceBetween: 20,
                  },
                  992: {
                    slidesPerView: 4,
                    spaceBetween: 22,
                  },
                  1200: {
                    slidesPerView: 4,
                    spaceBetween: 24,
                  },
                }}
                className="medicalBoardSlider"
              >
                {wellnessCoaches.map((coach) => (
                  <SwiperSlide key={coach.id || coach._id}>
                    <div className="doctorCard">
                      <div className="doctorCard__image">
                        <img
                          src={
                            mediaUrl(coach.profileImage) || DEFAULT_IMAGE_SRC
                          }
                          alt={coach.name || "Wellness coach"}
                          onError={handleMediaImageError}
                        />
                      </div>

                      <div className="doctorCard__content">
                        <h3>{coach.name}</h3>

                        <p>{coachDesignation(coach)}</p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </section>
      )}

      <section className="final-cta">
        <div className="final-cta__overlay"></div>

        <div className="final-cta__shape final-cta__shape--top"></div>
        <div className="final-cta__shape final-cta__shape--bottom"></div>

        <div className="site-container">
          <div className="final-cta__content">
            <h2 className="final-cta__title">
              Are you tired of facing your wellness journey alone?
            </h2>

            <p className="final-cta__description">
              Discover a healthier, happier you with our vibrant wellness
              community. Connect, learn, and grow alongside like-minded
              individuals on your journey to well-being. Take the first step
              towards a balanced life – join us today and transform your
              tomorrow.
            </p>

            <button className="final-cta__button">
              Book Your Free Consultation
            </button>
          </div>
        </div>
      </section>
    </section>
  );
};

export default AboutUsSection;
