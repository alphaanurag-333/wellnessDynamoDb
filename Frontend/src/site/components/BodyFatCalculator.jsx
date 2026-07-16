import React, { useMemo, useState } from "react";


import maleImg from "../../site/images/male.png";
import femaleImg from "../../site/images/female.png";
import {
  RequiredMark,
  isValidAge,
  isValidHeight,
  isValidWeight,
  isValidMeasurement,
  isValidFeetInches,
  feetInchesToCm,
  cmToFeetInches,
  formatHeightDisplay,
  blockInvalidIntegerKeyDown,
  blockInvalidCalculatorNumberKeyDown,
  sanitizePositiveInteger,
  sanitizePositiveDecimal,
  validateCalculatorFields,
  showCalculatorError,
} from "../utils/calculatorValidation.jsx";

const referenceData = [
  {
    age: "20 - 39",
    men: "8 - 19%",
    women: "21 - 32%",
  },
  {
    age: "40 - 59",
    men: "11 - 21%",
    women: "23 - 33%",
  },
  {
    age: "60 - 79",
    men: "13 - 24%",
    women: "24 - 35%",
  },
];

export default function BodyFatCalculator() {
  const [gender, setGender] = useState("male");

  const [age, setAge] = useState(28);

  const [height, setHeight] = useState("");

  const [feet, setFeet] = useState("");

  const [inch, setInch] = useState("");

  const [weight, setWeight] = useState("");

  const [neck, setNeck] = useState("");

  const [waist, setWaist] = useState("");

  const [hip, setHip] = useState("");

  const [heightUnit, setHeightUnit] = useState("cm");

  const [weightUnit, setWeightUnit] = useState("kg");

  const [measureUnit, setMeasureUnit] = useState("cm");

  const [bodyFat, setBodyFat] = useState(0);

  //------------------------------------------------

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

  //------------------------------------------------

  const cm = (value) => {
    if (!value) return 0;

    return measureUnit === "cm" ? Number(value) : Number(value) * 2.54;
  };

  //------------------------------------------------

  const heightInCm = () => {
    if (heightUnit === "cm") {
      if (!height) return 0;
      return Number(height);
    }
    return feetInchesToCm(feet, inch);
  };

  //------------------------------------------------

  const weightKg = () => {
    if (!weight) return 0;

    return weightUnit === "kg" ? Number(weight) : Number(weight) * 0.453592;
  };

  //------------------------------------------------

  const calculateBodyFat = async () => {
    const checks = [
      { label: "Gender", valid: Boolean(gender) },
      {
        label: "Age",
        valid: isValidAge(age),
        hint: "Age (1–120 years)",
      },
      {
        label: "Height",
        valid:
          heightUnit === "cm"
            ? isValidHeight(height, "cm")
            : isValidFeetInches(feet, inch),
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
      {
        label: "Neck",
        valid: isValidMeasurement(neck, measureUnit),
        hint:
          measureUnit === "in"
            ? "Neck (8–80 in)"
            : "Neck (20–200 cm)",
      },
      {
        label: "Waist",
        valid: isValidMeasurement(waist, measureUnit),
        hint:
          measureUnit === "in"
            ? "Waist (8–80 in)"
            : "Waist (20–200 cm)",
      },
    ];
    if (gender === "female") {
      checks.push({
        label: "Hip",
        valid: isValidMeasurement(hip, measureUnit),
        hint:
          measureUnit === "in"
            ? "Hip (8–80 in)"
            : "Hip (20–200 cm)",
      });
    }

    const ok = await validateCalculatorFields(checks);
    if (!ok) return;

    const h = heightInCm();
    const n = cm(neck);
    const w = cm(waist);
    const hp = cm(hip);

    let result = 0;

    if (gender === "male") {
      result =
        495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) -
        450;
    } else {
      result =
        495 /
          (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h)) -
        450;
    }

    if (!Number.isFinite(result)) {
      await showCalculatorError(
        "Unable to calculate",
        "Check that waist is larger than neck (and hip for women). Measurement values look invalid."
      );
      return;
    }

    setBodyFat(result.toFixed(1));
  };

  //------------------------------------------------

  const leanMass = useMemo(() => {
    if (!bodyFat) return 0;

    return (100 - bodyFat).toFixed(1);
  }, [bodyFat]);

  return (
    <section className="bodyfat-section pt-2 pb-2">
      <div className="container">
        <div className="bodyfat-wrapper">
          {/* LEFT — form */}

          <div className="bodyfat-left">
            <h2>Body Fat Calculator</h2>

            <div className="bodyfat-form">
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

              {/* Height */}

              <div className="form-group">
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

              {/* Weight */}

              <div className="form-group">
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

              {/* Neck */}

              <div className="form-group">
                <label>
                  Neck <RequiredMark />
                </label>

                <div className="unit-input">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Neck"
                    value={neck}
                    min={0}
                    required
                    onKeyDown={blockInvalidCalculatorNumberKeyDown}
                    onChange={(e) =>
                      setNeck(
                        sanitizePositiveDecimal(e.target.value, {
                          maxDecimals: 2,
                          max: measureUnit === "in" ? 80 : 200,
                        })
                      )
                    }
                  />

                  <div className="unit-switch">
                    <button
                      type="button"
                      className={measureUnit === "cm" ? "active" : ""}
                      onClick={() => setMeasureUnit("cm")}
                    >
                      cm
                    </button>

                    <button
                      type="button"
                      className={measureUnit === "in" ? "active" : ""}
                      onClick={() => setMeasureUnit("in")}
                    >
                      in
                    </button>
                  </div>
                </div>
              </div>

              {/* Waist */}

              <div className="form-group">
                <label>
                  Waist <RequiredMark />
                </label>

                <div className="unit-input">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Waist"
                    value={waist}
                    min={0}
                    required
                    onKeyDown={blockInvalidCalculatorNumberKeyDown}
                    onChange={(e) =>
                      setWaist(
                        sanitizePositiveDecimal(e.target.value, {
                          maxDecimals: 2,
                          max: measureUnit === "in" ? 80 : 200,
                        })
                      )
                    }
                  />

                  <div className="unit-switch">
                    <button
                      type="button"
                      className={measureUnit === "cm" ? "active" : ""}
                      onClick={() => setMeasureUnit("cm")}
                    >
                      cm
                    </button>

                    <button
                      type="button"
                      className={measureUnit === "in" ? "active" : ""}
                      onClick={() => setMeasureUnit("in")}
                    >
                      in
                    </button>
                  </div>
                </div>
              </div>

              {gender === "female" && (
                <div className="form-group">
                  <label>
                    Hip <RequiredMark />
                  </label>

                  <div className="unit-input">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Hip"
                      value={hip}
                      min={0}
                      required
                      onKeyDown={blockInvalidCalculatorNumberKeyDown}
                      onChange={(e) =>
                        setHip(
                          sanitizePositiveDecimal(e.target.value, {
                            maxDecimals: 2,
                            max: measureUnit === "in" ? 80 : 200,
                          })
                        )
                      }
                    />

                    <div className="unit-switch">
                      <button
                        type="button"
                        className={measureUnit === "cm" ? "active" : ""}
                        onClick={() => setMeasureUnit("cm")}
                      >
                        cm
                      </button>

                      <button
                        type="button"
                        className={measureUnit === "in" ? "active" : ""}
                        onClick={() => setMeasureUnit("in")}
                      >
                        in
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="calculate-btn"
                onClick={calculateBodyFat}
              >
                Calculate Body Fat %
              </button>
            </div>
          </div>

          {/* MIDDLE — results */}

          <div className="bodyfat-middle">
            <h5>Your Results</h5>

            <div className="bodyfat-result-wrapper">
              <div className="result-card">
                <h4>Body Fat %</h4>

                <div className="result-circle">
                  <span>{bodyFat ? `${bodyFat}%` : "--"}</span>
                </div>
              </div>

              <div className="result-card">
                <h4>Lean Muscle %</h4>

                <div className="result-circle">
                  <span>{leanMass ? `${leanMass}%` : "--"}</span>
                </div>
              </div>
            </div>

            <div className="classification">
              <h4>Your Category</h4>

              <span>
                {!bodyFat
                  ? "--"
                  : gender === "male"
                    ? bodyFat < 6
                      ? "Essential Fat"
                      : bodyFat < 14
                        ? "Athlete"
                        : bodyFat < 18
                          ? "Fitness"
                          : bodyFat < 25
                            ? "Average"
                            : "Obese"
                    : bodyFat < 14
                      ? "Essential Fat"
                      : bodyFat < 21
                        ? "Athlete"
                        : bodyFat < 25
                          ? "Fitness"
                          : bodyFat < 32
                            ? "Average"
                            : "Obese"}
              </span>
            </div>

            <div className="bodyfat-info">
              <div className="info-item">
                <strong>Weight</strong>

                <span>{weight ? `${weight} ${weightUnit}` : "--"}</span>
              </div>

              <div className="info-item">
                <strong>Height</strong>

                <span>
                  {formatHeightDisplay(heightUnit, {
                    heightCm: height,
                    feet,
                    inches: inch,
                  })}
                </span>
              </div>

              <div className="info-item">
                <strong>Gender</strong>

                <span>{gender.charAt(0).toUpperCase() + gender.slice(1)}</span>
              </div>

              <div className="info-item">
                <strong>Age</strong>

                <span>{age} Years</span>
              </div>
            </div>
          </div>

          {/* RIGHT — reference */}

          <div className="bodyfat-right">
            <h5>Reference - Body Fat %</h5>

            <div className="reference-table">
              <div className="reference-header">
                <div>Age</div>

                <div>Men</div>

                <div>Women</div>
              </div>

              {referenceData.map((item, index) => (
                <div className="reference-row" key={index}>
                  <div>{item.age}</div>

                  <div>{item.men}</div>

                  <div>{item.women}</div>
                </div>
              ))}
            </div>

            <p className="reference-note">
              Source : American Journal Of Clinical Nutrition
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
