import { useMemo, useState } from "react";
import {
  isValidAge,
  isValidHeight,
  isValidWeight,
  isValidFeetInches,
  feetInchesToCm,
  cmToFeetInches,
  collectCalculatorErrors,
} from "../../utils/calculatorValidation.jsx";
import WellnesspediaModal from "./WellnesspediaModal.jsx";
import { BmrInfoPanel } from "./calculatorInfo.jsx";
import {
  AgeField,
  GenderField,
  HeightField,
  WeightField,
  bindField,
} from "./calculatorFields.jsx";

const BMR_DESC =
  "Find out your Basal Metabolic Rate (BMR) and understand the number of calories your body needs to function at rest each day.";

const ACTIVITY = [
  { name: "Sedentary : little or no exercise", multiplier: 1.2 },
  { name: "Exercise 1 - 3 time/week", multiplier: 1.375 },
  { name: "Exercise 4 - 5 time/week", multiplier: 1.55 },
  { name: "Daily Exercise", multiplier: 1.725 },
  { name: "Intense exercise 6 - 7 times/week", multiplier: 1.9 },
  { name: "Very intense exercise daily", multiplier: 2.1 },
];

export default function BmrCalculatorModal({ open, onClose }) {
  const [view, setView] = useState("form");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState(28);
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [heightCm, setHeightCm] = useState("175");
  const [feet, setFeet] = useState("5");
  const [inch, setInch] = useState("9");
  const [weight, setWeight] = useState("70");
  const [bmr, setBmr] = useState(0);
  const [errors, setErrors] = useState({});

  const tdee = useMemo(
    () =>
      ACTIVITY.map((item) => ({
        ...item,
        value: bmr ? Math.round(item.multiplier * bmr) : 0,
      })),
    [bmr]
  );

  const changeHeightUnit = (unit) => {
    if (unit === heightUnit) return;
    if (unit === "ft") {
      const { feet: f, inches: i } = cmToFeetInches(heightCm);
      setFeet(f);
      setInch(i);
    } else {
      const cm = feetInchesToCm(feet, inch);
      setHeightCm(cm ? String(Math.round(cm)) : "");
    }
    setHeightUnit(unit);
  };

  const handleClose = () => {
    setView("form");
    setBmr(0);
    setErrors({});
    onClose?.();
  };

  const calculate = () => {
    const heightOk =
      heightUnit === "cm"
        ? isValidHeight(heightCm, "cm")
        : isValidFeetInches(feet, inch);
    const nextErrors = collectCalculatorErrors([
      { id: "gender", label: "Gender", valid: Boolean(gender), hint: "Select gender" },
      { id: "age", label: "Age", valid: isValidAge(age), hint: "Enter age between 1 and 120" },
      {
        id: "height",
        label: "Height",
        valid: heightOk,
        hint: heightUnit === "ft" ? "Enter 1–8 ft and 0–11 in" : "Enter height between 50 and 300 cm",
      },
      {
        id: "weight",
        label: "Weight",
        valid: isValidWeight(weight, weightUnit === "lb" ? "lbs" : "kg"),
        hint: weightUnit === "lb" ? "Enter weight between 22 and 1100 lb" : "Enter weight between 10 and 500 kg",
      },
    ]);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const h =
      heightUnit === "cm" ? Number(heightCm) : feetInchesToCm(feet, inch);
    const w = weightUnit === "kg" ? Number(weight) : Number(weight) * 0.453592;
    let result =
      gender === "male"
        ? 10 * w + 6.25 * h - 5 * Number(age) + 5
        : 10 * w + 6.25 * h - 5 * Number(age) - 161;
    setBmr(Math.round(result));
    setView("result");
  };

  return (
    <WellnesspediaModal
      open={open}
      onClose={handleClose}
      title={view === "form" ? "BMR Calculator" : "BMR Result"}
      description={BMR_DESC}
      showInfo={view === "form"}
      infoContent={<BmrInfoPanel />}
      infoLabel="BMR activity levels and TDEE"
      wide={view === "result"}
      className="wp-calc-modal"
    >
      {view === "form" ? (
        <div className="wp-calc-form">
          <div className="wp-calc-form__grid">
            <AgeField
              value={age}
              onChange={bindField(setAge, setErrors, "age")}
              error={errors.age}
            />
            <GenderField
              value={gender}
              onChange={bindField(setGender, setErrors, "gender")}
              error={errors.gender}
            />
            <HeightField
              heightUnit={heightUnit}
              onUnitChange={changeHeightUnit}
              heightCm={heightCm}
              onHeightCm={bindField(setHeightCm, setErrors, "height")}
              feet={feet}
              onFeet={bindField(setFeet, setErrors, "height")}
              inch={inch}
              onInch={bindField(setInch, setErrors, "height")}
              error={errors.height}
            />
            <WeightField
              weightUnit={weightUnit}
              onUnitChange={setWeightUnit}
              weight={weight}
              onWeight={bindField(setWeight, setErrors, "weight")}
              error={errors.weight}
            />
          </div>
          <button type="button" className="wp-calc-submit" onClick={calculate}>
            Calculate BMR
          </button>
        </div>
      ) : (
        <div className="wp-bmr-result">
          <div className="wp-bmr-result__circle-panel">
            <p className="wp-result-label">Your Daily Baseline</p>
            <div className="wp-bmr-circle">
              <strong>{bmr.toLocaleString()}</strong>
              <span>KCAL / DAY</span>
            </div>
            <p className="wp-bmr-note">TDEE - Total Daily Energy Expenditure*</p>
          </div>
          <div className="wp-bmr-result__table-panel">
            <div className="wp-bmr-table-head">
              <span>Activity Levels</span>
              <span>TDEE</span>
            </div>
            <ul className="wp-bmr-table">
              {tdee.map((row) => (
                <li key={row.name}>
                  <span className="wp-bmr-table__name">
                    <i className="wp-dot" />
                    {row.name}
                  </span>
                  <strong>{row.value.toLocaleString()}</strong>
                </li>
              ))}
            </ul>
            <p className="wp-bmr-note">TDEE - Total Daily Energy Expenditure*</p>
          </div>
        </div>
      )}
    </WellnesspediaModal>
  );
}
