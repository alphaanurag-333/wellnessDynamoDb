import {
  RequiredMark,
  blockInvalidIntegerKeyDown,
  blockInvalidCalculatorNumberKeyDown,
  blockNonDecimalBeforeInput,
  blockNonIntegerBeforeInput,
  sanitizePositiveInteger,
  sanitizePositiveDecimal,
} from "../../utils/calculatorValidation.jsx";

/** Clear a field's inline error as soon as the user edits it. */
export function bindField(setter, setErrors, key) {
  return (value) => {
    setter(value);
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
}

function lengthForMax(max, { decimals = 0 } = {}) {
  const whole = String(Math.trunc(Number(max) || 0)).length;
  return decimals > 0 ? whole + 1 + decimals : whole;
}

function applyPaste(event, nextValue) {
  event.preventDefault();
  return nextValue;
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="wp-field__error">{message}</p>;
}

export function GenderToggle({ value, onChange }) {
  return (
    <div className="wp-gender-toggle">
      <button
        type="button"
        className={value === "male" ? "is-active" : ""}
        onClick={() => onChange("male")}
      >
        Male
      </button>
      <button
        type="button"
        className={value === "female" ? "is-active" : ""}
        onClick={() => onChange("female")}
      >
        Female
      </button>
    </div>
  );
}

export function UnitToggle({ value, options, onChange }) {
  return (
    <div className="wp-unit-toggle">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? "is-active" : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AgeField({ value, onChange, error }) {
  return (
    <div className={`wp-field${error ? " is-invalid" : ""}`}>
      <label>
        Age <RequiredMark />
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Years"
        maxLength={3}
        value={value}
        aria-invalid={Boolean(error)}
        onKeyDown={blockInvalidIntegerKeyDown}
        onBeforeInput={blockNonIntegerBeforeInput}
        onPaste={(event) => {
          onChange(applyPaste(event, sanitizePositiveInteger(event.clipboardData.getData("text"), { max: 120 })));
        }}
        onChange={(e) =>
          onChange(sanitizePositiveInteger(e.target.value, { max: 120 }))
        }
      />
      <FieldError message={error} />
    </div>
  );
}

export function HeightField({
  heightUnit,
  onUnitChange,
  heightCm,
  onHeightCm,
  feet,
  onFeet,
  inch,
  onInch,
  error,
}) {
  return (
    <div className={`wp-field${error ? " is-invalid" : ""}`}>
      <div className="wp-field__header">
        <label>
          Height <RequiredMark />
        </label>
        <UnitToggle
          value={heightUnit}
          onChange={onUnitChange}
          options={[
            { value: "cm", label: "cm" },
            { value: "ft", label: "ft/in" },
          ]}
        />
      </div>
      {heightUnit === "cm" ? (
        <div className="wp-input-unit">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={lengthForMax(300, { decimals: 1 })}
            value={heightCm}
            aria-invalid={Boolean(error)}
            onKeyDown={blockInvalidCalculatorNumberKeyDown}
            onBeforeInput={blockNonDecimalBeforeInput}
            onPaste={(event) => {
              onHeightCm(applyPaste(event, sanitizePositiveDecimal(event.clipboardData.getData("text"), { maxDecimals: 1, max: 300 })));
            }}
            onChange={(e) =>
              onHeightCm(
                sanitizePositiveDecimal(e.target.value, {
                  maxDecimals: 1,
                  max: 300,
                })
              )
            }
          />
          <span>cm</span>
        </div>
      ) : (
        <div className="wp-height-feet">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={1}
            value={feet}
            aria-invalid={Boolean(error)}
            onKeyDown={blockInvalidIntegerKeyDown}
            onBeforeInput={blockNonIntegerBeforeInput}
            onPaste={(event) => {
              onFeet(applyPaste(event, sanitizePositiveInteger(event.clipboardData.getData("text"), { max: 8 })));
            }}
            onChange={(e) =>
              onFeet(sanitizePositiveInteger(e.target.value, { max: 8 }))
            }
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={inch}
            aria-invalid={Boolean(error)}
            onKeyDown={blockInvalidIntegerKeyDown}
            onBeforeInput={blockNonIntegerBeforeInput}
            onPaste={(event) => {
              onInch(applyPaste(event, sanitizePositiveInteger(event.clipboardData.getData("text"), { max: 11 })));
            }}
            onChange={(e) =>
              onInch(sanitizePositiveInteger(e.target.value, { max: 11 }))
            }
          />
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}

export function WeightField({ weightUnit, onUnitChange, weight, onWeight, error }) {
  const max = weightUnit === "kg" ? 500 : 1100;
  return (
    <div className={`wp-field${error ? " is-invalid" : ""}`}>
      <div className="wp-field__header">
        <label>
          Weight <RequiredMark />
        </label>
        <UnitToggle
          value={weightUnit}
          onChange={onUnitChange}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lb" },
          ]}
        />
      </div>
      <div className="wp-input-unit">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          maxLength={lengthForMax(max, { decimals: 1 })}
          value={weight}
          aria-invalid={Boolean(error)}
          onKeyDown={blockInvalidCalculatorNumberKeyDown}
          onBeforeInput={blockNonDecimalBeforeInput}
          onPaste={(event) => {
            onWeight(applyPaste(event, sanitizePositiveDecimal(event.clipboardData.getData("text"), { maxDecimals: 1, max })));
          }}
          onChange={(e) =>
            onWeight(
              sanitizePositiveDecimal(e.target.value, {
                maxDecimals: 1,
                max,
              })
            )
          }
        />
        <span>{weightUnit === "kg" ? "kg" : "lb"}</span>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function MeasureField({
  label,
  unit,
  onUnitChange,
  value,
  onChange,
  error,
  unitOptions = [
    { value: "cm", label: "cm" },
    { value: "in", label: "in" },
  ],
}) {
  const max = unit === "in" ? 80 : 200;
  return (
    <div className={`wp-field${error ? " is-invalid" : ""}`}>
      <div className="wp-field__header">
        <label>
          {label} <RequiredMark />
        </label>
        <UnitToggle value={unit} onChange={onUnitChange} options={unitOptions} />
      </div>
      <div className="wp-input-unit">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="--"
          maxLength={lengthForMax(max, { decimals: 1 })}
          value={value}
          aria-invalid={Boolean(error)}
          onKeyDown={blockInvalidCalculatorNumberKeyDown}
          onBeforeInput={blockNonDecimalBeforeInput}
          onPaste={(event) => {
            onChange(applyPaste(event, sanitizePositiveDecimal(event.clipboardData.getData("text"), { maxDecimals: 1, max })));
          }}
          onChange={(e) =>
            onChange(
              sanitizePositiveDecimal(e.target.value, {
                maxDecimals: 1,
                max,
              })
            )
          }
        />
        <span>{unit}</span>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function GenderField({ value, onChange, error }) {
  return (
    <div className={`wp-field${error ? " is-invalid" : ""}`}>
      <label>
        Gender <RequiredMark />
      </label>
      <GenderToggle value={value} onChange={onChange} />
      <FieldError message={error} />
    </div>
  );
}
