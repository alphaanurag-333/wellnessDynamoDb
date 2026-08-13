export const COMMITMENT_COACHES = [
  { id: "anita-rao", name: "Anita Rao" },
  { id: "priya-nair", name: "Priya Nair" },
  { id: "vikram-sethi", name: "Vikram Sethi" },
];

export const COMMITMENT_LETTERS_BY_COACH = {
  "anita-rao": {
    signatureName: "Anita Rao",
    featuredId: "v3",
    letters: [
      { id: "v3", label: "Commitment letter v3", signed: "18 Jul 2026", size: "2.4 MB", status: "signed", live: true },
      { id: "v2", label: "Commitment letter v2", signed: "12 Jun 2026", size: "2.3 MB", status: "signed", live: false },
      { id: "v1", label: "Commitment letter v1", signed: "03 May 2026", size: "2.2 MB", status: "signed", live: false },
      { id: "v4", label: "Commitment letter v4 (draft)", signed: "Uploaded 02 Aug 2026", size: "2.5 MB", status: "draft", live: false },
    ],
  },
  "priya-nair": {
    signatureName: "Priya Nair",
    featuredId: "v2",
    letters: [
      { id: "v2", label: "Commitment letter v2", signed: "15 Jul 2026", size: "2.3 MB", status: "signed", live: true },
      { id: "v1", label: "Commitment letter v1", signed: "01 Jun 2026", size: "2.1 MB", status: "signed", live: false },
    ],
  },
  "vikram-sethi": {
    signatureName: "Vikram Sethi",
    featuredId: "v1",
    letters: [
      { id: "v1", label: "Commitment letter v1", signed: "Uploaded 28 Jul 2026", size: "2.0 MB", status: "draft", live: false },
    ],
  },
};

export function getCommitmentCoach(id) {
  return COMMITMENT_COACHES.find((c) => c.id === id) ?? COMMITMENT_COACHES[0];
}

export function getCommitmentData(coachId) {
  return COMMITMENT_LETTERS_BY_COACH[coachId] ?? COMMITMENT_LETTERS_BY_COACH["anita-rao"];
}
