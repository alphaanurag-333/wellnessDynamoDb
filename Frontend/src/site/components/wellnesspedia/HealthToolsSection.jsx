import { useState } from "react";
import { Activity, Flame, Percent, HeartPulse } from "lucide-react";
import BmiCalculatorModal from "./BmiCalculatorModal.jsx";
import BmrCalculatorModal from "./BmrCalculatorModal.jsx";
import BodyFatCalculatorModal from "./BodyFatCalculatorModal.jsx";
import VisceralFatCalculatorModal from "./VisceralFatCalculatorModal.jsx";

const TOOLS = [
  {
    id: "bmi",
    title: "BMI Calculator",
    icon: Activity,
    tone: "orange",
  },
  {
    id: "bmr",
    title: "BMR Calculator",
    icon: Flame,
    tone: "purple",
  },
  {
    id: "bodyfat",
    title: "Body Fat %",
    icon: Percent,
    tone: "pink",
  },
  {
    id: "visceral",
    title: "Visceral Fat",
    icon: HeartPulse,
    tone: "yellow",
  },
];

export default function HealthToolsSection() {
  const [active, setActive] = useState(null);

  return (
    <section className="wp-section wp-tools" aria-label="Health tools">
      <div className="site-container">
        <div className="wp-section__header">
          <h2>Health Tools</h2>
        </div>

        <div className="wp-tools-grid">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                className={`wp-tool-card wp-tool-card--${tool.tone}`}
                onClick={() => setActive(tool.id)}
              >
                <span className="wp-tool-card__icon" aria-hidden>
                  <Icon size={28} strokeWidth={1.75} />
                </span>
                <span className="wp-tool-card__title">{tool.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <BmiCalculatorModal open={active === "bmi"} onClose={() => setActive(null)} />
      <BmrCalculatorModal open={active === "bmr"} onClose={() => setActive(null)} />
      <BodyFatCalculatorModal
        open={active === "bodyfat"}
        onClose={() => setActive(null)}
      />
      <VisceralFatCalculatorModal
        open={active === "visceral"}
        onClose={() => setActive(null)}
      />
    </section>
  );
}
