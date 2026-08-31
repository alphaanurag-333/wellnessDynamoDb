import { useMemo, useState } from "react";
import {
  isValidAge,
  isValidHeight,
  isValidWeight,
  isValidMeasurement,
  isValidFeetInches,
  feetInchesToCm,
  cmToFeetInches,
  collectCalculatorErrors,
} from "../../utils/calculatorValidation.jsx";
import WellnesspediaModal from "./WellnesspediaModal.jsx";
import CalcBackButton from "./CalcBackButton.jsx";
import { BodyFatInfoPanel } from "./calculatorInfo.jsx";
import {
  AgeField,
  GenderField,
  HeightField,
  WeightField,
  MeasureField,
  bindField,
  bindGenderSwitch,
} from "./calculatorFields.jsx";

const BODY_FAT_DESC =
  "Measure your body fat percentage to better understand your body composition and overall health.";

function bodyFatCategory(pct, gender, age) {
  const v = Number(pct);
  if (!Number.isFinite(v)) return "--";
  const male = gender === "male";
  if (age < 40) {
    if (male) {
      if (v < 8) return "Athletes";
      if (v <= 19) return "Fitness";
      if (v <= 24) return "Average";
      return "Obese";
    }
    if (v < 21) return "Athletes";
    if (v <= 32) return "Fitness";
    if (v <= 38) return "Average";
    return "Obese";
  }
  if (male) {
    if (v < 11) return "Athletes";
    if (v <= 21) return "Fitness";
    if (v <= 27) return "Average";
    return "Obese";
  }
  if (v < 23) return "Athletes";
  if (v <= 33) return "Fitness";
  if (v <= 39) return "Average";
  return "Obese";
}

export default function BodyFatCalculatorModal({ open, onClose }) {
  const [view, setView] = useState("form");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [measureUnit, setMeasureUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("");
  const [feet, setFeet] = useState("");
  const [inch, setInch] = useState("");
  const [weight, setWeight] = useState("");
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [bodyFat, setBodyFat] = useState(null);
  const [errors, setErrors] = useState({});

  const leanMass = useMemo(() => {
    if (bodyFat == null) return null;
    return (100 - Number(bodyFat)).toFixed(1);
  }, [bodyFat]);

  const category = useMemo(
    () => (bodyFat != null ? bodyFatCategory(bodyFat, gender, Number(age)) : "--"),
    [bodyFat, gender, age]
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
    setGender("male");
    setAge("");
    setHeightUnit("cm");
    setWeightUnit("kg");
    setMeasureUnit("cm");
    setHeightCm("");
    setFeet("");
    setInch("");
    setWeight("");
    setNeck("");
    setWaist("");
    setHip("");
    setBodyFat(null);
    setErrors({});
    onClose?.();
  };

  const handleBack = () => {
    setView("form");
  };

  const toCm = (value) =>
    !value ? 0 : measureUnit === "cm" ? Number(value) : Number(value) * 2.54;

  const calculate = () => {
    const checks = [
      { id: "gender", label: "Gender", valid: Boolean(gender), hint: "Select gender" },
      { id: "age", label: "Age", valid: isValidAge(age), hint: "Enter age between 1 and 120" },
      {
        id: "height",
        label: "Height",
        valid:
          heightUnit === "cm"
            ? isValidHeight(heightCm, "cm")
            : isValidFeetInches(feet, inch),
        hint: heightUnit === "ft" ? "Enter 1–8 ft and 0–11 in" : "Enter height between 50 and 300 cm",
      },
      {
        id: "weight",
        label: "Weight",
        valid: isValidWeight(weight, weightUnit === "lb" ? "lbs" : "kg"),
        hint: weightUnit === "lb" ? "Enter weight between 22 and 1100 lb" : "Enter weight between 10 and 500 kg",
      },
      {
        id: "neck",
        label: "Neck",
        valid: isValidMeasurement(neck, measureUnit),
        hint: measureUnit === "in" ? "Enter neck between 8 and 80 in" : "Enter neck between 20 and 200 cm",
      },
      {
        id: "waist",
        label: "Waist",
        valid: isValidMeasurement(waist, measureUnit),
        hint: measureUnit === "in" ? "Enter waist between 8 and 80 in" : "Enter waist between 20 and 200 cm",
      },
    ];
    if (gender === "female") {
      checks.push({
        id: "hip",
        label: "Hip",
        valid: isValidMeasurement(hip, measureUnit),
        hint: measureUnit === "in" ? "Enter hip between 8 and 80 in" : "Enter hip between 20 and 200 cm",
      });
    }
    const nextErrors = collectCalculatorErrors(checks);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const h =
      heightUnit === "cm" ? Number(heightCm) : feetInchesToCm(feet, inch);
    const n = toCm(neck);
    const w = toCm(waist);
    const hp = toCm(hip);

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
      setErrors({
        waist: "Waist must be larger than neck (and hip for women).",
      });
      return;
    }

    setErrors({});
    setBodyFat(Number(result.toFixed(1)));
    setView("result");
  };

  const displayHeight =
    heightUnit === "cm"
      ? `${heightCm || "--"} cm`
      : `${feet || "--"}' ${inch || 0}"`;
  const displayWeight = `${weight || "--"} ${weightUnit}`;

  return (
    <WellnesspediaModal
      open={open}
      onClose={handleClose}
      title={view === "form" ? "Body Fat Calculator" : "Body Fat Result"}
      description={BODY_FAT_DESC}
      showInfo={view === "form"}
      infoContent={<BodyFatInfoPanel />}
      infoLabel="Body fat percentage reference"
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
                setWeight("");
                setNeck("");
                setWaist("");
                setHip("");
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
              onUnitChange={setWeightUnit}
              weight={weight}
              onWeight={bindField(setWeight, setErrors, "weight")}
              error={errors.weight}
            />
            <MeasureField
              label="Neck"
              unit={measureUnit}
              onUnitChange={setMeasureUnit}
              value={neck}
              onChange={bindField(setNeck, setErrors, "neck")}
              error={errors.neck}
            />
            <MeasureField
              label="Waist"
              unit={measureUnit}
              onUnitChange={setMeasureUnit}
              value={waist}
              onChange={bindField(setWaist, setErrors, "waist")}
              error={errors.waist}
            />
            {gender === "female" ? (
              <MeasureField
                label="Hip"
                unit={measureUnit}
                onUnitChange={setMeasureUnit}
                value={hip}
                onChange={bindField(setHip, setErrors, "hip")}
                error={errors.hip}
              />
            ) : null}
          </div>
          <button type="button" className="wp-calc-submit" onClick={calculate}>
            Calculate Body Fat %
          </button>
        </div>
      ) : (
        <div className="wp-calc-result">
          <div className="wp-bodyfat-result">
            <div className="wp-bodyfat-result__rings">
              <p className="wp-result-label">Analysis Result</p>
              <div className="wp-ring-pair">
                <div className="wp-ring">
                  <strong>{bodyFat}</strong>
                  <span>Body Fat %</span>
                </div>
                <div className="wp-ring">
                  <strong>{leanMass}</strong>
                  <span>Lean Muscle %</span>
                </div>
              </div>
            </div>
            <div className="wp-bodyfat-result__meta">
              <div className="wp-meta-card wp-meta-card--wide">
                <span>Your Category</span>
                <strong>{category}</strong>
              </div>
              <div className="wp-meta-card">
                <span>Weight</span>
                <strong>{displayWeight}</strong>
              </div>
              <div className="wp-meta-card">
                <span>Height</span>
                <strong>{displayHeight}</strong>
              </div>
              <div className="wp-meta-card">
                <span>Gender</span>
                <strong className="wp-accent-text">
                  {gender === "male" ? "Male" : "Female"}
                </strong>
              </div>
              <div className="wp-meta-card">
                <span>Age</span>
                <strong className="wp-accent-text">{age} Years</strong>
              </div>
            </div>
          </div>
          <CalcBackButton onClick={handleBack} />
        </div>
      )}
    </WellnesspediaModal>
  );
}
