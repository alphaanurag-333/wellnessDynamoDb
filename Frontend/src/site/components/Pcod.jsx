import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";

const Pcod = () => {
  const page = programPages.pcod;

  return (
    <ProgramPage {...page}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default Pcod;
