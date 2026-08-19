import { useEffect, useState } from "react";
import { FiBookOpen } from "react-icons/fi";

import aboutOne from "../images/about-one.png";
import aboutTwo from "../images/about-two.png";
import aboutThree from "../images/about-three.jpg";
import aboutFour from "../images/about-four.png";
import { fetchStaticPageBySlugSafe, heroCopyFromStaticPage } from "../api/publicMisc.js";

const FALLBACK_TITLE = "Meet Your Wellness Partner";
const FALLBACK_DESCRIPTION = "We merge advanced clinical diagnostics with restorative holistic practices to create your personalized path to vitality.";

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

export default function AboutUs() {
  const [page, setPage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchStaticPageBySlugSafe("about-us").then((next) => {
      if (!cancelled) setPage(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = heroCopyFromStaticPage(page, {
    title: FALLBACK_TITLE,
    body: FALLBACK_DESCRIPTION,
  });
  const title = hero.title || FALLBACK_TITLE;
  const body = hero.bodyHtml || FALLBACK_DESCRIPTION;

  return (
    <section className="about-section">
      <div className="site-container">
        <div className="about-wrapper">
          <div className="about-content">
            <div className="about-us__badge">ABOUT US</div>

            <h2 className="about-title">{title}</h2>

            {looksLikeHtml(body) ? (
              <div
                className="about-description static-page-content"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : (
              <p className="about-description">{body}</p>
            )}

            <button className="about-btn">
              Read All Stories
              <FiBookOpen />
            </button>
          </div>

          <div className="about-gallery">
            <div className="about-gallery-left">
              <div className="about-card about-card--large">
                <img src={aboutOne} alt="Running" />
              </div>

              <div className="about-card about-card--small">
                <img src={aboutThree} alt="Yoga" />
              </div>
            </div>

            <div className="about-gallery-right">
              <div className="about-card about-card--top">
                <img src={aboutTwo} alt="Healthy Food" />
              </div>

              <div className="about-card about-card--bottom">
                <img src={aboutFour} alt="Meditation" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
