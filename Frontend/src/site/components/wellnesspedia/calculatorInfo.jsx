export const BMI_INFO_TIERS = [
  { name: "Underweight", range: "< 18.5", color: "#3B82F6", bg: "#DBEAFE" },
  { name: "Normal", range: "18.5 – 24.9", color: "#16A34A", bg: "#DCFCE7" },
  { name: "Overweight", range: "25 – 29.9", color: "#CA8A04", bg: "#FEF9C3" },
  { name: "Obese I", range: "30.0 – 34.9", color: "#EA580C", bg: "#FFEDD5" },
  { name: "Obese II", range: "35.0 – 39.9", color: "#DC2626", bg: "#FED7AA" },
  { name: "Obese III", range: "≥ 40.0", color: "#B91C1C", bg: "#FECACA" },
];

export const BMR_INFO_LEVELS = [
  { name: "Sedentary : little or no exercise", factor: "× 1.2" },
  { name: "Exercise 1 - 3 time/week", factor: "× 1.375" },
  { name: "Exercise 4 - 5 time/week", factor: "× 1.55" },
  { name: "Daily Exercise", factor: "× 1.725" },
  { name: "Intense exercise 6 - 7 times/week", factor: "× 1.9" },
  { name: "Very intense exercise daily", factor: "× 2.1" },
];

export const BODY_FAT_REF = [
  { age: "20 - 39", men: "8 - 19 %", women: "21 - 32 %" },
  { age: "40 - 59", men: "11 - 21 %", women: "23 - 33 %" },
  { age: "60 - 79", men: "13 - 24 %", women: "24 - 35 %" },
];

export const VISCERAL_RISK_INFO = [
  { ratio: "< 0.45", risk: "Excellent" },
  { ratio: "0.45 – 0.49", risk: "Healthy" },
  { ratio: "0.50 – 0.54", risk: "Early accumulation" },
  { ratio: "0.55 – 0.59", risk: "High visceral fat" },
  { ratio: "≥ 0.60", risk: "Very high metabolic risk" },
];

export const WAIST_CUTOFF_INFO = [
  { level: "Good", men: "< 85", women: "< 75" },
  { level: "Caution", men: "85 – 89", women: "75 – 79" },
  { level: "High Risk", men: "≥ 90", women: "≥ 80" },
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

export function VisceralInfoPanel() {
  return (
    <div className="wp-info-panel wp-info-panel--visceral">
      <div className="wp-info-sheet">
        <p className="wp-info-panel__kicker wp-info-panel__kicker--center">
          Visceral Fat Risk
        </p>
        <table className="wp-info-table wp-info-table--lines">
          <thead>
            <tr>
              <th>Waist : Height</th>
              <th>Risk Assessment</th>
            </tr>
          </thead>
          <tbody>
            {VISCERAL_RISK_INFO.map((row) => (
              <tr key={row.ratio}>
                <td>
                  <strong>{row.ratio}</strong>
                </td>
                <td className="is-muted">{row.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="wp-info-sheet">
        <p className="wp-info-panel__kicker wp-info-panel__kicker--center">
          Waist Cut Off
        </p>
        <table className="wp-info-table wp-info-table--lines">
          <thead>
            <tr>
              <th>Risk Level</th>
              <th>Men (cm)</th>
              <th>Women (cm)</th>
            </tr>
          </thead>
          <tbody>
            {WAIST_CUTOFF_INFO.map((row) => (
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
    </div>
  );
}
