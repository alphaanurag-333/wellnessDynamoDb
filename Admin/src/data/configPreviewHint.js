export function previewHintForItem(item) {
  if (item.id === "app-language-disable") {
    return "Toggle Hindi, then open Preview";
  }
  if (item.id === "app-faq" || item.id === "app-medical-questionnaire") {
    return "Edit questions, then open Preview";
  }
  if (item.id === "app-program" || item.id === "app-subscriptions") {
    return "Set pricing, then open Preview";
  }
  if (item.id === "app-gst") {
    return "Set GST percentage and collection, then open Preview";
  }
  if (item.id === "app-consultancy-amount") {
    return "Set consultancy fee and tax, then Publish to save. Preview shows unsaved edits.";
  }
  if (item.id === "app-payment-gateway") {
    return "Pick a gateway, then open Preview";
  }
  if (item.id === "app-measurement-video") {
    return "Set the guide, then open Preview";
  }
  if (item.id === "app-health-progress") {
    return "Add or toggle trackers, then open Preview";
  }
  if (item.id === "app-test-catalog") {
    return "Add tests, then open Preview";
  }
  if (item.id === "feature-flags") {
    return "Toggle flags, then open Preview";
  }
  if (item.id === "common-health-disorders") {
    return "Add or edit disorders, then open Preview";
  }
  if (
    item.id === "web-program-testimonials"
    || item.id === "web-logo"
    || item.id === "common-banner"
    || item.id === "common-champion"
    || item.id === "common-birthday"
    || item.id === "common-transformation"
    || item.id === "common-client-review"
    || item.id === "common-real-people"
    || item.id === "common-voice"
    || item.id === "common-cofounder"
    || item.id === "common-leadership"
    || item.id === "common-wellness-team"
    || item.id === "common-about"
    || item.id === "common-google-review"
    || item.id === "common-dropdowns"
    || item.id === "common-recipes"
    || item.id === "common-yoga"
  ) {
    return "Upload something, then open Preview";
  }
  if (item.id === "web-footer") {
    return "Edit the footer text, then open Preview";
  }
  if (item.id === "web-fs-social") {
    return "Edit the links, then open Preview";
  }
  if (
    item.id === "web-fs-privacy"
    || item.id === "web-fs-tos"
    || item.id === "app-tos"
    || item.id === "web-fs-guidelines"
    || item.id === "web-fs-text"
  ) {
    return "Edit the copy, then open Preview";
  }
  if (item.id === "web-fs-contact") {
    return "Edit the details, then open Preview";
  }
  if (item.id === "web-location") {
    return "Edit the locations, then open Preview";
  }
  if (item.id === "app-dpa" || item.tags?.includes("Text")) {
    return "Edit the copy, then open Preview";
  }
  if (item.upload || item.tags?.includes("Upload")) {
    return "Upload something, then open Preview";
  }
  return "Open Preview before you publish";
}
