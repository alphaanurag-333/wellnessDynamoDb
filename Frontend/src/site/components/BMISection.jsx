import React, { useState, useMemo } from "react";

import { Info } from "lucide-react";
import {
  RequiredMark,
  isValidAge,
  isValidHeight,
  isValidWeight,
  isInRange,
  blockInvalidIntegerKeyDown,
  blockInvalidCalculatorNumberKeyDown,
  sanitizePositiveInteger,
  sanitizePositiveDecimal,
  validateCalculatorFields,
} from "../utils/calculatorValidation.jsx";

const BMISection = () => {
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");

  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");

  const [heightCm, setHeightCm] = useState(175);

  const [feet, setFeet] = useState(5);
  const [inch, setInch] = useState(9);

  const [weightKg, setWeightKg] = useState(70);
  const [weightLb, setWeightLb] = useState(154.3);

  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");
  const [resultColor, setResultColor] = useState("#94a3b8");

  /* -----------------------------
      UNIT CONVERSION
  ------------------------------*/

  const changeHeightUnit = (unit) => {
    if (unit === heightUnit) return;

    if (unit === "ft") {
      const totalInches = heightCm / 2.54;

      setFeet(Math.floor(totalInches / 12));
      setInch(Math.round(totalInches % 12));
    } else {
      const cm = (Number(feet) * 12 + Number(inch)) * 2.54;

      setHeightCm(Math.round(cm));
    }

    setHeightUnit(unit);
  };

  const changeWeightUnit = (unit) => {
    if (unit === weightUnit) return;

    if (unit === "lb") {
      setWeightLb((weightKg * 2.20462).toFixed(1));
    } else {
      setWeightKg((weightLb / 2.20462).toFixed(1));
    }

    setWeightUnit(unit);
  };

  /* -----------------------------
      BMI CALCULATION (on click only)
  ------------------------------*/

  const calculateBMI = async () => {
    const heightOk =
      heightUnit === "cm"
        ? isValidHeight(heightCm, "cm")
        : isInRange(feet, 1, 8) && isInRange(inch, 0, 11);
    const weightOk =
      weightUnit === "kg"
        ? isValidWeight(weightKg, "kg")
        : isValidWeight(weightLb, "lbs");

    const ok = await validateCalculatorFields([
      {
        label: "Age",
        valid: isValidAge(age),
        hint: "Age (1–120 years)",
      },
      { label: "Gender", valid: Boolean(gender) },
      {
        label: "Height",
        valid: heightOk,
        hint:
          heightUnit === "cm"
            ? "Height (50–300 cm)"
            : "Height (1–8 ft and 0–11 in)",
      },
      {
        label: "Weight",
        valid: weightOk,
        hint:
          weightUnit === "kg"
            ? "Weight (10–500 kg)"
            : "Weight (22–1100 lb)",
      },
    ]);
    if (!ok) return;

    let height = 0;
    let weight = 0;

    if (heightUnit === "cm") {
      height = Number(heightCm) / 100;
    } else {
      const totalInches = Number(feet) * 12 + Number(inch);
      height = totalInches * 0.0254;
    }

    if (weightUnit === "kg") {
      weight = Number(weightKg);
    } else {
      weight = Number(weightLb) * 0.45359237;
    }

    const value = Number((weight / (height * height)).toFixed(1));

    setBmi(value);

    if (value < 18.5) {
      setCategory("Underweight");
      setResultColor("#60A5FA");
    } else if (value < 25) {
      setCategory("Healthy Weight");
      setResultColor("#22C55E");
    } else if (value < 30) {
      setCategory("Overweight");
      setResultColor("#FBBF24");
    } else {
      setCategory("Obesity");
      setResultColor("#EF4444");
    }
  };

  /* -----------------------------
      MARKER POSITION
  ------------------------------*/

  const markerPosition = useMemo(() => {
    if (bmi == null) return "0%";

    let position = 0;

    if (bmi < 18.5) {
      position = (bmi / 18.5) * 18.5;
    } else if (bmi < 25) {
      position = 18.5 + ((bmi - 18.5) / (25 - 18.5)) * 31.5;
    } else if (bmi < 30) {
      position = 50 + ((bmi - 25) / (30 - 25)) * 12.5;
    } else {
      const maxBMI = 40;
      const value = Math.min(bmi, maxBMI);
      position = 62.5 + ((value - 30) / (maxBMI - 30)) * 37.5;
    }

    return `${position}%`;
  }, [bmi]);

  return (
    <section className="bmi-section pt-2 pb-2">
      <div className="container">
        <div className="bmi-wrapper">
          {/* LEFT */}

          <div className="bmi-left">
            <h2>BMI Calculator</h2>

            <p>
              Body Mass Index (BMI) is a simple index of weight-for-height that
              is commonly used to classify underweight, overweight, and obesity
              in adults.
            </p>

            <div className="bmi-info-card">
              <div className="info-title">
                <Info size={16} />
                Understanding Results
              </div>

              <div className="result-row">
                <span>Underweight</span>
                <strong>&lt; 18.5</strong>
              </div>

              <div className="result-row">
                <span>Normal weight</span>
                <strong>18.5 – 24.9</strong>
              </div>

              <div className="result-row">
                <span>Overweight</span>
                <strong>25 – 29.9</strong>
              </div>

              <div className="result-row">
                <span>Obesity</span>
                <strong>BMI of 30 or greater</strong>
              </div>
            </div>
          </div>

          {/* RIGHT */}

          <div className="bmi-right bmi-form margint">
            <div className="form-row">
              <div className="form-group age">
                <label>
                  Age <RequiredMark />
                </label>

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Years"
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

              <div className="form-group gender">
                <label>
                  Gender <RequiredMark />
                </label>

                <div className="gender-buttons">
                  <button
                    type="button"
                    className={gender === "male" ? "active" : ""}
                    onClick={() => setGender("male")}
                  >
                    Male
                  </button>

                  <button
                    type="button"
                    className={gender === "female" ? "active" : ""}
                    onClick={() => setGender("female")}
                  >
                    Female
                  </button>
                </div>
              </div>
            </div>

            {/* HEIGHT + WEIGHT */}

            <div className="form-row">
              <div className="form-group">
                <div className="field-header">
                  <label>
                    Height <RequiredMark />
                  </label>

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

                {heightUnit === "cm" ? (
                  <div className="input-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={heightCm}
                      onKeyDown={blockInvalidCalculatorNumberKeyDown}
                      onChange={(e) =>
                        setHeightCm(
                          sanitizePositiveDecimal(e.target.value, {
                            maxDecimals: 1,
                            max: 300,
                          })
                        )
                      }
                    />
                    <span>cm</span>
                  </div>
                ) : (
                  <div className="height-feet">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={8}
                      value={feet}
                      onKeyDown={blockInvalidIntegerKeyDown}
                      onChange={(e) =>
                        setFeet(sanitizePositiveInteger(e.target.value, { max: 8 }))
                      }
                    />

                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      value={inch}
                      onKeyDown={blockInvalidIntegerKeyDown}
                      onChange={(e) =>
                        setInch(sanitizePositiveInteger(e.target.value, { max: 11 }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <div className="field-header">
                  <label>
                    Weight <RequiredMark />
                  </label>

                  <div className="unit-switch">
                    <button
                      type="button"
                      className={weightUnit === "kg" ? "active" : ""}
                      onClick={() => changeWeightUnit("kg")}
                    >
                      kg
                    </button>

                    <button
                      type="button"
                      className={weightUnit === "lb" ? "active" : ""}
                      onClick={() => changeWeightUnit("lb")}
                    >
                      lb
                    </button>
                  </div>
                </div>

                {weightUnit === "kg" ? (
                  <div className="input-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={weightKg}
                      onKeyDown={blockInvalidCalculatorNumberKeyDown}
                      onChange={(e) =>
                        setWeightKg(
                          sanitizePositiveDecimal(e.target.value, {
                            maxDecimals: 1,
                            max: 500,
                          })
                        )
                      }
                    />
                    <span>kg</span>
                  </div>
                ) : (
                  <div className="input-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={weightLb}
                      onKeyDown={blockInvalidCalculatorNumberKeyDown}
                      onChange={(e) =>
                        setWeightLb(
                          sanitizePositiveDecimal(e.target.value, {
                            maxDecimals: 1,
                            max: 1100,
                          })
                        )
                      }
                    />
                    <span>lb</span>
                  </div>
                )}
              </div>
            </div>

            {/* BUTTONS */}

            <div className="button-row">
              <button type="button" className="calculate-btn" onClick={calculateBMI}>
                Calculate BMI
              </button>
            </div>

            {/* RESULT */}

            <div className="result-card">
              <div className="result-header">
                <span>YOUR RESULT</span>
                <h3 style={{ color: resultColor }}>{bmi ?? "--"}</h3>
              </div>
              <div className="progress">
                <div className="blue"></div>

                <div className="green"></div>

                <div className="yellow"></div>

                <div className="red"></div>

                {bmi != null ? (
                  <div className="indicator" style={{ left: markerPosition }}></div>
                ) : null}
              </div>
              <h4 style={{ color: resultColor }}>{category || "Enter values and calculate"}</h4>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BMISection;
