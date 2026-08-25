import WellnesspediaHero from "./wellnesspedia/WellnesspediaHero.jsx";
import HealthyRecipeSection from "./wellnesspedia/HealthyRecipeSection.jsx";
import HealthToolsSection from "./wellnesspedia/HealthToolsSection.jsx";
import YogaPranayamSection from "./wellnesspedia/YogaPranayamSection.jsx";
import HealthDisordersSection from "./wellnesspedia/HealthDisordersSection.jsx";
import WellnesspediaCtaSection from "./wellnesspedia/WellnesspediaCtaSection.jsx";
import FinalCTA from "./FinalCTA";

const ResourcesSection = () => {
  return (
    <section className="wellnesspedia-page">
      <WellnesspediaHero />
      <HealthyRecipeSection />
      <HealthToolsSection />
      <YogaPranayamSection />
      <HealthDisordersSection />
      <WellnesspediaCtaSection />
      <FinalCTA />
    </section>
  );
};

export default ResourcesSection;
