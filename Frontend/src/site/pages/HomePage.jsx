import { useEffect, useState } from "react";
import { fetchClientTestimonials } from "../api/publicMisc.js";
import {  ServicesSection } from "../components/InfoSections.jsx";
import { AppDownloadSection } from "../components/AppDownloadSection.jsx";
import { ContactSection } from "../components/ContactSection.jsx";
import { FeaturedTestimonial } from "../components/FeaturedTestimonial.jsx";
import { SiteHero } from "../components/SiteHero.jsx";
import {
  ChallengeBanner,
  CommunitySection,
  StatsSection,
} from "../components/PromoSections.jsx";
import  TestimonialsSection  from "../components/TestimonialsSection.jsx";
import BmiCalculator from "../components/BmiCalculator.jsx";
import WellnessHero from "../components/WellnessHero.jsx";
import Methodology from "../components/Methodology.jsx";
import AboutSection from "../components/AboutUs.jsx";
import FinalCTA from "../components/FinalCTA.jsx";

export function HomePage() {
  const [testimonials, setTestimonials] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchClientTestimonials({ page: 1, limit: 12 });
        if (!cancelled) {
          setTestimonials(data?.clientTestimonials || []);
        }
      } catch {
        if (!cancelled) setTestimonials([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = testimonials?.[0] || null;
  const testimonialsReady = testimonials !== null;

  return (
    <>
      <SiteHero />
      <WellnessHero />
      <StatsSection />
      <AboutSection />
      <Methodology />
      <ServicesSection />
      {/* <FeaturedTestimonial testimonial={featured} /> */}
      {testimonialsReady ? (
        <TestimonialsSection items={testimonials} />
      ) : (
        <section className="site-section site-section--muted" aria-busy="true">
          <div className="site-container">
            <p className="site-testimonials__loading">Loading reviews…</p>
          </div>
        </section>
      )}
      {/* <ChallengeBanner /> */}
      {/* <AppDownloadSection /> */}
      <CommunitySection />
      <BmiCalculator />
      <FinalCTA/>
      {/* <ContactSection /> */}
    </>
  );
}
