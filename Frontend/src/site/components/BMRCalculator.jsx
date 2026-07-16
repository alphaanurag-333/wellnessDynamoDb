import React, { useMemo, useState } from "react";

import maleImg from "../../site/images/male.png";
import femaleImg from "../../site/images/female.png";
import {
  RequiredMark,
  isValidAge,
  isValidHeight,
  isValidWeight,
  isValidFeetInches,
  feetInchesToCm,
  cmToFeetInches,
  blockInvalidIntegerKeyDown,
  blockInvalidCalculatorNumberKeyDown,
  sanitizePositiveInteger,
  sanitizePositiveDecimal,
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
  const [feet, setFeet] = useState("");
  const [inch, setInch] = useState("");
  const [weight, setWeight] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [bmr, setBmr] = useState(0);

  const changeHeightUnit = (unit) => {
    if (unit === heightUnit) return;
    if (unit === "ft") {
      const { feet: f, inches: i } = cmToFeetInches(height);
      setFeet(f);
      setInch(i);
    } else {
      const cm = feetInchesToCm(feet, inch);
      setHeight(cm ? String(Math.round(cm)) : "");
    }
    setHeightUnit(unit);
  };

  const convertHeightToCm = () => {
    if (heightUnit === "cm") {
      if (!height) return 0;
      return Number(height);
    }
    return feetInchesToCm(feet, inch);
  };

  const convertWeightToKg = () => {
    if (!weight) return 0;
    if (weightUnit === "kg") return Number(weight);
    return Number(weight) * 0.453592;
  };

  const calculateBMR = async () => {
    const heightOk =
      heightUnit === "cm"
        ? isValidHeight(height, "cm")
        : isValidFeetInches(feet, inch);

    const ok = await validateCalculatorFields([
      { label: "Gender", valid: Boolean(gender) },
      {
        label: "Age",
        valid: isValidAge(age),
        hint: "Age (1–120 years)",
      },
      {
        label: "Height",
        valid: heightOk,
        hint:
          heightUnit === "ft"
            ? "Height (1–8 ft and 0–11 in)"
            : "Height (50–300 cm)",
      },
      {
        label: "Weight",
        valid: isValidWeight(weight, weightUnit),
        hint:
          weightUnit === "lbs"
            ? "Weight (22–1100 lbs)"
            : "Weight (10–500 kg)",
      },
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

  const tdee = useMemo(() => {
    return activityLevels.map((item) => ({
      ...item,
      value: Math.round(item.multiplier * bmr),
    }));
  }, [bmr]);

  return (
    <section className="bmr-section pt-2 pb-2">
      <div className="container">
        <div className="bmr-wrapper">
          <div className="bmr-right">
            <h5 className="mb-2">Your Daily Baseline</h5>

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

            <p className="activity-note mt-2 mb-2">
              TDEE - Total Daily Energy Expenditure
            </p>
          </div>

          <div className="bmr-left">
            <h2>BMR Calculator</h2>

            <div className="bmr-form">
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

              <div className="form-group">
                <label>
                  Age <RequiredMark />
                </label>

                <input
                  type="number"
                  inputMode="numeric"
                  value={age}
                  min={1}
                  max={120}
                  required
                  onKeyDown={blockInvalidIntegerKeyDown}
                  onChange={(e) =>
                    setAge(sanitizePositiveInteger(e.target.value, { max: 120 }))
                  }
                />
              </div>

              <div className="form-group form-group--full">
                <label>
                  Height <RequiredMark />
                </label>

                <div className="unit-input">
                  {heightUnit === "cm" ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Height"
                      value={height}
                      min={0}
                      required
                      onKeyDown={blockInvalidCalculatorNumberKeyDown}
                      onChange={(e) =>
                        setHeight(
                          sanitizePositiveDecimal(e.target.value, {
                            maxDecimals: 2,
                            max: 300,
                          })
                        )
                      }
                    />
                  ) : (
                    <div className="height-feet">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="ft"
                        value={feet}
                        min={0}
                        max={8}
                        required
                        onKeyDown={blockInvalidIntegerKeyDown}
                        onChange={(e) =>
                          setFeet(
                            sanitizePositiveInteger(e.target.value, { max: 8 })
                          )
                        }
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="in"
                        value={inch}
                        min={0}
                        max={11}
                        required
                        onKeyDown={blockInvalidIntegerKeyDown}
                        onChange={(e) =>
                          setInch(
                            sanitizePositiveInteger(e.target.value, { max: 11 })
                          )
                        }
                      />
                    </div>
                  )}

                  <div className="unit-switch">
                    <button
                      type="button"
                      className={heightUnit === "cm" ? "active" : ""}
                      onClick={() => changeHeightUnit("cm")}
                    >
                      cm
                    </button>

                    <button
                      type="button"
                      className={heightUnit === "ft" ? "active" : ""}
                      onClick={() => changeHeightUnit("ft")}
                    >
                      ft/in
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
                    inputMode="decimal"
                    placeholder="Weight"
                    value={weight}
                    min={0}
                    required
                    onKeyDown={blockInvalidCalculatorNumberKeyDown}
                    onChange={(e) =>
                      setWeight(
                        sanitizePositiveDecimal(e.target.value, {
                          maxDecimals: 2,
                          max: weightUnit === "lbs" ? 1100 : 500,
                        })
                      )
                    }
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
