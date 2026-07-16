import React, { useEffect, useMemo, useRef, useState } from "react";
import { ALL_COUNTRIES, dialCodeFromPhonecode } from "./contactFormShared.js";

function matchesCountryFilter(option, query) {
  const trimmed = String(query ?? "").trim().toLowerCase();
  if (!trimmed) return true;

  const dialDigits = option.dial.replace(/\D/g, "");
  const queryDigits = trimmed.replace(/\D/g, "");

  if (queryDigits && dialDigits.includes(queryDigits)) return true;
  if (option.dial.toLowerCase().includes(trimmed)) return true;
  if (option.name.toLowerCase().includes(trimmed)) return true;
  if (option.iso.toLowerCase().includes(trimmed)) return true;

  return false;
}

export default function ContactCountryDialSelect({
  id,
  value,
  onChange,
  disabled = false,
  ariaLabel = "Country code",
}) {
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const wrapperRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const selectedOptionRef = useRef(null);

  const options = useMemo(
    () =>
      ALL_COUNTRIES.map((country) => ({
        iso: country.isoCode,
        name: country.name,
        dial: dialCodeFromPhonecode(country.phonecode),
      })),
    []
  );

  const selected = options.find((option) => option.iso === value) ?? options[0];

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesCountryFilter(option, filterQuery)),
    [options, filterQuery]
  );

  const closeDropdown = () => {
    setOpen(false);
    setFilterQuery("");
  };

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setFilterQuery("");
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || filterQuery || !selectedOptionRef.current || !listRef.current) return;
    selectedOptionRef.current.scrollIntoView({ block: "nearest" });
  }, [open, value, filterQuery]);

  const handleSelect = (iso) => {
    onChange(iso);
    closeDropdown();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (filteredOptions[0]) {
        handleSelect(filteredOptions[0].iso);
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`contact-phone-country-select${open ? " contact-phone-country-select--open" : ""}`}
    >
      <button
        type="button"
        id={id}
        className="contact-phone-country contact-phone-country-trigger"
        onClick={() => {
          if (open) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={selected?.name || "Country code"}
        autoComplete="tel-country-code"
      >
        {selected?.dial}
      </button>

      {open ? (
        <div className="contact-phone-country-panel">
          <input
            ref={searchRef}
            type="text"
            className="contact-phone-country-search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Type code or country"
            aria-label="Search country code"
            inputMode="text"
            autoComplete="off"
          />
          <ul
            ref={listRef}
            className="contact-phone-country-menu"
            role="listbox"
            aria-label={ariaLabel}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.iso === value;
                return (
                  <li key={option.iso} role="presentation">
                    <button
                      type="button"
                      ref={isSelected ? selectedOptionRef : null}
                      className={`contact-phone-country-option${isSelected ? " contact-phone-country-option--selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.iso)}
                    >
                      <span className="contact-phone-country-option__dial">{option.dial}</span>
                      <span className="contact-phone-country-option__name">{option.name}</span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="contact-phone-country-empty" role="presentation">
                No matching country code
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
