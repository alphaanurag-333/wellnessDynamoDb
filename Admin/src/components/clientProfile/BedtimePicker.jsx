import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatBedtime } from "../../data/reflectionData.js";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function getBedtimeMenuRoot() {
  return document.querySelector(".updated-admin") || document.body;
}

function parseTimeValue(value) {
  const [rawH = "22", rawM = "30"] = String(value || "22:30").split(":");
  const hourNum = Number(rawH);
  const minuteNum = Number(rawM);
  const hour = Number.isFinite(hourNum) ? Math.min(23, Math.max(0, hourNum)) : 22;
  const minute = Number.isFinite(minuteNum) ? Math.min(59, Math.max(0, minuteNum)) : 30;
  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

export function BedtimePicker({ value, onChange, disabled, "aria-label": ariaLabel = "Bedtime" }) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const { hour, minute } = parseTimeValue(value);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    function placeMenu() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 6;
      const panelHeight = 220;
      const panelWidth = 168;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8);

      setMenuStyle({
        position: "fixed",
        left,
        width: panelWidth,
        zIndex: 10050,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap, top: "auto" }
          : { top: rect.bottom + gap, bottom: "auto" }),
      });
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const scrollSelected = (listEl) => {
      listEl?.querySelector(".is-selected")?.scrollIntoView({ block: "center" });
    };
    const timer = window.setTimeout(() => {
      scrollSelected(hourListRef.current);
      scrollSelected(minuteListRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, hour, minute]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      const inTrigger = triggerRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function setHour(nextHour) {
    onChange?.(`${nextHour}:${minute}`);
  }

  function setMinute(nextMinute) {
    onChange?.(`${hour}:${nextMinute}`);
  }

  const menu = open && menuStyle
    ? createPortal(
      <div
        ref={menuRef}
        className="ua-cp-reflect-bedtime-menu ua-cp-reflect-bedtime-menu--portal"
        style={menuStyle}
        role="dialog"
        aria-label={`${ariaLabel} picker`}
      >
        <div className="ua-cp-reflect-bedtime-menu__cols">
          <div className="ua-cp-reflect-bedtime-menu__col" role="listbox" aria-label="Hour">
            <ul ref={hourListRef} className="ua-cp-reflect-bedtime-menu__list">
              {HOURS.map((entry) => {
                const selected = entry === hour;
                return (
                  <li key={entry}>
                    <button
                      type="button"
                      className={`ua-cp-reflect-bedtime-menu__item${selected ? " is-selected" : ""}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => setHour(entry)}
                    >
                      {entry}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="ua-cp-reflect-bedtime-menu__col" role="listbox" aria-label="Minute">
            <ul ref={minuteListRef} className="ua-cp-reflect-bedtime-menu__list">
              {MINUTES.map((entry) => {
                const selected = entry === minute;
                return (
                  <li key={entry}>
                    <button
                      type="button"
                      className={`ua-cp-reflect-bedtime-menu__item${selected ? " is-selected" : ""}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => setMinute(entry)}
                    >
                      {entry}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>,
      getBedtimeMenuRoot(),
    )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`ua-cp-reflect-bedtime${open ? " is-open" : ""}`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((current) => !current)}
      >
        <span className="ua-cp-reflect-bedtime__label">Bedtime</span>
        <span className="ua-cp-reflect-bedtime__value">{formatBedtime(value)}</span>
        <span className="ua-cp-reflect-bedtime__chev" aria-hidden="true" />
      </button>
      {menu}
    </>
  );
}
