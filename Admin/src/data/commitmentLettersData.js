const STORAGE_KEY = "ua-commit-letters-v1";

export const FIGMA_LETTER_SEED = [
  { id: "v3", name: "Commitment letter v3", ver: "v3", date: "18 Jul 2026", size: "218 KB", signed: true, live: true },
  { id: "v2", name: "Commitment letter v2", ver: "v2", date: "02 May 2026", size: "204 KB", signed: true, live: false },
  { id: "v1", name: "Commitment letter v1", ver: "v1", date: "14 Feb 2026", size: "196 KB", signed: true, live: false },
  { id: "d1", name: "Commitment letter v4 (draft)", ver: "v4", date: "06 Aug 2026", size: "221 KB", signed: false, live: false },
];

/** Demo seeds keyed by first-name slug so named coaches get Figma data. */
export const COMMITMENT_DEMO_BY_NAME = {
  "anita rao": true,
  "priya nair": true,
  "vikram sethi": true,
};

export function formatLetterDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/**
 * @deprecated Demo Figma seed — never use as a live library fallback.
 * Prefer buildEmptyLibrary() when API/local data is missing.
 */
export function buildSeedLibrary(coachName = "Coach") {
  const letters = FIGMA_LETTER_SEED.map((row) => ({
    ...row,
    by: coachName,
    fileUrl: "",
    previewUrl: "",
  }));
  return {
    liveId: "v3",
    signature: {
      name: coachName,
      drawnOn: "",
      url: "",
      onFile: false,
    },
    letters,
  };
}

export function buildEmptyLibrary(coachName = "Coach") {
  return {
    liveId: null,
    signature: {
      name: coachName,
      drawnOn: "",
      url: "",
      onFile: false,
    },
    letters: [],
  };
}

export function buildLibraryFromApiLetter(coachName, letter = {}) {
  if (!letter?.fileUrl) return buildEmptyLibrary(coachName);
  const verNum = Math.max(1, Number(letter.signedVersion) || 1);
  const ver = `v${verNum}`;
  const signed = Boolean(letter.signed || letter.fileUrl);
  const date = formatLetterDate(letter.signedAt || new Date());
  const row = {
    id: ver,
    name: signed ? `Commitment letter ${ver}` : `Commitment letter ${ver} (draft)`,
    ver,
    date,
    size: letter.fileSizeLabel || "PDF",
    signed,
    live: Boolean(letter.live),
    by: coachName,
    fileUrl: letter.fileUrl || "",
  };
  return {
    liveId: row.live ? row.id : null,
    signature: {
      name: coachName,
      drawnOn: signed ? date : "",
      url: "",
      onFile: signed,
    },
    letters: [row],
  };
}

export function loadCoachLetterLibrary(coachId, coachName, apiLetter) {
  const store = readStore();
  const saved = store[coachId];
  if (saved?.letters) {
    const url = saved.signature?.url || "";
    const letters = Array.isArray(saved.letters) ? saved.letters : [];
    const signedCount = letters.filter((row) => row.signed).length;
    return {
      liveId: saved.liveId ?? null,
      signature: {
        name: saved.signature?.name || coachName,
        drawnOn: saved.signature?.drawnOn || "",
        url,
        // Figma "ON FILE" when an image exists or letters were signed with a signature.
        onFile: Boolean(url) || Boolean(saved.signature?.onFile) || signedCount > 0,
      },
      letters,
    };
  }

  if (apiLetter?.fileUrl) {
    return buildLibraryFromApiLetter(coachName, apiLetter);
  }
  return buildEmptyLibrary(coachName || "Coach");
}

export function saveCoachLetterLibrary(coachId, library) {
  if (!coachId) return;
  const store = readStore();
  store[coachId] = {
    liveId: library.liveId ?? null,
    signature: library.signature || {},
    letters: Array.isArray(library.letters) ? library.letters : [],
  };
  writeStore(store);
}

export function nextLetterVersion(letters = []) {
  let max = 0;
  for (const row of letters) {
    const n = Number(String(row.ver || "").replace(/\D/g, "")) || 0;
    if (n > max) max = n;
  }
  return max + 1;
}

export function letterRowMeta(letter) {
  if (!letter) return "";
  if (letter.signed) return `Signed ${letter.date} · PDF · ${letter.size}`;
  return `Uploaded ${letter.date} · PDF · ${letter.size}`;
}

export function featuredMeta(letter, coachName) {
  if (!letter) return "";
  if (letter.signed) {
    return `Signed ${letter.date} by ${letter.by || coachName} · PDF · ${letter.size}`;
  }
  return `Unsigned · uploaded ${letter.date} · ${letter.size}`;
}

/** @deprecated kept for older imports */
export const COMMITMENT_COACHES = [
  { id: "anita-rao", name: "Anita Rao" },
  { id: "priya-nair", name: "Priya Nair" },
  { id: "vikram-sethi", name: "Vikram Sethi" },
];

export function getCommitmentCoach(id) {
  return COMMITMENT_COACHES.find((c) => c.id === id) ?? { id, name: id };
}

export function getCommitmentData(coachId, fallbackName = "Coach") {
  return buildEmptyLibrary(fallbackName);
}
