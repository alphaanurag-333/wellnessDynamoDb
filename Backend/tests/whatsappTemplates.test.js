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
    assert.equal(NAMED_TEMPLATES.commitLetterInitUser.defaultName, "irw_commit_letter_messtouser");
    assert.equal(
      NAMED_TEMPLATES.commitLetterUpdateWc.defaultName,
      "irw_commit_letter_update_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.commitLetterUpdateWcAwc.defaultName,
      "irw_commit_letter_update_messtowcawc"
    );
    assert.equal(NAMED_TEMPLATES.uobHap.defaultName, "ir_uob_hap_01");
    assert.equal(NAMED_TEMPLATES.uobLaunch.defaultName, "ir_uob_lau_01");
    assert.equal(NAMED_TEMPLATES.uobPiCoach.defaultName, "ir_uob_pi_011");
    assert.equal(NAMED_TEMPLATES.uobPiUser.defaultName, "ir_uob_pi_012");
    assert.equal(NAMED_TEMPLATES.uobReportsBriefing.defaultName, "ir_uob_rb_01");
    assert.equal(
      NAMED_TEMPLATES.uob180SubmitWc.defaultName,
      "irw_bodyana_init_180submit_messtowc_01"
    );
    assert.equal(NAMED_TEMPLATES.uob180SubmitWcAwc.defaultName, "irw_ba_180sub_messtowcawc");
    assert.equal(
      NAMED_TEMPLATES.uob180ReviewUser.defaultName,
      "irw_bodyana_init_180review_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.uob180ReshareUser.defaultName,
      "irw_bodyana_init_180reshare_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.uobInternalParaTestListUser.defaultName,
      "irw_internalpara_testlist_shared_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.uobInternalParaTestReportSubmitWc.defaultName,
      "irw_internalpara_testreport_submit_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.uobInternalParaTestReportSubmitWcAwc.defaultName,
      "irw_internalpara_testreport_submit_messtowcawc"
    );
  });

  it("maps onboarding meeting steps to user templates", () => {
    assert.equal(SLOT_TEMPLATE_BY_STEP.launch, "launchInitWcScheduleMeetUser");
    assert.equal(SLOT_TEMPLATE_BY_STEP.reportsBriefing, "uobReportsBriefing");
    assert.equal(SLOT_TEMPLATE_BY_STEP.hap, "reportBrfHapConfavailUser");
    assert.equal(
      NAMED_TEMPLATES.reportBrfHapConfavailUser.defaultName,
      "irw_reportbrf_hap_confavail_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.hapSchedmeetUserAvailWc.defaultName,
      "irw_hap_schedmeet_useravail_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.hapSchedmeetUserAvailWcAwc.defaultName,
      "irw_hap_schedmeet_useravail_messtowcawc_01"
    );
    assert.equal(
      NAMED_TEMPLATES.hapSchedmeetUserSlotWc.defaultName,
      "irw_hap_schedmeet_userslot_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.hapSchedmeetUserSlotWcAwc.defaultName,
      "irw_hap_schedmeet_userslot_messtowcawc"
    );
    assert.equal(
      NAMED_TEMPLATES.hapSchedmeetMeetInvUser.defaultName,
      "irw_hap_schedmeet_meetinv_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.protocolSetWcScheduleMeetUser.defaultName,
      "irw_protocolset_wc_schemeet_messtouser"
    );
    assert.equal(SLOT_TEMPLATE_BY_STEP.programInitiation, "programInitSchedmeetConfavailUser");
    assert.equal(
      NAMED_TEMPLATES.programInitSchedmeetConfavailUser.defaultName,
      "irw_programinit_schedmeet_confavail_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.programInitSchedmeetUserAvailWc.defaultName,
      "irw_programinit_schedmeet_useravail_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.programInitSchedmeetUserAvailWcAwc.defaultName,
      "irw_programinit_schedmeet_useravail_messtowcawc"
    );
    assert.equal(
      NAMED_TEMPLATES.programInitSchedmeetUserSlotWc.defaultName,
      "irw_programinit_schedmeet_userslot_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.programInitSchedmeetUserSlotWcAwc.defaultName,
      "irw_programinit_schedmeet_userslot_messtowcawc"
    );
    assert.equal(
      NAMED_TEMPLATES.programInitSchedmeetMeetInvUser.defaultName,
      "irw_programinit_schedmeet_meetinv_messtouser"
    );
    assert.equal(slotTemplateKeyForStep("launch"), "launchInitWcScheduleMeetUser");
    assert.equal(
      NAMED_TEMPLATES.launchInitWcScheduleMeetUser.defaultName,
      "irw_launch_init_schedmeet_confavail_messtouser"
    );
    assert.equal(
      NAMED_TEMPLATES.launchInitSchedmeetUserAvailWc.defaultName,
      "irw_launch_init_schedmeet_useravail_messtowc_01"
    );
    assert.equal(
      NAMED_TEMPLATES.launchInitSchedmeetUserAvailWcAwc.defaultName,
      "irw_launch_init_schedmeet_useravail_messtowcawc"
    );
    assert.equal(
      NAMED_TEMPLATES.launchInitSchedmeetUserSlotWc.defaultName,
      "irw_launch_init_schedmeet_userslot_messtowc"
    );
    assert.equal(
      NAMED_TEMPLATES.launchInitSchedmeetUserSlotWcAwc.defaultName,
      "irw_launch_init_schedmeet_userslot_messtowcawc"
    );
    assert.equal(
      NAMED_TEMPLATES.launchInitSchedmeetMeetInvUser.defaultName,
      "irw_launch_init_schedmeet_meetinv_messtouser_01"
    );
    assert.equal(
      NAMED_TEMPLATES.rcaAnalReportUser.defaultName,
      "irw_rca_anal_report_messtouser"
    );
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
