import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";
import diabetesImg from "../images/diabetes-banner.png";

const Diabetes = () => {
  const page = programPages.diabetes;

  return (
    <ProgramPage {...page} image={diabetesImg}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default Diabetes;
