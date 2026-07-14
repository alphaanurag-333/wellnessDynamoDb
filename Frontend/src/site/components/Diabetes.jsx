import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";

const Diabetes = () => {
  const page = programPages.diabetes;

  return (
    <ProgramPage {...page}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default Diabetes;
