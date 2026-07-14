import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";

const GutHealth = () => {
  const page = programPages.gutHealth;

  return (
    <ProgramPage {...page}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default GutHealth;
