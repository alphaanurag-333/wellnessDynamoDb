import { useMemo, useState } from "react";
import {
  isValidAge,
  isValidHeight,
  isValidWeight,
  isInRange,
  feetInchesToCm,
  cmToFeetInches,
  collectCalculatorErrors,
} from "../../utils/calculatorValidation.jsx";
import WellnesspediaModal from "./WellnesspediaModal.jsx";
import CalcBackButton from "./CalcBackButton.jsx";
import { BmiInfoPanel } from "./calculatorInfo.jsx";
import {
  AgeField,
  GenderField,
  HeightField,
  WeightField,
  bindField,
} from "./calculatorFields.jsx";

const BMI_DESC =
  "Body Mass Index (BMI) is a simple index of weight-for-height that is commonly used to classify underweight, overweight, and obesity in adults.";

const TIERS = [
  { name: "Underweight", range: "< 18.5", color: "#60A5FA", max: 18.5 },
  { name: "Normal", range: "18.5 - 22.9", color: "#22C55E", max: 23 },
  { name: "Overweight", range: "23.0 - 29.9", color: "#FBBF24", max: 30 },
  { name: "Obese I", range: "30.0 - 34.9", color: "#F97316", max: 35 },
  { name: "Obese II", range: "35.0 - 39.9", color: "#EF4444", max: 40 },
  { name: "Obese III", range: "≥ 40.0", color: "#B91C1C", max: Infinity },
];

function classifyBmi(value) {
  for (const tier of TIERS) {
    if (value < tier.max) return tier;
  }
  return TIERS[TIERS.length - 1];
}

function gaugeAngle(bmi) {
  const clamped = Math.min(Math.max(Number(bmi) || 0, 10), 45);
  return ((clamped - 10) / 35) * 180 - 90;
}

export default function BmiCalculatorModal({ open, onClose }) {
  const [view, setView] = useState("form");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("28");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [heightCm, setHeightCm] = useState(175);
  const [feet, setFeet] = useState(5);
  const [inch, setInch] = useState(9);
  const [weightKg, setWeightKg] = useState(70);
  const [weightLb, setWeightLb] = useState(154.3);
  const [bmi, setBmi] = useState(null);
  const [errors, setErrors] = useState({});

  const tier = useMemo(() => (bmi != null ? classifyBmi(bmi) : null), [bmi]);

  const changeHeightUnit = (unit) => {
    if (unit === heightUnit) return;
    if (unit === "ft") {
      const { feet: f, inches: i } = cmToFeetInches(heightCm);
      setFeet(f);
      setInch(i);
    } else {
      const cm = feetInchesToCm(feet, inch);
      setHeightCm(cm ? Math.round(cm) : 175);
    }
    setHeightUnit(unit);
  };

  const changeWeightUnit = (unit) => {
    if (unit === weightUnit) return;
    if (unit === "lb") {
      setWeightLb(Number((Number(weightKg) * 2.20462).toFixed(1)));
    } else {
      setWeightKg(Number((Number(weightLb) / 2.20462).toFixed(1)));
    }
    setWeightUnit(unit);
  };

  const handleClose = () => {
    setView("form");
    setBmi(null);
    setErrors({});
    onClose?.();
  };

  const handleBack = () => {
    setView("form");
  };

  const calculate = () => {
    const heightOk =
      heightUnit === "cm"
        ? isValidHeight(heightCm, "cm")
        : isInRange(feet, 1, 8) && isInRange(inch, 0, 11);
    const weightOk =
      weightUnit === "kg"
        ? isValidWeight(weightKg, "kg")
        : isValidWeight(weightLb, "lbs");

    const nextErrors = collectCalculatorErrors([
      { id: "age", label: "Age", valid: isValidAge(age), hint: "Enter age between 1 and 120" },
      { id: "gender", label: "Gender", valid: Boolean(gender), hint: "Select gender" },
      {
        id: "height",
        label: "Height",
        valid: heightOk,
        hint: heightUnit === "cm" ? "Enter height between 50 and 300 cm" : "Enter 1–8 ft and 0–11 in",
      },
      {
        id: "weight",
        label: "Weight",
        valid: weightOk,
        hint: weightUnit === "kg" ? "Enter weight between 10 and 500 kg" : "Enter weight between 22 and 1100 lb",
      },
    ]);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    let heightM = 0;
    let weight = 0;
    if (heightUnit === "cm") heightM = Number(heightCm) / 100;
    else heightM = (Number(feet) * 12 + Number(inch)) * 0.0254;
    weight = weightUnit === "kg" ? Number(weightKg) : Number(weightLb) * 0.45359237;

    const value = Number((weight / (heightM * heightM)).toFixed(1));
    setBmi(value);
    setView("result");
  };

  return (
    <WellnesspediaModal
      open={open}
      onClose={handleClose}
      title={view === "form" ? "BMI Calculator" : "BMI Result"}
      description={BMI_DESC}
      showInfo={view === "form"}
      infoContent={<BmiInfoPanel />}
      infoLabel="BMI classification tiers"
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
              onUnitChange={changeWeightUnit}
              weight={weightUnit === "kg" ? weightKg : weightLb}
              onWeight={
                weightUnit === "kg"
                  ? bindField(setWeightKg, setErrors, "weight")
                  : bindField(setWeightLb, setErrors, "weight")
              }
              error={errors.weight}
            />
          </div>
          <button type="button" className="wp-calc-submit" onClick={calculate}>
            Calculate BMI
          </button>
        </div>
      ) : (
        <div className="wp-calc-result">
          <div className="wp-bmi-result">
            <div className="wp-bmi-result__gauge-panel">
              <p className="wp-result-label">Analysis Result</p>
              <div className="wp-bmi-gauge">
                <svg viewBox="0 0 200 120" className="wp-bmi-gauge__svg">
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#60A5FA" strokeWidth="14" strokeDasharray="42 210" />
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#22C55E" strokeWidth="14" strokeDasharray="42 210" strokeDashoffset="-42" />
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#FBBF24" strokeWidth="14" strokeDasharray="42 210" strokeDashoffset="-84" />
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#F97316" strokeWidth="14" strokeDasharray="28 210" strokeDashoffset="-126" />
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#EF4444" strokeWidth="14" strokeDasharray="28 210" strokeDashoffset="-154" />
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#B91C1C" strokeWidth="14" strokeDasharray="28 210" strokeDashoffset="-182" />
                  <line
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="35"
                    stroke="#334155"
                    strokeWidth="3"
                    strokeLinecap="round"
                    transform={`rotate(${gaugeAngle(bmi)} 100 100)`}
                  />
                  <circle cx="100" cy="100" r="6" fill="#334155" />
                </svg>
                <p className="wp-bmi-gauge__value" style={{ color: tier?.color }}>
                  BMI = {bmi}
                </p>
              </div>
            </div>
            <div className="wp-bmi-result__tiers">
              <p className="wp-result-label">Classification Tiers</p>
              <ul>
                {TIERS.map((t) => (
                  <li
                    key={t.name}
                    className={tier?.name === t.name ? "is-active" : ""}
                    style={tier?.name === t.name ? { background: `${t.color}22` } : undefined}
                  >
                    <span className="wp-tier-dot" style={{ background: t.color }} />
                    <span className="wp-tier-name">{t.name}</span>
                    <span className="wp-tier-range">{t.range}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <CalcBackButton onClick={handleBack} />
        </div>
      )}
    </WellnesspediaModal>
  );
}
