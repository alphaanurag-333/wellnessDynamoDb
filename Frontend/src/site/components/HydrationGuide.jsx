import React, { useState, useEffect } from "react";
import { Droplets } from "lucide-react";

const activityLevels = [
  {
    label: "Sedentary (Little or no exercise)",
    factor: 0,
  },
  {
    label: "Lightly Active (1-3 days/week)",
    factor: 0.35,
  },
  {
    label: "Moderately Active (3-5 days/week)",
    factor: 0.7,
  },
  {
    label: "Very Active (6-7 days/week)",
    factor: 1.1,
  },
  {
    label: "Extremely Active (Athlete)",
    factor: 1.5,
  },
];

const seasonAdjustment = {
  Winter: -0.2,
  Spring: 0,
  Summer: 0.6,
  Monsoon: 0.2,
};

const HydrationGuide = () => {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");

  const [weightUnit, setWeightUnit] = useState("kg");
  const [weight, setWeight] = useState("");

  const [season, setSeason] = useState("Summer");

  const [activity, setActivity] = useState(
    activityLevels[0].label
  );

  const [liters, setLiters] = useState(2.7);

  const [cups, setCups] = useState(11.5);

  const [message, setMessage] = useState(
    "Based on standard active lifestyles."
  );

  const calculateHydration = () => {
    if (!weight || Number(weight) <= 0) {
      setLiters(0);
      setCups(0);
      return;
    }

    let weightKg = Number(weight);

    if (weightUnit === "lb") {
      weightKg = weightKg * 0.453592;
    }

    let water = weightKg * 0.033;

    if (gender === "Male") {
      water += 0.2;
    }

    if (gender === "Female") {
      water -= 0.1;
    }

    if (Number(age) > 55) {
      water -= 0.25;
    }

    if (Number(age) < 18) {
      water += 0.15;
    }

    water += seasonAdjustment[season];

    const activityObj = activityLevels.find(
      (item) => item.label === activity
    );

    if (activityObj) {
      water += activityObj.factor;
    }

    if (water < 1.5) water = 1.5;

    const finalWater = Number(water.toFixed(1));

    setLiters(finalWater);

    setCups(Number((finalWater * 4.22675).toFixed(1)));

    if (finalWater < 2) {
      setMessage(
        "Increase hydration throughout the day."
      );
    } else if (finalWater < 3.5) {
      setMessage(
        "Based on standard active lifestyles."
      );
    } else {
      setMessage(
        "High hydration required due to your activity."
      );
    }
  };

  useEffect(() => {
    calculateHydration();
  }, [
    age,
    gender,
    weight,
    season,
    activity,
    weightUnit,
  ]);

  const printResult = () => {
    window.print();
  };

  return (
    <section className="hydration-section">
      <div className="container">

        <div className="hydration-wrapper">

          {/* LEFT */}

          <div className="hydration-form">

            {/* ROW */}

            <div className="form-row">

              <div className="form-group">

                <label>Age</label>

                <input
                  type="number"
                  placeholder="Years"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>Gender</label>

                <select
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value)
                  }
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>

              </div>

            </div>

            {/* ROW */}

            <div className="form-row">

              <div className="form-group">

                <label>
                  Weight ({weightUnit})
                </label>

                <input
                  type="number"
                  placeholder="Weight"
                  value={weight}
                  onChange={(e) =>
                    setWeight(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>Season</label>

                <select
                  value={season}
                  onChange={(e) =>
                    setSeason(e.target.value)
                  }
                >
                  <option>Summer</option>
                  <option>Winter</option>
                  <option>Spring</option>
                  <option>Monsoon</option>
                </select>

              </div>

            </div>

            {/* Activity */}

            <div className="form-group activity-group">

              <label>Activity Level</label>

              <select
                value={activity}
                onChange={(e) =>
                  setActivity(e.target.value)
                }
              >
                {activityLevels.map((item) => (
                  <option
                    key={item.label}
                    value={item.label}
                  >
                    {item.label}
                  </option>
                ))}
              </select>

            </div>

            {/* Weight Unit */}

            <div className="unit-buttons">

              <button
                className={
                  weightUnit === "kg"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setWeightUnit("kg")
                }
              >
                KG
              </button>

              <button
                className={
                  weightUnit === "lb"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setWeightUnit("lb")
                }
              >
                LB
              </button>

            </div>

            {/* Buttons */}

            <div className="button-row">

              <button
                className="calculate-btn"
                onClick={calculateHydration}
              >
                Calculate Daily Goal
              </button>

              {/* <button
                className="print-btn"
                onClick={printResult}
              >
                <Printer size={18} />
              </button> */}

            </div>

          </div>

          {/* RIGHT */}

          <div className="hydration-info">

            <h2>Hydration Guide</h2>

            <p>
              Staying properly hydrated is
              essential for nearly every
              function of your body. Our
              calculator factors in your
              lifestyle and climate to provide
              a personalized hydration target.
            </p>

            <div className="hydration-card">

              <div className="hydration-content">

                <h3>
                  Optimal Hydration
                </h3>

                <span>
                  {message}
                </span>

                <div className="liters">

                  <strong>
                    {liters}
                  </strong>

                  <span>
                    Liters/Day
                  </span>

                </div>

                <small>
                  Approx. {cups} cups
                </small>

              </div>

              <Droplets
                size={82}
                className="drop-icon"
              />

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default HydrationGuide;