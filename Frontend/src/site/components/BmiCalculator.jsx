import { useMemo, useState } from "react";
import {
  isValidAge,
  isValidHeight,
  isValidWeight,
  blockInvalidIntegerKeyDown,
  blockInvalidCalculatorNumberKeyDown,
  sanitizePositiveInteger,
  sanitizePositiveDecimal,
  validateCalculatorFields,
} from "../utils/calculatorValidation.jsx";

function getBmiCategory(value) {
  if (value < 18.5) return { label: "Underweight", color: "#60a5fa" };
  if (value < 25) return { label: "Healthy Weight", color: "#22c55e" };
  if (value < 30) return { label: "Overweight", color: "#f59e0b" };
  return { label: "Obese", color: "#ef4444" };
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return Number((w / (h * h)).toFixed(1));
}

export default function BmiCalculator() {
  const [age, setAge] = useState("25");
  const [gender, setGender] = useState("Male");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("70");
  const [result, setResult] = useState(() => computeBmi(175, 70));

  const bmiData = useMemo(() => {
    if (result == null) return { label: "Enter values", color: "#94a3b8" };
    return getBmiCategory(result);
  }, [result]);

  const needleRotation = useMemo(() => {
    if (result == null) return -90;
    return Math.min(Math.max((result / 40) * 180 - 90, -90), 90);
  }, [result]);

  const handleCalculate = async (e) => {
    e.preventDefault();
    const ok = await validateCalculatorFields([
      {
        label: "Age",
        valid: isValidAge(age),
        hint: "Age (1–120 years)",
      },
      {
        label: "Height",
        valid: isValidHeight(height, "cm"),
        hint: "Height (50–300 cm)",
      },
      {
        label: "Weight",
        valid: isValidWeight(weight, "kg"),
        hint: "Weight (10–500 kg)",
      },
    ]);
    if (!ok) {
      setResult(null);
      return;
    }
    setResult(computeBmi(height, weight));
  };

  return (
    <section className="bmi-calc-section">
      <div className="bmi-calc-card">
        <div className="bmi-calc-header">
          <h2>Body Mass Index Calculator</h2>
          <p>Assess your weight relative to your height for a baseline wellness metric.</p>
        </div>

        <div className="bmi-calc-body">
          <form className="bmi-calc-form" onSubmit={handleCalculate}>
            <div className="bmi-calc-form__row">
              <label className="bmi-calc-field">
                <span className="bmi-calc-field__label">Age</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={age}
                  onKeyDown={blockInvalidIntegerKeyDown}
                  onChange={(e) =>
                    setAge(sanitizePositiveInteger(e.target.value, { max: 120 }))
                  }
                  placeholder="Years"
                />
              </label>

              <label className="bmi-calc-field">
                <span className="bmi-calc-field__label">Gender</span>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>
            </div>

            <label className="bmi-calc-field">
              <span className="bmi-calc-field__label">Height</span>
              <div className="bmi-calc-field__unit">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={300}
                  value={height}
                  onKeyDown={blockInvalidCalculatorNumberKeyDown}
                  onChange={(e) =>
                    setHeight(
                      sanitizePositiveDecimal(e.target.value, {
                        maxDecimals: 1,
                        max: 300,
                      })
                    )
                  }
                  placeholder="175"
                />
                <span>cm</span>
              </div>
            </label>

            <label className="bmi-calc-field">
              <span className="bmi-calc-field__label">Weight</span>
              <div className="bmi-calc-field__unit">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={500}
                  value={weight}
                  onKeyDown={blockInvalidCalculatorNumberKeyDown}
                  onChange={(e) =>
                    setWeight(
                      sanitizePositiveDecimal(e.target.value, {
                        maxDecimals: 1,
                        max: 500,
                      })
                    )
                  }
                  placeholder="70"
                />
                <span>kg</span>
              </div>
            </label>

            <button type="submit" className="bmi-calc-btn">
              Calculate Result
            </button>
          </form>

          <div className="bmi-calc-result">
            <div className="bmi-calc-gauge" aria-hidden="true">
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
                    transition: "transform 0.45s ease",
                  }}
                >
                  <line x1="100" y1="100" x2="108" y2="25" stroke="#2e221c" strokeWidth="4" />
                  <circle cx="100" cy="100" r="8" fill="#2e221c" />
                </g>
              </svg>
            </div>

            <div className="bmi-calc-score">{result ?? "—"}</div>

            <span className="bmi-calc-badge" style={{ background: bmiData.color }}>
              {bmiData.label}
            </span>

            <p className="bmi-calc-note">
              This is a screening tool. Always consult a clinician for full health assessment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
