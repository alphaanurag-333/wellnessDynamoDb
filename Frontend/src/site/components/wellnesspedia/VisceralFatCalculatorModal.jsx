import { useState } from "react";
import {
  isValidAge,
  isValidFeetInches,
  isInRange,
  feetInchesToCm,
  cmToFeetInches,
  collectCalculatorErrors,
} from "../../utils/calculatorValidation.jsx";
import WellnesspediaModal from "./WellnesspediaModal.jsx";
import CalcBackButton from "./CalcBackButton.jsx";
import { VisceralInfoPanel } from "./calculatorInfo.jsx";
import {
  AgeField,
  GenderField,
  HeightField,
  WeightField,
  MeasureField,
  bindField,
  bindGenderSwitch,
} from "./calculatorFields.jsx";

const VISCERAL_DESC =
  "Estimate visceral fat area for adults 18 years and older from age, weight, height, waist, and proximal thigh measurements.";

const VAT_OBESITY = 130;
const VAT_SCALE_MAX = 260;

const BMI_GUIDE = [
  { label: "Underweight", detail: "BMI < 18.5 kg/m²", test: (bmi) => bmi < 18.5 },
  { label: "Normal weight", detail: "18.5 ≤ BMI < 25 kg/m²", test: (bmi) => bmi >= 18.5 && bmi < 25 },
  { label: "Overweight", detail: "25 ≤ BMI < 30 kg/m²", test: (bmi) => bmi >= 25 && bmi < 30 },
  { label: "Obesity", detail: "BMI ≥ 30 kg/m²", test: (bmi) => bmi >= 30 },
];

const ASIAN_BMI_GUIDE = [
  { label: "Underweight", detail: "BMI < 18.5 kg/m²", test: (bmi) => bmi < 18.5 },
  { label: "Normal weight", detail: "18.5 ≤ BMI < 23 kg/m²", test: (bmi) => bmi >= 18.5 && bmi < 23 },
  { label: "Overweight", detail: "23 ≤ BMI < 27.5 kg/m²", test: (bmi) => bmi >= 23 && bmi < 27.5 },
  { label: "Obesity", detail: "BMI ≥ 27.5 kg/m²", test: (bmi) => bmi >= 27.5 },
];

function round2(value) {
  return Number(Number(value).toFixed(2));
}

/** Samouda VAT = TAAT − SAAT model (cm²). BMI is kg/m² and is used for women. */
function estimateVisceralFat({ gender, age, weightKg, heightCm, waistCm, thighCm }) {
  const heightM = heightCm / 100;
  const bmiRaw = weightKg / (heightM * heightM);
  const vatRaw =
    gender === "male"
      ? 6 * waistCm - 4.41 * thighCm + 1.19 * age - 213.65
      : 2.15 * waistCm - 3.63 * thighCm + 1.46 * age + 6.22 * bmiRaw - 92.713;

  return { vat: round2(vatRaw), bmi: round2(bmiRaw) };
}

function bmiMarkerPercent(bmi) {
  const value = Number(bmi);
  let pos = 0;
  if (value > 0 && value < 18.5) pos = (value / 18.5) * 10;
  else if (value >= 18.5 && value < 25) pos = 10 + ((value - 18.5) / 6.5) * 10;
  else if (value >= 25 && value < 30) pos = 20 + ((value - 25) / 5) * 10;
  else if (value >= 30) pos = Math.min(40, 30 + ((value - 30) / 10) * 10);
  return (pos / 40) * 100;
}

function vatMarkerPercent(vat) {
  const value = Math.min(Math.max(Number(vat), 0), VAT_SCALE_MAX);
  return (value / VAT_SCALE_MAX) * 100;
}

function matchedLabel(rows, value) {
  return rows.find((row) => row.test(value))?.label ?? "";
}

function ScoreBlock({ title, value, unit, status, risk, marker, segments, ticks }) {
  return (
    <div className="wp-vat-score">
      <p className="wp-vat-score__title">{title}</p>
      <div className={`wp-ring wp-ring--sm ${risk ? "is-risk" : "is-ok"}`}>
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
      <div className="wp-vat-scale" aria-hidden="true">
        <div className="wp-vat-scale__track">
          {segments.map((segment) => (
            <i
              key={segment.key}
              className="wp-vat-scale__seg"
              style={{ background: segment.color, flex: segment.flex }}
            />
          ))}
          <i className="wp-vat-scale__marker" style={{ left: `${marker}%` }} />
        </div>
        <div className="wp-vat-scale__ticks">
          {ticks.map((tick) => (
            <span key={tick.label} style={{ left: `${tick.at}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>
      <p className={`wp-vat-status ${risk ? "is-risk" : "is-ok"}`}>{status}</p>
    </div>
  );
}

function GuideList({ title, rows, value }) {
  return (
    <div>
      <h5>{title}</h5>
      <ul>
        {rows.map((row) => (
          <li key={row.label} className={row.test(value) ? "is-active" : ""}>
            <strong>{row.label}: </strong>
            {row.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VisceralFatCalculatorModal({ open, onClose }) {
  const [view, setView] = useState("form");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [waistUnit, setWaistUnit] = useState("cm");
  const [thighUnit, setThighUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("");
  const [feet, setFeet] = useState("");
  const [inch, setInch] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [waist, setWaist] = useState("");
  const [thigh, setThigh] = useState("");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

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
          : String(Number((Number(weightKg) * 2.20462).toFixed(1)))
      );
    } else {
      setWeightKg(
        weightLb === "" || weightLb == null
          ? ""
          : String(Number((Number(weightLb) / 2.20462).toFixed(1)))
      );
    }
    setWeightUnit(unit);
    setErrors((prev) => {
      if (!prev.weight) return prev;
      const next = { ...prev };
      delete next.weight;
      return next;
    });
  };

  const changeMeasureUnit = (unit, current, value, setUnit, setValue, errorKey) => {
    if (unit === current) return;
    if (value === "" || value == null) {
      setUnit(unit);
    } else if (unit === "in") {
      setValue(String(Math.min(80, Number((Number(value) / 2.54).toFixed(1)))));
      setUnit(unit);
    } else {
      setValue(String(Math.min(200, Number((Number(value) * 2.54).toFixed(1)))));
      setUnit(unit);
    }
    setErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };

  const clearInputs = () => {
    setAge("");
    setHeightCm("");
    setFeet("");
    setInch("");
    setWeightKg("");
    setWeightLb("");
    setWaist("");
    setThigh("");
  };

  const handleClose = () => {
    setView("form");
    setGender("male");
    setAge("");
    setHeightUnit("cm");
    setWeightUnit("kg");
    setWaistUnit("cm");
    setThighUnit("cm");
    clearInputs();
    setResult(null);
    setErrors({});
    onClose?.();
  };

  const calculate = () => {
    const heightValue =
      heightUnit === "cm" ? Number(heightCm) : feetInchesToCm(feet, inch);
    const heightOk =
      heightUnit === "cm"
        ? isInRange(heightCm, 100, 300)
        : isValidFeetInches(feet, inch) && heightValue >= 100 && heightValue <= 300;
    const weightValue =
      weightUnit === "kg" ? Number(weightKg) : Number(weightLb) * 0.45359237;
    const weightOk =
      weightUnit === "kg"
        ? isInRange(weightKg, 10, 300)
        : isInRange(weightLb, 22, 662) && weightValue >= 10 && weightValue <= 300.05;
    const waistOk = waistUnit === "cm" ? isInRange(waist, 10, 200) : isInRange(waist, 4, 80);
    const thighOk = thighUnit === "cm" ? isInRange(thigh, 10, 200) : isInRange(thigh, 4, 80);

    const nextErrors = collectCalculatorErrors([
      { id: "gender", label: "Gender", valid: Boolean(gender), hint: "Select gender" },
      {
        id: "age",
        label: "Age",
        valid: isValidAge(age, { min: 18, max: 100 }),
        hint: "Enter age between 18 and 100",
      },
      {
        id: "weight",
        label: "Weight",
        valid: weightOk,
        hint: weightUnit === "kg" ? "Enter weight between 10 and 300 kg" : "Enter weight between 22 and 661 lb",
      },
      {
        id: "height",
        label: "Height",
        valid: heightOk,
        hint: heightUnit === "ft" ? "Enter 1–3 m (about 3 ft 4 in to 8 ft)" : "Enter height between 100 and 300 cm",
      },
      {
        id: "waist",
        label: "Waist",
        valid: waistOk,
        hint: waistUnit === "in" ? "Enter waist between 4 and 80 in" : "Enter waist between 10 and 200 cm",
      },
      {
        id: "thigh",
        label: "Thigh",
        valid: thighOk,
        hint: thighUnit === "in" ? "Enter thigh between 4 and 80 in" : "Enter thigh between 10 and 200 cm",
      },
    ]);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const waistCm = waistUnit === "cm" ? Number(waist) : Number(waist) * 2.54;
    const thighCm = thighUnit === "cm" ? Number(thigh) : Number(thigh) * 2.54;
    setResult(
      estimateVisceralFat({
        gender,
        age: Number(age),
        weightKg: weightValue,
        heightCm: heightValue,
        waistCm,
        thighCm,
      })
    );
    setView("result");
  };

  const visceralRisk = result != null && result.vat >= VAT_OBESITY;
  const bmiRisk = result != null && result.bmi >= 25;

  return (
    <WellnesspediaModal
      open={open}
      onClose={handleClose}
      title={view === "form" ? "Visceral Fat Calculator" : "Visceral Fat Result"}
      description={VISCERAL_DESC}
      showInfo={view === "form"}
      infoContent={<VisceralInfoPanel />}
      infoLabel="Visceral fat and BMI reference"
      wide={view === "result"}
      className="wp-calc-modal"
    >
      {view === "form" ? (
        <div className="wp-calc-form">
          <div className="wp-calc-form__grid">
            <GenderField
              value={gender}
              onChange={bindGenderSwitch(gender, setGender, setErrors, clearInputs)}
              error={errors.gender}
            />
            <AgeField
              value={age}
              onChange={bindField(setAge, setErrors, "age")}
              error={errors.age}
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
            <MeasureField
              label="Waist circumference"
              unit={waistUnit}
              onUnitChange={(unit) =>
                changeMeasureUnit(unit, waistUnit, waist, setWaistUnit, setWaist, "waist")
              }
              value={waist}
              onChange={bindField(setWaist, setErrors, "waist")}
              error={errors.waist}
            />
            <MeasureField
              label="Thigh circumference"
              unit={thighUnit}
              onUnitChange={(unit) =>
                changeMeasureUnit(unit, thighUnit, thigh, setThighUnit, setThigh, "thigh")
              }
              value={thigh}
              onChange={bindField(setThigh, setErrors, "thigh")}
              error={errors.thigh}
            />
          </div>
          <div className="wp-vat-measure">
            <p>
              <strong>Waist: </strong>
              midway between the lower rib and the iliac crest.
            </p>
            <p>
              <strong>Proximal thigh: </strong>
              tape on the gluteal crease, around the thigh.
            </p>
          </div>
          <button type="button" className="wp-calc-submit" onClick={calculate}>
            Calculate Visceral Fat
          </button>
        </div>
      ) : (
        <div className="wp-calc-result">
          <div className="wp-vat-result">
            <div className="wp-vat-scores">
              <ScoreBlock
                title="Your Visceral Fat"
                value={result.vat.toFixed(2)}
                unit="cm²"
                status={visceralRisk ? "Visceral obesity" : "Absence of visceral obesity"}
                risk={visceralRisk}
                marker={vatMarkerPercent(result.vat)}
                segments={[
                  { key: "low", color: "#60a5fa", flex: 1 },
                  { key: "high", color: "#ef4444", flex: 1 },
                ]}
                ticks={[
                  { label: "< 130", at: 25 },
                  { label: "≥ 130", at: 75 },
                ]}
              />
              <ScoreBlock
                title="Your Body Mass Index"
                value={result.bmi.toFixed(2)}
                unit="kg/m²"
                status={matchedLabel(BMI_GUIDE, result.bmi)}
                risk={bmiRisk}
                marker={bmiMarkerPercent(result.bmi)}
                segments={[
                  { key: "under", color: "#facc15", flex: 1 },
                  { key: "normal", color: "#60a5fa", flex: 1 },
                  { key: "over", color: "#fb923c", flex: 1 },
                  { key: "obese", color: "#ef4444", flex: 1 },
                ]}
                ticks={[
                  { label: "18.50", at: 25 },
                  { label: "25.00", at: 50 },
                  { label: "30.00", at: 75 },
                ]}
              />
            </div>
            <div className="wp-vat-interpret">
              <h4>Interpret your results</h4>
              <GuideList
                title="Visceral Fat"
                rows={[
                  {
                    label: "Visceral obesity",
                    detail: "Visceral fat ≥ 130 cm²",
                    test: (vat) => vat >= VAT_OBESITY,
                  },
                  {
                    label: "Absence of visceral obesity",
                    detail: "Visceral fat < 130 cm²",
                    test: (vat) => vat < VAT_OBESITY,
                  },
                ]}
                value={result.vat}
              />
              <GuideList title="Body Mass Index" rows={BMI_GUIDE} value={result.bmi} />
              <GuideList title="BMI in Asian populations" rows={ASIAN_BMI_GUIDE} value={result.bmi} />
            </div>
          </div>
          <CalcBackButton onClick={() => setView("form")} />
        </div>
      )}
    </WellnesspediaModal>
  );
}
