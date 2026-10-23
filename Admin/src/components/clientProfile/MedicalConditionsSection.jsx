import { useEffect, useMemo, useState } from "react";
import {
  fetchUserMedicalConditions,
  mapApiUserToRow,
  patchUserMedicalConditionsInAppSettings,
  resolveMedicalConditionsInAppEnabled,
} from "../../api/usersApi.js";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

function formatWhen(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function yesNoLabel(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function formatAnswerDisplay(row) {
  const type = String(row?.answerType || "").toLowerCase();

  if (type === "yes_no" || type === "yes_no_text") {
    const answer = yesNoLabel(row?.answer);
    const details = String(row?.details || "").trim();
    if (answer && details) return { primary: answer, secondary: details };
    if (answer) return { primary: answer, secondary: "" };
    if (details) return { primary: details, secondary: "" };
    return { primary: "—", secondary: "" };
  }

  if (type === "date") {
    return { primary: formatDateOnly(row?.date) || "—", secondary: "" };
  }

  if (type === "text") {
    return { primary: String(row?.text || "").trim() || "—", secondary: "" };
  }

  const fallback = String(row?.text || row?.details || row?.date || "").trim();
  const yn = yesNoLabel(row?.answer);
  if (yn && fallback) return { primary: yn, secondary: fallback };
  if (yn) return { primary: yn, secondary: "" };
  return { primary: fallback || "—", secondary: "" };
}

const LEGACY_FIELDS = [
  { key: "hasConditions", label: "Diagnosed medical conditions", detailsKey: "conditionsDetails", sinceKey: "conditionSince" },
  { key: "onMedication", label: "Currently taking medications", detailsKey: "medicationDetails" },
  { key: "pastSurgery", label: "Past surgeries", detailsKey: "surgeryDetails" },
  { key: "hasRestrictions", label: "Activity restrictions or injuries", detailsKey: "restrictionsDetails" },
];

function rowsFromRecord(record) {
  if (!record) return [];

  const answers = Array.isArray(record.answers) ? record.answers : [];
  if (answers.length) {
    return answers.map((row, index) => {
      const display = formatAnswerDisplay(row);
      return {
        id: String(row?.questionId || index),
        question: String(row?.question || `Question ${index + 1}`).trim(),
        primary: display.primary,
        secondary: display.secondary,
        tone: row?.answer === true ? "yes" : row?.answer === false ? "no" : "neutral",
      };
    });
  }

  return LEGACY_FIELDS.map((field) => {
    const answer = record[field.key];
    if (answer === undefined && !record[field.detailsKey] && !(field.sinceKey && record[field.sinceKey])) {
      return null;
    }
    const primary = yesNoLabel(answer) || "—";
    const details = String(record[field.detailsKey] || "").trim();
    const since = field.sinceKey ? String(record[field.sinceKey] || "").trim() : "";
    const secondary = [details, since ? `Since ${formatDateOnly(since) || since}` : ""]
      .filter(Boolean)
      .join(" · ");
    return {
      id: field.key,
      question: field.label,
      primary,
      secondary,
      tone: answer === true ? "yes" : answer === false ? "no" : "neutral",
    };
  }).filter(Boolean);
}

export function MedicalConditionsSection({ user, onToast, onUserUpdated }) {
  const { canEdit } = useClientSectionPermissions("medical");
  const userId = String(user?.id || "").trim();
  const [loading, setLoading] = useState(() => Boolean(userId));
  const [record, setRecord] = useState(null);
  const [inAppEnabled, setInAppEnabled] = useState(() => resolveMedicalConditionsInAppEnabled(user));
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [inAppConfirm, setInAppConfirm] = useState(null);

  useEffect(() => {
    setInAppEnabled(resolveMedicalConditionsInAppEnabled(user));
  }, [user?.medicalConditionsInAppEnabled]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      setRecord(null);
      return undefined;
    }

    setLoading(true);
    fetchUserMedicalConditions(userId)
      .then((data) => {
        if (cancelled) return;
        setRecord(data?.medicalCondition || null);
        if (data?.medicalConditionsInAppEnabled !== undefined) {
          setInAppEnabled(Boolean(data.medicalConditionsInAppEnabled));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setRecord(null);
        onToast?.(error?.message || "Failed to load medical answers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onToast, userId]);

  const rows = useMemo(() => rowsFromRecord(record), [record]);
  const submittedAt = formatWhen(record?.updatedAt || record?.createdAt);

  function requestToggleInApp() {
    if (settingsBusy || !canEdit) return;
    setInAppConfirm({ next: !inAppEnabled });
  }

  async function applyInAppSetting(next) {
    if (!userId) return;
    setSettingsBusy(true);
    try {
      const result = await patchUserMedicalConditionsInAppSettings(userId, { enabled: next });
      setInAppEnabled(result?.enabled ?? next);
      if (result?.user) {
        onUserUpdated?.(mapApiUserToRow(result.user));
      } else {
        onUserUpdated?.({ ...user, medicalConditionsInAppEnabled: next });
      }
      onToast?.(
        result?.message
          || (next
            ? "Medical conditions enabled in the client app"
            : "Medical conditions disabled in the client app"),
      );
    } catch (error) {
      onToast?.(error?.message || "Failed to update medical app setting");
    } finally {
      setSettingsBusy(false);
    }
  }

  const inAppToggle = canEdit ? (
    <div
      className="ua-cp-medical__in-app"
      title={
        inAppEnabled
          ? "Client can view and submit medical conditions in the app"
          : "Medical conditions are hidden from the client app"
      }
    >
      <span className="ua-cp-medical__in-app-label">Lock in App</span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${inAppEnabled ? " ua-toggle--on" : ""}`}
        onClick={requestToggleInApp}
        disabled={settingsBusy}
        aria-pressed={inAppEnabled}
        aria-label="Show medical conditions in client app"
      >
        <span className="ua-toggle__knob" />
      </button>
    </div>
  ) : null;

  return (
    <div className="ua-cp-section ua-cp-medical">
      <div className="ua-cp-medical__head">
        <div className="ua-cp-medical__head-text">
          <h2 className="ua-cp-medical__title">Medical conditions</h2>
          <p className="ua-cp-medical__sub">
            Answers from paid onboarding medical questionnaire
            {submittedAt ? ` · submitted ${submittedAt}` : ""}
            {!inAppEnabled ? " · hidden from client app" : ""}
          </p>
        </div>
        {inAppToggle}
      </div>

      {loading ? (
        <p className="ua-cp-medical__empty">Loading medical answers…</p>
      ) : rows.length ? (
        <div className="ua-cp-medical__list">
          {rows.map((row, index) => (
            <div key={row.id} className="ua-cp-medical__row">
              <span className="ua-cp-medical__num">{index + 1}</span>
              <div className="ua-cp-medical__body">
                <div className="ua-cp-medical__question">{row.question}</div>
                <div className="ua-cp-medical__answer-row">
                  <span className={`ua-cp-medical__answer ua-cp-medical__answer--${row.tone}`}>
                    {row.primary}
                  </span>
                </div>
                {row.secondary ? (
                  <p className="ua-cp-medical__details">{row.secondary}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ua-cp-medical__empty" style={{ textAlign: "center" }}>
          This client has not submitted medical condition answers yet.
        </p>
      )}

      <ConfirmDialog
        open={Boolean(inAppConfirm)}
        tag="Medical conditions"
        title={
          inAppConfirm?.next
            ? "Show medical conditions in the client app?"
            : "Disable medical conditions in the client app?"
        }
        body={
          inAppConfirm?.next
            ? "The client will be able to open and submit the medical questionnaire in the app."
            : "The client will not see the medical questionnaire in the app. Any pending medical onboarding step will be skipped."
        }
        cancelLabel="Cancel"
        confirmLabel={inAppConfirm?.next ? "Enable in app" : "Disable in app"}
        confirmTone={inAppConfirm?.next ? "primary" : "danger"}
        onCancel={() => setInAppConfirm(null)}
        onConfirm={() => {
          const next = inAppConfirm?.next;
          setInAppConfirm(null);
          if (typeof next === "boolean") applyInAppSetting(next);
        }}
      />
    </div>
  );
}
