import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";
import thyroidImg from "../images/thyroid-banner.png";

const Thyroid = () => {
  const page = programPages.thyroid;

  return (
    <ProgramPage {...page} image={thyroidImg}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default Thyroid;
