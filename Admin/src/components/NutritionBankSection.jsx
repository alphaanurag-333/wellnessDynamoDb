import { useState } from "react";
import { formatBottlePrice, parseBottlePrice } from "../data/nutritionBankData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function NutritionBankSection({ items, setItems, onToast }) {
  const [draft, setDraft] = useState({ name: "", pack: "", price: "" });

  function updateItem(id, patch) {
    setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function addItem() {
    const name = draft.name.trim();
    const pack = draft.pack.trim();
    const price = parseBottlePrice(draft.price);
    if (!name || !pack || !price) {
      onToast("Name, pack and bottle price are required");
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: `nb-${Date.now()}`, name, pack, price },
    ]);
    setDraft({ name: "", pack: "", price: "" });
    onToast(`${name} added to the bank`);
  }

  return (
    <Panel
      title="Nutrition bank"
      subtitle="Admin and Support maintain pricing. Coaches pick supplements from this bank for a client."
    >
      <div className="ua-cfg-nb-table-wrap">
        <table className="ua-cfg-nb-table">
          <thead>
            <tr>
              <th>Supplement</th>
              <th>Pack</th>
              <th>Bottle (Rs.)</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    type="text"
                    className="ua-cfg-nb-table__name"
                    value={item.name}
                    aria-label={`Supplement name for ${item.name}`}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="ua-cfg-nb-table__pack"
                    value={item.pack}
                    aria-label={`Pack for ${item.name}`}
                    onChange={(event) => updateItem(item.id, { pack: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="ua-cfg-nb-table__price"
                    value={formatBottlePrice(item.price)}
                    aria-label={`Bottle price for ${item.name}`}
                    onChange={(event) => updateItem(item.id, { price: parseBottlePrice(event.target.value) })}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-nb-table__delete"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => {
                      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                      onToast(`${item.name} removed`);
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ua-cfg-nb-add">
        <input
          type="text"
          className="ua-cfg-nb-add__input"
          placeholder="Supplement name"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <input
          type="text"
          className="ua-cfg-nb-add__input"
          placeholder="Pack · e.g. 60 caps"
          value={draft.pack}
          onChange={(event) => setDraft({ ...draft, pack: event.target.value })}
        />
        <input
          type="text"
          inputMode="numeric"
          className="ua-cfg-nb-add__input ua-cfg-nb-add__input--price"
          placeholder="Bottle (Rs.)"
          value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })}
        />
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addItem}>
          + Add supplement
        </button>
      </div>
    </Panel>
  );
}

export { NUTRITION_BANK } from "../data/nutritionBankData.js";
