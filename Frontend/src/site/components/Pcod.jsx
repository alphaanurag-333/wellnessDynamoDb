import ProgramPage from "./ProgramPage";
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";
import { programPages } from "../data/programPages";
import pcodImg from "../images/pcod-banner.png";

const Pcod = () => {
  const page = programPages.pcod;

  return (
    <ProgramPage {...page} image={pcodImg}>
      <ProgramTestimonialsSection type={page.testimonialType} />
    </ProgramPage>
  );
};

export default Pcod;
