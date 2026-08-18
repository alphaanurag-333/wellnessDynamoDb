export const CONTACT_DETAILS = [
  { id: "ct-phone", label: "Phone", value: "+91 98200 41100", live: true },
  { id: "ct-support", label: "Support email", value: "care@irwellness.in", live: true },
  { id: "ct-sales", label: "Sales email", value: "hello@irwellness.in", live: true },
  { id: "ct-hours", label: "Support hours", value: "Mon–Sat · 9:00 AM – 8:00 PM IST", live: true },
];

function pageBlock(id, title, text) {
  return {
    id,
    title,
    shown: true,
    webVersion: 1,
    appVersion: 1,
    versions: [
      {
        n: 1,
        date: "",
        author: "Admin",
        text,
      },
    ],
  };
}

export const CONTACT_PAGE_BLOCKS = [
  pageBlock(
    "intro",
    "Get in touch",
    "<p>Reach the IR Wellness care team for programme questions, billing, or coaching support.</p>"
  ),
  pageBlock(
    "hours",
    "When we reply",
    "<p>We typically reply within one business day, Monday to Saturday, 9:00 AM – 8:00 PM IST.</p>"
  ),
];

