import { useState, useMemo } from "react";
// import "./BmiCalculator.css";

export default function BmiCalculator() {
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState("Male");
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);

  const bmi = useMemo(() => {
    const h = height / 100;
    return (weight / (h * h)).toFixed(1);
  }, [height, weight]);

  const bmiData = useMemo(() => {
    const value = Number(bmi);

    if (value < 18.5)
      return {
        label: "Underweight",
        color: "#f4b740",
      };

    if (value < 25)
      return {
        label: "Healthy Weight",
        color: "#6ac36a",
      };

    if (value < 30)
      return {
        label: "Overweight",
        color: "#e7863a",
      };

    return {
      label: "Obese",
      color: "#e74c3c",
    };
  }, [bmi]);

  const needleRotation = Math.min(
    Math.max(((Number(bmi) / 40) * 180) - 90, -90),
    90
  );

  return (
    <section className="bmi-section">
      <div className="bmi-card">

        <div className="bmi-header">
          <h2>Body Mass Index Calculator</h2>
          <p>
            Assess your weight relative to your height for a baseline
            wellness metric.
          </p>
        </div>

        <div className="bmi-body">

          <div className="bmi-left">

            <div className="bmi-row">

              <div className="bmi-field">
                <label>AGE</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="bmi-field">
                <label>GENDER</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

            </div>

            <div className="bmi-field full">
              <label>HEIGHT</label>

              <div className="bmi-input-unit">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
                <span>cm</span>
              </div>
            </div>

            <div className="bmi-field full">
              <label>WEIGHT</label>

              <div className="bmi-input-unit">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <span>kg</span>
              </div>
            </div>

            <button className="bmi-btn">
              Calculate Result
            </button>

          </div>

          <div className="bmi-right">

            <div className="bmi-gauge">

              <svg viewBox="0 0 200 120">
                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#f3dfd1"
                  strokeWidth="20"
                />

                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#ffab63"
                  strokeWidth="20"
                  strokeDasharray="180 300"
                />

                <g
                  style={{
                    transform: `rotate(${needleRotation}deg)`,
                    transformOrigin: "100px 100px",
                    transition: "0.5s ease",
                  }}
                >
                  <line
                    x1="100"
                    y1="100"
                    x2="108"
                    y2="25"
                    stroke="#2e221c"
                    strokeWidth="4"
                  />

                  <circle
                    cx="100"
                    cy="100"
                    r="8"
                    fill="#2e221c"
                  />
                </g>
              </svg>

            </div>

            <div className="bmi-result">
              {bmi}
            </div>

            <div
              className="bmi-badge"
              style={{
                background: bmiData.color,
              }}
            >
              {bmiData.label}
            </div>

            <p className="bmi-note">
              This is a screening tool.
              <br />
              Always consult a clinician for
              <br />
              full health assessment.
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}