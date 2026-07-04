import React, { useMemo, useState } from "react";


import maleImg from "../../site/images/male.png";
import femaleImg from "../../site/images/female.png";

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

  const [weight, setWeight] = useState("");

  const [neck, setNeck] = useState("");

  const [waist, setWaist] = useState("");

  const [hip, setHip] = useState("");

  const [heightUnit, setHeightUnit] = useState("cm");

  const [weightUnit, setWeightUnit] = useState("kg");

  const [measureUnit, setMeasureUnit] = useState("cm");

  const [bodyFat, setBodyFat] = useState(0);

  //------------------------------------------------

  const cm = (value) => {
    if (!value) return 0;

    return measureUnit === "cm" ? Number(value) : Number(value) * 2.54;
  };

  //------------------------------------------------

  const heightInCm = () => {
    if (!height) return 0;

    return heightUnit === "cm" ? Number(height) : Number(height) * 30.48;
  };

  //------------------------------------------------

  const weightKg = () => {
    if (!weight) return 0;

    return weightUnit === "kg" ? Number(weight) : Number(weight) * 0.453592;
  };

  //------------------------------------------------

  const calculateBodyFat = () => {
    const h = heightInCm();

    const n = cm(neck);

    const w = cm(waist);

    const hp = cm(hip);

    if (!h || !n || !w) return;

    let result = 0;

    if (gender === "male") {
      result =
        495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) -
        450;
    } else {
      if (!hp) return;

      result =
        495 /
          (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h)) -
        450;
    }

    setBodyFat(result.toFixed(1));
  };

  //------------------------------------------------

  const leanMass = useMemo(() => {
    if (!bodyFat) return 0;

    return (100 - bodyFat).toFixed(1);
  }, [bodyFat]);

  return (
    <section className="bodyfat-section">
      <div className="container">
        <div className="bodyfat-wrapper">
          {/* LEFT */}

          <div className="bodyfat-left">
            <h2>Body Fat Calculator</h2>

            <div className="bodyfat-form">
              {/* Gender */}

              <div className="form-group">
                <label>Gender</label>

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
                <label>Age</label>

                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              {/* Height */}

              <div className="form-group">
                <label>Height</label>

                <div className="unit-input">
                  <input
                    type="number"
                    placeholder="Height"
                    value={height}
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

              {/* Weight */}

              <div className="form-group">
                <label>Weight</label>

                <div className="unit-input">
                  <input
                    type="number"
                    placeholder="Weight"
                    value={weight}
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

              {/* Neck */}

              <div className="form-group">
                <label>Neck</label>

                <div className="unit-input">
                  <input
                    type="number"
                    placeholder="Neck"
                    value={neck}
                    onChange={(e) => setNeck(e.target.value)}
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
                <label>Waist</label>

                <div className="unit-input">
                  <input
                    type="number"
                    placeholder="Waist"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
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
                  <label>Hip</label>

                  <div className="unit-input">
                    <input
                      type="number"
                      placeholder="Hip"
                      value={hip}
                      onChange={(e) => setHip(e.target.value)}
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

          {/* RIGHT */}

          <div className="bodyfat-right">
            <h5>Reference - Body Fat %</h5>

            <div className="bodyfat-result-wrapper">
              {/* Body Fat */}

              <div className="result-card">
                <h4>Body Fat %</h4>

                <div className="result-circle">
                  <span>{bodyFat ? `${bodyFat}%` : "--"}</span>
                </div>
              </div>

              {/* Lean Mass */}

              <div className="result-card">
                <h4>Lean Muscle %</h4>

                <div className="result-circle">
                  <span>{leanMass ? `${leanMass}%` : "--"}</span>
                </div>
              </div>
            </div>

          

            {/* Classification */}

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

            {/* Information */}

            <div className="bodyfat-info">
              <div className="info-item">
                <strong>Weight</strong>

                <span>{weight ? `${weight} ${weightUnit}` : "--"}</span>
              </div>

              <div className="info-item">
                <strong>Height</strong>

                <span>{height ? `${height} ${heightUnit}` : "--"}</span>
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

              {/* Reference Table */}

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
