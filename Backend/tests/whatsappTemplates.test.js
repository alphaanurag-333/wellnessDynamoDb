const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  NAMED_TEMPLATES,
  SLOT_TEMPLATE_BY_STEP,
  slotTemplateKeyForStep,
  resolveNamedTemplate,
  bhashParams,
  firstName,
  formatInrAmount,
  pwcBookedForLabel,
  sendNamedWhatsAppTemplate,
} = require("../utils/whatsapp");

describe("named WhatsApp templates", () => {
  it("maps each chosen IRW template name", () => {
    assert.equal(NAMED_TEMPLATES.invoice.defaultName, "invoice_irw01");
    assert.equal(NAMED_TEMPLATES.invoice.kind, "document");
    assert.equal(NAMED_TEMPLATES.pwcUser.defaultName, "pwc_user_intim_01");
    assert.equal(NAMED_TEMPLATES.pwcCoach.defaultName, "pwc_initimate_021");
    assert.equal(NAMED_TEMPLATES.programConfirm.defaultName, "ir_prg_confirm_01");
    assert.equal(NAMED_TEMPLATES.uobBa.defaultName, "ir_uob_ba_01");
    assert.equal(NAMED_TEMPLATES.uobBr.defaultName, "ir_uob_br_01");
    assert.equal(NAMED_TEMPLATES.uobCl.defaultName, "ir_uob_cl_01");
    assert.equal(NAMED_TEMPLATES.uobHap.defaultName, "ir_uob_hap_01");
    assert.equal(NAMED_TEMPLATES.uobLaunch.defaultName, "ir_uob_lau_01");
    assert.equal(NAMED_TEMPLATES.uobPiCoach.defaultName, "ir_uob_pi_011");
    assert.equal(NAMED_TEMPLATES.uobPiUser.defaultName, "ir_uob_pi_012");
    assert.equal(NAMED_TEMPLATES.uobReportsBriefing.defaultName, "ir_uob_rb_01");
  });

  it("maps onboarding meeting steps to user templates", () => {
    assert.equal(SLOT_TEMPLATE_BY_STEP.launch, "uobLaunch");
    assert.equal(SLOT_TEMPLATE_BY_STEP.reportsBriefing, "uobReportsBriefing");
    assert.equal(SLOT_TEMPLATE_BY_STEP.hap, "uobHap");
    assert.equal(SLOT_TEMPLATE_BY_STEP.programInitiation, "uobPiUser");
    assert.equal(slotTemplateKeyForStep("launch"), "uobLaunch");
    assert.equal(slotTemplateKeyForStep("rca"), null);
  });

  it("resolves named templates from config defaults", () => {
    const invoice = resolveNamedTemplate("invoice");
    assert.equal(invoice.name, "invoice_irw01");
    assert.equal(invoice.kind, "document");
    assert.equal(resolveNamedTemplate("missing"), null);
  });

  it("builds comma-safe Bhash params and first names", () => {
    assert.equal(bhashParams("Ada Lovelace", "Diabetes, type 2"), "Ada Lovelace,Diabetes  type 2");
    assert.equal(firstName("Ada Lovelace"), "Ada");
    assert.equal(formatInrAmount(4999.4), "4999");
    assert.equal(formatInrAmount("1,200"), "1200");
  });

  it("prefers health concern over date for PWC coach param 3", () => {
    assert.equal(
      pwcBookedForLabel({ healthConcernTitle: "Diabetes", paidAt: "2026-08-27T10:00:00.000Z" }),
      "Diabetes"
    );
    assert.equal(pwcBookedForLabel({}), "today");
  });

  it("does not send an invoice without a real PDF URL", async () => {
    const result = await sendNamedWhatsAppTemplate({
      templateKey: "invoice",
      person: {
        name: "Ada",
        phone: "9876543210",
        phoneCountryCode: "+91",
        whatsappSameAsMobile: true,
      },
      params: ["Ada"],
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, "missing_document_url");
    assert.equal(result.template, "invoice_irw01");
  });

  it("does not fall back to a sample document URL", async () => {
    const { sendWhatsAppText } = require("../utils/whatsapp");
    const result = await sendWhatsAppText({
      toPhoneCountryCode: "+91",
      toPhone: "9754274333",
      message: "receipt",
      purpose: "document",
      attachDocument: true,
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, "missing_document_url");
  });

  it("rejects unknown template keys", async () => {
    const result = await sendNamedWhatsAppTemplate({
      templateKey: "not_a_template",
      person: { phone: "9876543210", phoneCountryCode: "+91", whatsappSameAsMobile: true },
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, "unknown_template");
  });
});
