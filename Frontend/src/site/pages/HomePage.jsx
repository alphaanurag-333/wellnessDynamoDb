import { ServicesSection } from "../components/InfoSections.jsx";
import { SiteHero } from "../components/SiteHero.jsx";
import { StatsSection } from "../components/PromoSections.jsx";
import TestimonialsSection from "../components/TestimonialsSection.jsx";
import WellnessHero from "../components/WellnessHero.jsx";
import AppHeroSection from "../components/AppHeroSection.jsx";
import Methodology from "../components/Methodology.jsx";
import FinalCTA from "../components/FinalCTA.jsx";
import ChampionSlider from "../components/ChampionSlider.jsx";
import RealHealingSlider from "../components/RealHealing.jsx";
import TransformationStoriesSection from "../components/TransformationStoriesSection.jsx";

export function HomePage() {
  return (
    <div className="home-page">
      <SiteHero />
      <ChampionSlider />
      <WellnessHero />
      <StatsSection />
      <Methodology />
      <TransformationStoriesSection />
      <RealHealingSlider />
      <ServicesSection />
      <TestimonialsSection />
      <AppHeroSection />
      <FinalCTA />
    </div>
  );
}
