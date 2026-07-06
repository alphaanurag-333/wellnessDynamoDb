import React, { useMemo, useState } from "react";


import maleImg from "../../site/images/male.png";
import femaleImg from "../../site/images/female.png";

const visceralRisk = [
  {
    ratio: "< 0.45",
    risk: "Excellent",
  },
  {
    ratio: "0.45 - 0.49",
    risk: "Healthy",
  },
  {
    ratio: "0.50 - 0.54",
    risk: "Early Accumulation",
  },
  {
    ratio: "0.55 - 0.59",
    risk: "High Visceral Fat",
  },
  {
    ratio: "≥ 0.60",
    risk: "Very High Metabolic Risk",
  },
];

const waistCutoff = [
  {
    level: "Good",
    men: "< 85",
    women: "< 75",
  },
  {
    level: "Caution",
    men: "85 - 89",
    women: "75 - 79",
  },
  {
    level: "High Risk",
    men: "≥ 90",
    women: "≥ 80",
  },
];

export default function VisceralFatCalculator() {

  const [gender, setGender] = useState("male");

  const [age, setAge] = useState(28);

  const [height, setHeight] = useState("");

  const [waist, setWaist] = useState("");

  const [heightUnit, setHeightUnit] = useState("cm");

  const [waistUnit, setWaistUnit] = useState("cm");

  const [ratio, setRatio] = useState(0);

  const [visceralFat, setVisceralFat] = useState(0);

  const [visceralPercent, setVisceralPercent] = useState(0);

  //------------------------------------

  const heightCM = () => {

    if (!height) return 0;

    if (heightUnit === "cm") return Number(height);

    return Number(height) * 30.48;

  };

  //------------------------------------

  const waistCM = () => {

    if (!waist) return 0;

    if (waistUnit === "cm") return Number(waist);

    return Number(waist) * 2.54;

  };

  //------------------------------------

  const calculate = () => {

    const h = heightCM();

    const w = waistCM();

    if (!h || !w) return;

    const whtr = w / h;

    setRatio(whtr.toFixed(2));

    let level = 0;

    if (gender === "male") {

      level = Math.round(
        (whtr * 100) +
        (age * 0.18) -
        30
      );

    } else {

      level = Math.round(
        (whtr * 100) +
        (age * 0.15) -
        28
      );

    }

    if (level < 1) level = 1;

    if (level > 30) level = 30;
    
    setVisceralFat(level);

    const percent = (
      (level / 30) *
      100
    ).toFixed(1);

    setVisceralPercent(percent);

  };

  //------------------------------------

  const assessment = useMemo(() => {

    if (!ratio) return "--";

    if (ratio < 0.45)
      return "Excellent";

    if (ratio < 0.50)
      return "Healthy";

    if (ratio < 0.55)
      return "Early Accumulation";

    if (ratio < 0.60)
      return "High Visceral Fat";

    return "Very High Risk";

  }, [ratio]);

  //------------------------------------

  return (

    <section className="visceral-section">

      <div className="container">

        <div className="visceral-wrapper">

          {/* LEFT */}

          <div className="visceral-left">

            <h2>
              Visceral Fat Calculator
            </h2>

            <div className="visceral-form">

              {/* Gender */}

              <div className="form-group">

                <label>
                  Gender
                </label>

                <div className="gender-wrapper">

                  <div
                    className={`gender-card ${
                      gender === "male"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setGender("male")
                    }
                  >
                    <img
                      src={maleImg}
                      alt=""
                    />
                  </div>

                  <div
                    className={`gender-card ${
                      gender === "female"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setGender("female")
                    }
                  >
                    <img
                      src={femaleImg}
                      alt=""
                    />
                  </div>

                </div>

              </div>

              {/* Age */}

              <div className="form-group">

                <label>
                  Age
                </label>

                <input
                  type="number"
                  value={age}
                  onChange={(e)=>
                    setAge(e.target.value)
                  }
                />

              </div>

              {/* Height */}

              <div className="form-group">

                <label>
                  Height
                </label>

                <div className="unit-input">

                  <input
                    type="number"
                    placeholder="Height"
                    value={height}
                    onChange={(e)=>
                      setHeight(e.target.value)
                    }
                  />

                  <div className="unit-switch">

                    <button
                      type="button"
                      className={
                        heightUnit==="cm"
                        ?"active":""
                      }
                      onClick={()=>
                        setHeightUnit("cm")
                      }
                    >
                      cm
                    </button>

                    <button
                      type="button"
                      className={
                        heightUnit==="ft"
                        ?"active":""
                      }
                      onClick={()=>
                        setHeightUnit("ft")
                      }
                    >
                      ft
                    </button>

                  </div>

                </div>

              </div>

              {/* Waist */}

              <div className="form-group">

                <label>
                  Waist
                </label>

                <div className="unit-input">

                  <input
                    type="number"
                    placeholder="Waist"
                    value={waist}
                    onChange={(e)=>
                      setWaist(e.target.value)
                    }
                  />

                  <div className="unit-switch">

                    <button
                      type="button"
                      className={
                        waistUnit==="cm"
                        ?"active":""
                      }
                      onClick={()=>
                        setWaistUnit("cm")
                      }
                    >
                      cm
                    </button>

                    <button
                      type="button"
                      className={
                        waistUnit==="in"
                        ?"active":""
                      }
                      onClick={()=>
                        setWaistUnit("in")
                      }
                    >
                      in
                    </button>

                  </div>

                </div>

                <small>
                  Measure around your navel.
                </small>

              </div>

              <button
                className="calculate-btn"
                type="button"
                onClick={calculate}
              >
                Calculate Visceral Fat
              </button>

            </div>

           <div className="visceral-results">
                 <h5>Visceral Fat Analysis</h5>

            {/* RESULT CIRCLES */}

            <div className="visceral-result-wrapper">

              <div className="result-card visceral-card">

                <h4>Waist : Height</h4>

                <div className="result-circle">
                  <span>
                    {ratio || "--"}
                  </span>
                </div>

              </div>

              <div className="result-card visceral-card">

                <h4>Est. Visceral Fat</h4>

                <div className="result-circle">
                  <span>
                    {visceralFat || "--"}
                  </span>
                </div>

              </div>

              <div className="result-card visceral-card">

                <h4>Visceral Fat %</h4>

                <div className="result-circle">
                  <span>
                    {visceralPercent
                      ? `${visceralPercent}%`
                      : "--"}
                  </span>
                </div>

              </div>

            </div>

            {/* CURRENT STATUS */}

            <div className="visceral-status">

              <h4>Your Risk Assessment</h4>

              <span>

                {assessment}

              </span>

            </div>

              {/* SUMMARY */}

            <div className="summary-card">

              <div className="summary-item">

                <strong>
                  Gender
                </strong>

                <span>
                  {gender.charAt(0).toUpperCase() +
                    gender.slice(1)}
                </span>

              </div>

              <div className="summary-item">

                <strong>
                  Age
                </strong>

                <span>
                  {age} Years
                </span>

              </div>

              <div className="summary-item">

                <strong>
                  Height
                </strong>

                <span>

                  {height
                    ? `${height} ${heightUnit}`
                    : "--"}

                </span>

              </div>

              <div className="summary-item">

                <strong>
                  Waist
                </strong>

                <span>

                  {waist
                    ? `${waist} ${waistUnit}`
                    : "--"}

                </span>

              </div>

            </div>

           </div>

          </div>
             

          {/* RIGHT */}

          <div className="visceral-right">

        

            {/* RISK TABLE */}

            <div className="risk-table">

              <h3>
                Visceral Fat Risk
              </h3>

              <div className="risk-header">

                <div>
                  Waist : Height
                </div>

                <div>
                  Risk Assessment
                </div>

              </div>

              {visceralRisk.map((item, index) => (

                <div
                  className="risk-row"
                  key={index}
                >

                  <div>
                    {item.ratio}
                  </div>

                  <div>
                    {item.risk}
                  </div>

                </div>

              ))}

            </div>

            {/* WAIST CUT OFF */}

            <div className="cutoff-table">

              <h3>
                Waist Cut Off
              </h3>

              <div className="cutoff-header">

                <div>
                  Risk Level
                </div>

                <div>
                  Men (cm)
                </div>

                <div>
                  Women (cm)
                </div>

              </div>

              {waistCutoff.map((item, index) => (

                <div
                  className="cutoff-row"
                  key={index}
                >

                  <div>
                    {item.level}
                  </div>

                  <div>
                    {item.men}
                  </div>

                  <div>
                    {item.women}
                  </div>

                </div>

              ))}

            </div>

          

            {/* FOOTER */}

            <div className="visceral-footer">

              <p>

                <strong>Note:</strong> This calculator estimates
                visceral fat using the Waist-to-Height Ratio (WHtR)
                together with age and gender. It provides an
                approximation and should not replace clinical
                measurements such as DEXA, MRI, or CT scans.

              </p>

            </div>

          </div>

        </div>

      </div>

    </section>

  );

}