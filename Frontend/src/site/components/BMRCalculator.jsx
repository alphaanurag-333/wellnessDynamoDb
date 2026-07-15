import React, { useMemo, useState } from "react";

import maleImg from "../../site/images/male.png";
import femaleImg from "../../site/images/female.png";
import {
  RequiredMark,
  isPositiveNumber,
  isValidAge,
  validateCalculatorFields,
} from "../utils/calculatorValidation.jsx";

const activityLevels = [
  {
    name: "Sedentary : little or no exercise",
    multiplier: 1.2,
  },
  {
    name: "Exercise 1 - 3 time/week",
    multiplier: 1.375,
  },
  {
    name: "Exercise 4 - 5 time/week",
    multiplier: 1.55,
  },
  {
    name: "Daily Exercise",
    multiplier: 1.725,
  },
  {
    name: "Intense exercise 6 - 7 times/week",
    multiplier: 1.9,
  },
  {
    name: "Very intense exercise daily",
    multiplier: 2.1,
  },
];

export default function BMRCalculator() {
  const [gender, setGender] = useState("male");

  const [age, setAge] = useState(28);

  const [height, setHeight] = useState("");

  const [weight, setWeight] = useState("");

  const [heightUnit, setHeightUnit] = useState("cm");

  const [weightUnit, setWeightUnit] = useState("kg");

  const [bmr, setBmr] = useState(0);

  //------------------------------------------------

  const convertHeightToCm = () => {
    if (!height) return 0;

    if (heightUnit === "cm") return Number(height);

    return Number(height) * 30.48;
  };

  //------------------------------------------------

  const convertWeightToKg = () => {
    if (!weight) return 0;

    if (weightUnit === "kg") return Number(weight);

    return Number(weight) * 0.453592;
  };

  //------------------------------------------------

  const calculateBMR = async () => {
    const ok = await validateCalculatorFields([
      { label: "Gender", valid: Boolean(gender) },
      { label: "Age", valid: isValidAge(age) },
      { label: "Height", valid: isPositiveNumber(height) },
      { label: "Weight", valid: isPositiveNumber(weight) },
    ]);
    if (!ok) return;

    const h = convertHeightToCm();
    const w = convertWeightToKg();

    let result = 0;

    if (gender === "male") {
      result = 10 * w + 6.25 * h - 5 * age + 5;
    } else {
      result = 10 * w + 6.25 * h - 5 * age - 161;
    }

    setBmr(Math.round(result));
  };

  //------------------------------------------------

  const tdee = useMemo(() => {
    return activityLevels.map((item) => ({
      ...item,
      value: Math.round(item.multiplier * bmr),
    }));
  }, [bmr]);

  return (
    <section className="bmr-section">
      <div className="container">
        <div className="bmr-wrapper">
          {/* LEFT */}
          <div className="bmr-right">
            <h5>Your Daily Baseline</h5>

            <div className="bmr-circle">
              <div className="circle">
                <h2>{bmr || "--"}</h2>

                <span>KCAL / DAY</span>
              </div>
            </div>

            <div className="activity-table">
              <div className="activity-header">
                <span>Activity Levels</span>

                <span>TDEE</span>
              </div>

              {tdee.map((item, index) => (
                <div className="activity-row" key={index}>
                  <div className="activity-name">
                    <span className="dot"></span>

                    {item.name}
                  </div>

                  <strong>{item.value || "--"}</strong>
                </div>
              ))}
            </div>

            <p className="activity-note">
              TDEE - Total Daily Energy Expenditure
            </p>
          </div>

          {/* RIGHT */}
          <div className="bmr-left">
            <h2>BMR Calculator</h2>

            <div className="bmr-form">
              {/* Gender */}

              <div className="form-group">
                <label>
                  Gender <RequiredMark />
                </label>

                <div className="gender-wrapper">
                  <div
                    className={`gender-card ${
                      gender === "male" ? "active" : ""
                    }`}
                    onClick={() => setGender("male")}
                  >
                    <img src={maleImg} alt="" />
                  </div>

                  <div
                    className={`gender-card ${
                      gender === "female" ? "active" : ""
                    }`}
                    onClick={() => setGender("female")}
                  >
                    <img src={femaleImg} alt="" />
                  </div>
                </div>
              </div>

              {/* Age */}

              <div className="form-group">
                <label>
                  Age <RequiredMark />
                </label>

                <input
                  type="number"
                  value={age}
                  min={1}
                  max={120}
                  required
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              {/* Height */}

              <div className="form-group form-group--full">
                <label>
                  Height <RequiredMark />
                </label>

                <div className="unit-input">
                  <input
                    type="number"
                    placeholder="Height"
                    value={height}
                    required
                    onChange={(e) => setHeight(e.target.value)}
                  />

                  <div className="unit-switch">
                    <button
                      type="button"
                      className={heightUnit === "cm" ? "active" : ""}
                      onClick={() => setHeightUnit("cm")}
                    >
                      cm
                    </button>

                    <button
                      type="button"
                      className={heightUnit === "ft" ? "active" : ""}
                      onClick={() => setHeightUnit("ft")}
                    >
                      ft
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group form-group--full">
                <label>
                  Weight <RequiredMark />
                </label>

                <div className="unit-input">
                  <input
                    type="number"
                    placeholder="Weight"
                    value={weight}
                    required
                    onChange={(e) => setWeight(e.target.value)}
                  />

                  <div className="unit-switch">
                    <button
                      type="button"
                      className={weightUnit === "kg" ? "active" : ""}
                      onClick={() => setWeightUnit("kg")}
                    >
                      kg
                    </button>

                    <button
                      type="button"
                      className={weightUnit === "lbs" ? "active" : ""}
                      onClick={() => setWeightUnit("lbs")}
                    >
                      lbs
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="calculate-btn"
                onClick={calculateBMR}
              >
                Calculate BMR
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
