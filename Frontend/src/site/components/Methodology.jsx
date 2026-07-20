import discoveryImg from "../images/discovery.png";
import analysisImg from "../images/analysis.png";import programImg from "../images/program.png";

const methodologyData = [
  {
    id: 1,
    image: discoveryImg,
    title: "1:1 Discovery Call",
    headTitle: "All About You",
    description:
      "This call is designed to deep dive into your health history, current lifestyle and aspired health goals like Fat loss or any lifestyle disorder management/ reversal where your dedicated wellness coach will listen attentively to your needs and concerns to understand your specific health issues & goals.", 
      
  },
  {
    id: 2,
    image: analysisImg,
    title: "Root Cause Analysis",
    headTitle: "A Path to Wellness",
    description:
      "Every disorder/disease is a result of an underlying cause! Identifying and working on the cause & correcting it gives a permanent solution.Hence, identifying the root cause is the first step towards your health journey rather than just managing/curing the surface level symptoms.",
  },
  {
    id: 3,
    image: programImg,
    title: "Personalized Program",
    headTitle: "The Power of Personalized Approach",
    description:
      "Everyone is unique, so is their body, their health challenges and underlying root causes.Hence we offer a customized program which involves personal hand-holding, encouragement, support, guidance to uncover your full potential during this journey to achieve your health goal.",
  },
];

export default function Methodology() {
  return (
    <section className="methodology">
      <div className="site-container">
        <div className="methodology__header">
          <h2> Our Wellness Roadmap</h2>
          <p>
            We specialize in uncovering the intricate connections between diet,
            lifestyle and overall health. Through personalized consultations and
            root cause analysis.
          </p>
          
        </div>

        <div className="methodology__cards">
          {methodologyData.map((item) => (
            <div className="methodology-card" key={item.id}>
              <div className="methodology-card__image">
                <img src={item.image} alt={item.title} />
              </div>

              <div className="methodology-card__content">
                <h3>{item.title}</h3>

                <h5>{item.headTitle}</h5>
                <p>{item.description}</p>

                <button
                  type="button"
                  onClick={() =>
                    window.open("https://wa.me/919372109740", "_blank", "noopener,noreferrer")
                  }
                >
                  Book a consultation
                </button>        
                      </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
