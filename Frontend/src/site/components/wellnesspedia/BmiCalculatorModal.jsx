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
  bindGenderSwitch,
} from "./calculatorFields.jsx";

const BMI_DESC =
  "Body Mass Index (BMI) is a simple index of weight-for-height that is commonly used to classify underweight, overweight, and obesity in adults.";

const GAUGE = { cx: 100, cy: 100, r: 80, needleTipY: 22 };
const ARC_SWEEP = Math.PI;

const TIERS = [
  { name: "Underweight", range: "< 18.5", color: "#60A5FA", min: 10, max: 18.5, weight: 42 },
  { name: "Normal", range: "18.5 - 24.9", color: "#22C55E", min: 18.5, max: 25, weight: 42 },
  { name: "Overweight", range: "25 - 29.9", color: "#FBBF24", min: 25, max: 30, weight: 42 },
  { name: "Obese I", range: "30.0 - 34.9", color: "#F97316", min: 30, max: 35, weight: 28 },
  { name: "Obese II", range: "35.0 - 39.9", color: "#EF4444", min: 35, max: 40, weight: 28 },
  { name: "Obese III", range: "≥ 40.0", color: "#B91C1C", min: 40, max: 45, weight: 28 },
];

const GAUGE_ARC_SEGMENTS = buildGaugeArcSegments();

function buildGaugeArcSegments() {
  const totalWeight = TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let cursor = Math.PI;

  return TIERS.map((tier) => {
    const sweep = (tier.weight / totalWeight) * ARC_SWEEP;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    return { ...tier, d: describeGaugeArc(start, end) };
  });
}

function describeGaugeArc(startAngle, endAngle) {
  const { cx, cy, r } = GAUGE;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function classifyBmi(value) {
  for (const tier of TIERS) {
    if (value < tier.max) return tier;
  }
  return TIERS[TIERS.length - 1];
}

function getGaugeArcAngle(bmi) {
  const value = Math.min(Math.max(Number(bmi) || 0, TIERS[0].min), TIERS[TIERS.length - 1].max);
  const totalWeight = TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let cursor = Math.PI;

  for (const tier of TIERS) {
    const sweep = (tier.weight / totalWeight) * ARC_SWEEP;
    if (value < tier.max) {
      const ratio = (value - tier.min) / (tier.max - tier.min);
      return cursor + ratio * sweep;
    }
    cursor += sweep;
  }

  return Math.PI + ARC_SWEEP;
}

function getNeedleRotation(bmi) {
  const angle = getGaugeArcAngle(bmi);
  const { cx, cy, r, needleTipY } = GAUGE;
  const target = Math.atan2(
    cy + r * Math.sin(angle) - cy,
    cx + r * Math.cos(angle) - cx
  );
  const needleBase = Math.atan2(needleTipY - cy, 0);
  return ((target - needleBase) * 180) / Math.PI;
}

export default function BmiCalculatorModal({ open, onClose }) {
  const [view, setView] = useState("form");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [heightCm, setHeightCm] = useState("");
  const [feet, setFeet] = useState("");
  const [inch, setInch] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [bmi, setBmi] = useState(null);
  const [errors, setErrors] = useState({});

  const tier = useMemo(() => (bmi != null ? classifyBmi(bmi) : null), [bmi]);
  const needleRotation = useMemo(
    () => (bmi != null ? getNeedleRotation(bmi) : -90),
    [bmi]
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

  const changeWeightUnit = (unit) => {
    if (unit === weightUnit) return;
    if (unit === "lb") {
      setWeightLb(
        weightKg === "" || weightKg == null
          ? ""
          : Number((Number(weightKg) * 2.20462).toFixed(1))
      );
    } else {
      setWeightKg(
        weightLb === "" || weightLb == null
          ? ""
          : Number((Number(weightLb) / 2.20462).toFixed(1))
      );
    }
    setWeightUnit(unit);
  };

  const handleClose = () => {
    setView("form");
    setGender("male");
    setAge("");
    setHeightUnit("cm");
    setWeightUnit("kg");
    setHeightCm("");
    setFeet("");
    setInch("");
    setWeightKg("");
    setWeightLb("");
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
          <GenderField
              value={gender}
              onChange={bindGenderSwitch(gender, setGender, setErrors, () => {
                setAge("");
                setHeightCm("");
                setFeet("");
                setInch("");
                setWeightKg("");
                setWeightLb("");
              })}
              error={errors.gender}
            />
            <AgeField
              value={age}
              onChange={bindField(setAge, setErrors, "age")}
              error={errors.age}
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
                  {GAUGE_ARC_SEGMENTS.map((segment) => (
                    <path
                      key={segment.name}
                      d={segment.d}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="14"
                      strokeLinecap="butt"
                    />
                  ))}
                  <g transform={`rotate(${needleRotation} ${GAUGE.cx} ${GAUGE.cy})`}>
                    <line
                      x1={GAUGE.cx}
                      y1={GAUGE.cy}
                      x2={GAUGE.cx}
                      y2={GAUGE.needleTipY}
                      stroke="#334155"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx={GAUGE.cx} cy={GAUGE.cy} r="6" fill="#334155" />
                  </g>
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
