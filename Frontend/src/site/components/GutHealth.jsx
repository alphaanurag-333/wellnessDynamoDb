import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";
import gutImg from "../images/gut-health-banner.png";

const GutHealth = () => {
  const page = programPages.gutHealth;

  return (
    <ProgramPage {...page} image={gutImg}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default GutHealth;
