import { useState } from "react";
import {
  isValidAge,
  isValidHeight,
  isValidMeasurement,
  isValidFeetInches,
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
  MeasureField,
  bindField,
} from "./calculatorFields.jsx";

const VISCERAL_DESC =
  "Estimate your visceral fat level using key body measurements to understand your abdominal fat and metabolic health.";

const WAIST_CUTOFF = [
  { level: "Good", men: "< 85", women: "< 75" },
  { level: "Caution", men: "85 - 89", women: "75 - 79" },
  { level: "High Risk", men: "≥ 90", women: "≥ 80" },
];

const VISCERAL_RISK = [
  { ratio: "< 0.45", risk: "Excellent", color: "#3B82F6" },
  { ratio: "0.45 - 0.49", risk: "Healthy", color: "#22C55E" },
  { ratio: "0.50 - 0.54", risk: "Early accumulation", color: "#A855F7" },
  { ratio: "0.55 - 0.59", risk: "High visceral fat", color: "#F97316" },
  { ratio: "≥ 0.60", risk: "Very high metabolic risk", color: "#EF4444" },
];

export default function VisceralFatCalculatorModal({ open, onClose }) {
  const [view, setView] = useState("form");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState(28);
  const [heightUnit, setHeightUnit] = useState("cm");
  const [waistUnit, setWaistUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("175");
  const [feet, setFeet] = useState("5");
  const [inch, setInch] = useState("9");
  const [waist, setWaist] = useState("82");
  const [ratio, setRatio] = useState(null);
  const [visceralFat, setVisceralFat] = useState(null);
  const [visceralPercent, setVisceralPercent] = useState(null);
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

  const handleClose = () => {
    setView("form");
    setRatio(null);
    setVisceralFat(null);
    setVisceralPercent(null);
    setErrors({});
    onClose?.();
  };

  const handleBack = () => {
    setView("form");
  };

  const calculate = () => {
    const nextErrors = collectCalculatorErrors([
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
        id: "waist",
        label: "Waist",
        valid: isValidMeasurement(waist, waistUnit),
        hint: waistUnit === "in" ? "Enter waist between 8 and 80 in" : "Enter waist between 20 and 200 cm",
      },
    ]);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const h =
      heightUnit === "cm" ? Number(heightCm) : feetInchesToCm(feet, inch);
    const w = waistUnit === "cm" ? Number(waist) : Number(waist) * 2.54;
    const whtr = w / h;
    setRatio(Number(whtr.toFixed(2)));

    let level =
      gender === "male"
        ? Math.round(whtr * 100 + Number(age) * 0.18 - 30)
        : Math.round(whtr * 100 + Number(age) * 0.15 - 28);
    if (level < 1) level = 1;
    if (level > 30) level = 30;
    setVisceralFat(level);
    setVisceralPercent(Number(((level / 30) * 100).toFixed(0)));
    setView("result");
  };

  return (
    <WellnesspediaModal
      open={open}
      onClose={handleClose}
      title={view === "form" ? "Visceral Fat Calculator" : "Visceral Fat Result"}
      description={VISCERAL_DESC}
      showInfo={view === "form"}
      infoContent={<VisceralInfoPanel />}
      infoLabel="Visceral fat risk reference"
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
            <MeasureField
              label="Waist"
              unit={waistUnit}
              onUnitChange={setWaistUnit}
              value={waist}
              onChange={bindField(setWaist, setErrors, "waist")}
              error={errors.waist}
            />
          </div>
          <button type="button" className="wp-calc-submit" onClick={calculate}>
            Calculate Visceral Fat
          </button>
        </div>
      ) : (
        <div className="wp-calc-result">
          <div className="wp-visceral-result">
            <div className="wp-visceral-metrics">
              <div className="wp-visceral-metric">
                <span>Waist : Height</span>
                <div className="wp-ring wp-ring--sm">
                  <strong>{ratio}</strong>
                </div>
              </div>
              <div className="wp-visceral-metric">
                <span>Est. Visceral Fat</span>
                <div className="wp-ring wp-ring--sm">
                  <strong>{visceralFat}</strong>
                </div>
              </div>
              <div className="wp-visceral-metric">
                <span>Visceral Fat %</span>
                <div className="wp-ring wp-ring--sm">
                  <strong>{visceralPercent}</strong>
                </div>
              </div>
            </div>

            <div className="wp-visceral-tables">
              <div className="wp-ref-table">
                <h4>Waist Cut Off</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Risk Level</th>
                      <th>Men (cm)</th>
                      <th>Women (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WAIST_CUTOFF.map((row) => (
                      <tr key={row.level}>
                        <td>
                          <strong>{row.level}</strong>
                        </td>
                        <td>{row.men}</td>
                        <td>{row.women}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="wp-ref-table">
                <h4>Visceral Fat Risk</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Waist : Height</th>
                      <th>Risk Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VISCERAL_RISK.map((row) => (
                      <tr key={row.ratio}>
                        <td>{row.ratio}</td>
                        <td style={{ color: row.color }}>{row.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <CalcBackButton onClick={handleBack} />
        </div>
      )}
    </WellnesspediaModal>
  );
}
