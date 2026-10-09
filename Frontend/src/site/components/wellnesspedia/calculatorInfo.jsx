export const BMI_INFO_TIERS = [
  { name: "Underweight", range: "< 18.5", color: "#3B82F6", bg: "#DBEAFE" },
  { name: "Normal", range: "18.5 – 24.9", color: "#16A34A", bg: "#DCFCE7" },
  { name: "Overweight", range: "25 – 29.9", color: "#CA8A04", bg: "#FEF9C3" },
  { name: "Obese I", range: "30.0 – 34.9", color: "#EA580C", bg: "#FFEDD5" },
  { name: "Obese II", range: "35.0 – 39.9", color: "#DC2626", bg: "#FED7AA" },
  { name: "Obese III", range: "≥ 40.0", color: "#B91C1C", bg: "#FECACA" },
];

export const BMR_INFO_LEVELS = [
  { name: "Sedentary: little or no exercise", factor: "× 1.2" },
  { name: "Exercise 1-3 times/week", factor: "× 1.375" },
  { name: "Exercise 4-5 times/week", factor: "× 1.465" },
  { name: "Daily exercise or intense exercise 3-4 times/week", factor: "× 1.55" },
  { name: "Intense exercise 6-7 times/week", factor: "× 1.725" },
  { name: "Very intense exercise daily, or physical job", factor: "× 1.9" },
];

export const BODY_FAT_REF = [
  { age: "20 - 39", men: "8 - 19 %", women: "21 - 32 %" },
  { age: "40 - 59", men: "11 - 21 %", women: "23 - 33 %" },
  { age: "60 - 79", men: "13 - 24 %", women: "24 - 35 %" },
];

export const VISCERAL_FAT_INFO = [
  { label: "Visceral obesity", range: "≥ 130 cm²" },
  { label: "No visceral obesity", range: "< 130 cm²" },
];

export const VISCERAL_BMI_INFO = [
  { label: "Underweight", range: "< 18.5" },
  { label: "Normal weight", range: "18.5 – 24.9" },
  { label: "Overweight", range: "25 – 29.9" },
  { label: "Obesity", range: "≥ 30" },
];

export const VISCERAL_ASIAN_BMI_INFO = [
  { label: "Underweight", range: "< 18.5" },
  { label: "Normal weight", range: "18.5 – 22.9" },
  { label: "Overweight", range: "23 – 27.4" },
  { label: "Obesity", range: "≥ 27.5" },
];

export function BmiInfoPanel() {
  return (
    <div className="wp-info-panel wp-info-panel--bmi">
      <p className="wp-info-panel__kicker">Classification Tiers</p>
      <ul className="wp-info-tiers">
        {BMI_INFO_TIERS.map((tier) => (
          <li
            key={tier.name}
            style={{ background: tier.bg, color: tier.color }}
          >
            <span className="wp-tier-dot" style={{ background: tier.color }} />
            <span className="wp-tier-name">{tier.name}</span>
            <span className="wp-tier-range">{tier.range}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BmrInfoPanel() {
  return (
    <div className="wp-info-panel wp-info-panel--bmr">
      <div className="wp-info-panel__inner">
        <div className="wp-bmr-table-head">
          <span>Activity Levels</span>
          <span>TDEE</span>
        </div>
        <ul className="wp-info-bmr-rows">
          {BMR_INFO_LEVELS.map((row) => (
            <li key={row.name}>
              <span className="wp-bmr-table__name">
                <i className="wp-dot" />
                {row.name}
              </span>
              <strong>{row.factor}</strong>
            </li>
          ))}
        </ul>
        <p className="wp-bmr-note">TDEE - Total Daily Energy Expenditure*</p>
      </div>
    </div>
  );
}

export function BodyFatInfoPanel() {
  return (
    <div className="wp-info-panel wp-info-panel--bodyfat">
      <p className="wp-info-panel__kicker wp-info-panel__kicker--center">
        Reference - Body Fat %
      </p>
      <table className="wp-info-table">
        <thead>
          <tr>
            <th>Age</th>
            <th className="is-accent">Men</th>
            <th>Women</th>
          </tr>
        </thead>
        <tbody>
          {BODY_FAT_REF.map((row) => (
            <tr key={row.age}>
              <td>{row.age}</td>
              <td>{row.men}</td>
              <td>{row.women}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="wp-info-source">
        <i className="wp-info-source__dot" />
        Source: American Journal Of Clinical Nutrition
      </p>
    </div>
  );
}

function InfoRangeTable({ title, rows, rangeHeading }) {
  return (
    <div className="wp-info-sheet">
      <p className="wp-info-panel__kicker wp-info-panel__kicker--center">{title}</p>
      <table className="wp-info-table wp-info-table--lines">
        <thead>
          <tr>
            <th>Category</th>
            <th>{rangeHeading}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>
                <strong>{row.label}</strong>
              </td>
              <td className="is-muted">{row.range}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VisceralInfoPanel() {
  return (
    <div className="wp-info-panel wp-info-panel--visceral">
      <InfoRangeTable
        title="Visceral Fat"
        rows={VISCERAL_FAT_INFO}
        rangeHeading="Area"
      />
      <InfoRangeTable
        title="Body Mass Index"
        rows={VISCERAL_BMI_INFO}
        rangeHeading="kg/m²"
      />
      <InfoRangeTable
        title="BMI in Asian populations"
        rows={VISCERAL_ASIAN_BMI_INFO}
        rangeHeading="kg/m²"
      />
      <p className="wp-info-source">
        <i className="wp-info-source__dot" />
        Source: Samouda et al., Obesity, 2013
      </p>
    </div>
  );
}
