import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";

const Thyroid = () => {
  const page = programPages.thyroid;

  return (
    <ProgramPage {...page}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default Thyroid;
