import ProgramPage from "./ProgramPage";
import TransformationStoriesSection from "./TransformationStoriesSection";
import { programPages } from "../data/programPages";

const FatLoss = () => {
  const page = programPages.fatLoss;

  return (
    <ProgramPage {...page}>
      <TransformationStoriesSection />

      <section className="program-highlight pt-2">
        <div className="site-container">
          <div className="program-highlight__card">
            <div className="program-highlight__heading">
              <span className="program-highlight__badge">Why Fat loss matters</span>
              <h2>
                Did you know obesity increase your chance of being hospitalized
                by <span>6 times?</span>
              </h2>
            </div>

            <div className="program-highlight__body text-justify">
              <p>
                That&apos;s right. People with a{" "}
                <strong>weak immune system</strong> are at a much higher risk of
                developing Type 2 Diabetes, High Blood Pressure, Heart Disease,
                Liver Disease and even common viral infections.
              </p>

              <div className="program-highlight__hope">
                <h3>But there is hope</h3>
                <p className="text-justify">
                  With the right nutrition, personalized guidance, exercise and
                  healthy lifestyle changes, obesity can be managed and reversed
                  safely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ProgramPage>
  );
};

export default FatLoss;
