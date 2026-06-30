import React, { useState, useMemo, useEffect } from "react";

import { Printer, Info } from "lucide-react";

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

  const [bmi, setBmi] = useState(22.9);
  const [category, setCategory] = useState("Healthy Weight");
  const [resultColor, setResultColor] = useState("#22c55e");

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
      BMI CALCULATION
  ------------------------------*/

  const calculateBMI = () => {
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

    if (!height || !weight || height <= 0 || weight <= 0) return;

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
      AUTO CALCULATE
  ------------------------------*/

  useEffect(() => {
    calculateBMI();
  }, [heightCm, feet, inch, weightKg, weightLb, heightUnit, weightUnit]);

  /* -----------------------------
      MARKER POSITION
  ------------------------------*/

  const markerPosition = useMemo(() => {
  let position = 0;

  if (bmi < 18.5) {
    // Blue (0 - 18.5%)
    position = (bmi / 18.5) * 18.5;

  } else if (bmi < 25) {
    // Green (18.5 - 50%)
    position =
      18.5 +
      ((bmi - 18.5) / (25 - 18.5)) * 31.5;

  } else if (bmi < 30) {
    // Yellow (50 - 62.5%)
    position =
      50 +
      ((bmi - 25) / (30 - 25)) * 12.5;

  } else {
    // Red (62.5 - 100%)
    const maxBMI = 40;
    const value = Math.min(bmi, maxBMI);

    position =
      62.5 +
      ((value - 30) / (maxBMI - 30)) * 37.5;
  }

  return `${position}%`;
}, [bmi]);

  const printResult = () => {
    window.print();
  };

  return (
    <section className="bmi-section">
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

          <div className="bmi-right bmi-form">
            <div className="form-row">
              <div className="form-group age">
                <label>Age</label>

                <input
                  type="number"
                  placeholder="Years"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="form-group gender">
                <label>Gender</label>

                <div className="gender-buttons">
                  <button
                    className={gender === "male" ? "active" : ""}
                    onClick={() => setGender("male")}
                  >
                    Male
                  </button>

                  <button
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
                <label>Height</label>

                <div className="unit-switch">
                  <button
                    className={heightUnit === "cm" ? "active" : ""}
                    onClick={() => changeHeightUnit("cm")}
                  >
                    cm
                  </button>

                  <button
                    className={heightUnit === "ft" ? "active" : ""}
                    onClick={() => changeHeightUnit("ft")}
                  >
                    ft/in
                  </button>
                </div>

                {heightUnit === "cm" ? (
                  <div className="input-unit">
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                    <span>cm</span>
                  </div>
                ) : (
                  <div className="height-feet">
                    <input
                      type="number"
                      value={feet}
                      onChange={(e) => setFeet(e.target.value)}
                    />

                    <input
                      type="number"
                      value={inch}
                      onChange={(e) => setInch(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Weight</label>

                <div className="unit-switch">
                  <button
                    className={weightUnit === "kg" ? "active" : ""}
                    onClick={() => changeWeightUnit("kg")}
                  >
                    kg
                  </button>

                  <button
                    className={weightUnit === "lb" ? "active" : ""}
                    onClick={() => changeWeightUnit("lb")}
                  >
                    lb
                  </button>
                </div>

                {weightUnit === "kg" ? (
                  <div className="input-unit">
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                    <span>kg</span>
                  </div>
                ) : (
                  <div className="input-unit">
                    <input
                      type="number"
                      value={weightLb}
                      onChange={(e) => setWeightLb(e.target.value)}
                    />
                    <span>lb</span>
                  </div>
                )}
              </div>
            </div>

            {/* BUTTONS */}

            <div className="button-row">
              <button className="calculate-btn" onClick={calculateBMI}>
                Calculate BMI
              </button>

              {/* <button className="print-btn" onClick={printResult}>
                <Printer size={18} />
                Print
              </button> */}
            </div>

            {/* RESULT */}

            <div className="result-card">
              <div className="result-header">
                <span>YOUR RESULT</span>
                <h3 style={{ color: resultColor }}>{bmi}</h3>{" "}
              </div>
              <div className="progress">
                <div className="blue"></div>

                <div className="green"></div>

                <div className="yellow"></div>

                <div className="red"></div>

                <div
                  className="indicator"
                  style={{ left: markerPosition }}
                ></div>
              </div>
              <h4 style={{ color: resultColor }}>{category}</h4>{" "}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BMISection;
