import discoveryImg from "../images/discovery.png";
import analysisImg from "../images/analysis.png";import programImg from "../images/program.png";

const methodologyData = [
  {
    id: 1,
    image: discoveryImg,
    title: "Discovery Call",
    description:
      "This call is designed to deep dive into your health history, current lifestyle and aspired health goals like Fat loss or any lifestyle disorder management/ reversal where your dedicated wellness coach",
  },
  {
    id: 2,
    image: analysisImg,
    title: "Root Cause Analysis",
    description:
      "Every disorder/disease is a result of an underlying cause! Identifying and working on the cause & correcting it gives a permanent solution.Hence, identifying the root cause is the first step towards your health journey.",
  },
  {
    id: 3,
    image: programImg,
    title: "Personalized Program",
    description:
      "Every individual is unique, and so are their health needs. Our personalized program combines expert guidance, ongoing support, and motivation to help you build healthier habits and achieve your wellness goals.",
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

                <p>{item.description}</p>

                <button
                  type="button"
                  onClick={() =>
                    window.open("https://wa.me/919372109740", "_blank", "noopener,noreferrer")
                  }
                >
                  Book a consultation
                </button>              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
