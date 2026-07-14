import {  ServicesSection } from "../components/InfoSections.jsx";
import { SiteHero } from "../components/SiteHero.jsx";
import {
  CommunitySection,
  StatsSection,
} from "../components/PromoSections.jsx";
import TestimonialsSection from "../components/TestimonialsSection.jsx";
// import BmiCalculator from "../components/BmiCalculator.jsx";
import WellnessHero from "../components/WellnessHero.jsx";
import Methodology from "../components/Methodology.jsx";
import About from "../components/About.jsx";
import FinalCTA from "../components/FinalCTA.jsx";
import ChampionSlider from "../components/ChampionSlider.jsx";
import BirthdaySlider from "../components/BirthDaySlider.jsx";
import RealHealingSlider from "../components/RealHealing.jsx";
import TransformationStoriesSection from "../components/TransformationStoriesSection.jsx";

export function HomePage() {
  return (
    <>
      <SiteHero />
   
      <WellnessHero />
     
    
      <StatsSection />
      <ChampionSlider />
      <BirthdaySlider />
      <Methodology />
      <TransformationStoriesSection />
      {/* <About /> */}
      <RealHealingSlider />
     
      <ServicesSection />
      <TestimonialsSection />
      <CommunitySection />
      {/* <BmiCalculator /> */}
      <FinalCTA />
    </>
  );
}
