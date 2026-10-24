require("dotenv").config();

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;

function str(name, fallback = "") {
  const value = process.env[name];
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") return fallback;
  return String(value).trim() === "true";
}

function num(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cronEnabled(name) {
  if (process.env[name] === "true") return true;
  if (process.env[name] === "false") return false;
  return nodeEnv === "production";
}

module.exports = {
  port: num("PORT", 5000),
  nodeEnv,
  /** JSON / urlencoded body cap. Word-paste legal pages often exceed Express default 100kb. */
  jsonBodyLimit: str("JSON_BODY_LIMIT", "5mb"),

  jwtSecret,
  jwtExpiresIn: str("JWT_EXPIRES_IN", "1h"),
  jwtRefreshSecret: str("JWT_REFRESH_SECRET", jwtSecret),
  jwtRefreshExpiresIn: str("JWT_REFRESH_EXPIRES_IN", "7d"),
  jwtResetPasswordSecret: str("JWT_RESET_PASSWORD_SECRET", jwtSecret),
  jwtResetPasswordExpiresIn: str("JWT_RESET_PASSWORD_EXPIRES_IN", "1h"),
  jwtVerifyEmailSecret: str("JWT_VERIFY_EMAIL_SECRET", jwtSecret),
  jwtVerifyEmailExpiresIn: str("JWT_VERIFY_EMAIL_EXPIRES_IN", "1h"),
  jwtMfaExpiresIn: str("JWT_MFA_EXPIRES_IN", "5m"),

  adminRegistrationEnabled: bool("ADMIN_REGISTRATION_ENABLED"),

  exposeOtpInResponse: bool("EXPOSE_OTP_IN_RESPONSE"),
  otpLength: num("OTP_LENGTH", 6),
  otpExpiresMinutes: num("OTP_EXPIRES_MINUTES", 1),
  /** Max OTP sends for login/register before cooldown (default: 3). */
  otpMaxSendsBeforeCooldown: num("OTP_MAX_SENDS_BEFORE_COOLDOWN", 3),
  /** Cooldown after max OTP sends, in minutes (default: 10). */
  otpCooldownMinutes: num("OTP_COOLDOWN_MINUTES", 10),
  totpIssuer: str("TOTP_ISSUER", "Wellness Admin"),
  totpMaxFailedAttempts: num("TOTP_MAX_FAILED_ATTEMPTS", 5),

  awsRegion: str("AWS_REGION", "ap-south-1"),
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  dynamodbSkipVerify: bool("DYNAMODB_SKIP_VERIFY"),
  awsS3Region: str("AWS_S3_REGION", str("AWS_REGION", "ap-south-1")),
  awsS3BucketName: process.env.AWS_S3_BUCKET_NAME,
  awsS3PublicBaseUrl: str("AWS_S3_PUBLIC_BASE_URL"),

  firebaseServiceAccountPath: str("FIREBASE_SERVICE_ACCOUNT_PATH"),
  /** Shared secret for POST /api/internal/cron/* (use host crontab / EventBridge if in-process cron is off). */
  internalCronSecret: str("INTERNAL_CRON_SECRET"),

  zoomAccountId: str("ZOOM_ACCOUNT_ID"),
  zoomClientId: str("ZOOM_CLIENT_ID"),
  zoomClientSecret: str("ZOOM_CLIENT_SECRET"),
  zoomUserId: str("ZOOM_USER_ID", "me"),

  bhashsmsUser: str("BHASHSMS_USER"),
  bhashsmsPass: str("BHASHSMS_PASS"),
  bhashsmsSender: str("BHASHSMS_SENDER", "BUZWAP"),
  bhashsmsBaseUrl: str("BHASHSMS_BASE_URL", "http://bhashsms.com/api/sendmsgutil.php"),
  bhashsmsAuthBaseUrl: str("BHASHSMS_AUTH_BASE_URL", "http://bhashsms.com/api/sendmsg.php"),
  bhashsmsOtpTemplate: str("BHASHSMS_OTP_TEMPLATE", "otp_auth_irw"),
  bhashsmsTemplate: str("BHASHSMS_TEMPLATE", "invoice_irw01"),
  bhashsmsInvoiceTemplate: str("BHASHSMS_INVOICE_TEMPLATE", str("BHASHSMS_TEMPLATE", "invoice_irw01")),
  bhashsmsTemplateParams: str("BHASHSMS_TEMPLATE_PARAMS", "1"),
  bhashsmsReminderTemplate: str("BHASHSMS_REMINDER_TEMPLATE"),
  bhashsmsOnboardingReminderTemplate: str("BHASHSMS_ONBOARDING_REMINDER_TEMPLATE", "gen_rem01"),
  bhashsmsPwcUserTemplate: str("BHASHSMS_PWC_USER_TEMPLATE", "pwc_user_intim_01"),
  bhashsmsPwcCoachTemplate: str("BHASHSMS_PWC_COACH_TEMPLATE", "pwc_initimate_021"),
  bhashsmsProgramConfirmTemplate: str("BHASHSMS_PROGRAM_CONFIRM_TEMPLATE", "ir_prg_confirm_01"),
  bhashsmsUobBaTemplate: str("BHASHSMS_UOB_BA_TEMPLATE", "ir_uob_ba_01"),
  bhashsmsUobBrTemplate: str("BHASHSMS_UOB_BR_TEMPLATE", "ir_uob_br_01"),
  bhashsmsUobClTemplate: str("BHASHSMS_UOB_CL_TEMPLATE", "ir_uob_cl_01"),
  bhashsmsCommitLetterUserTemplate: str(
    "BHASHSMS_COMMIT_LETTER_USER_TEMPLATE",
    "irw_commit_letter_messtouser"
  ),
  bhashsmsCommitLetterUpdateWcTemplate: str(
    "BHASHSMS_COMMIT_LETTER_UPDATE_WC_TEMPLATE",
    "irw_commit_letter_update_messtowc"
  ),
  bhashsmsCommitLetterUpdateWcAwcTemplate: str(
    "BHASHSMS_COMMIT_LETTER_UPDATE_WC_AWC_TEMPLATE",
    "irw_commit_letter_update_messtowcawc"
  ),
  bhashsmsUobHapTemplate: str("BHASHSMS_UOB_HAP_TEMPLATE", "ir_uob_hap_01"),
  bhashsmsReportBrfHapConfavailUserTemplate: str(
    "BHASHSMS_REPORTBRF_HAP_CONFAVAIL_USER_TEMPLATE",
    "irw_reportbrf_hap_confavail_messtouser"
  ),
  bhashsmsUobLauTemplate: str("BHASHSMS_UOB_LAU_TEMPLATE", "ir_uob_lau_01"),
  bhashsmsLaunchInitWcScheduleMeetUserTemplate: str(
    "BHASHSMS_LAUNCH_INIT_WC_SCHEDULE_MEET_USER_TEMPLATE",
    "irw_launch_init_schedmeet_confavail_messtouser"
  ),
  bhashsmsLaunchInitSchedmeetUserAvailWcTemplate: str(
    "BHASHSMS_LAUNCH_INIT_SCHEDMEET_USERAVAIL_WC_TEMPLATE",
    "irw_launch_init_schedmeet_useravail_messtowc_01"
  ),
  bhashsmsLaunchInitSchedmeetUserAvailWcAwcTemplate: str(
    "BHASHSMS_LAUNCH_INIT_SCHEDMEET_USERAVAIL_WC_AWC_TEMPLATE",
    "irw_launch_init_schedmeet_useravail_messtowcawc"
  ),
  bhashsmsLaunchInitSchedmeetUserSlotWcTemplate: str(
    "BHASHSMS_LAUNCH_INIT_SCHEDMEET_USERSLOT_WC_TEMPLATE",
    "irw_launch_init_schedmeet_userslot_messtowc"
  ),
  bhashsmsLaunchInitSchedmeetUserSlotWcAwcTemplate: str(
    "BHASHSMS_LAUNCH_INIT_SCHEDMEET_USERSLOT_WC_AWC_TEMPLATE",
    "irw_launch_init_schedmeet_userslot_messtowcawc"
  ),
  bhashsmsLaunchInitSchedmeetMeetInvUserTemplate: str(
    "BHASHSMS_LAUNCH_INIT_SCHEDMEET_MEETINV_USER_TEMPLATE",
    "irw_launch_init_schedmeet_meetinv_messtouser_01"
  ),
  bhashsmsRcaAnalReportUserTemplate: str(
    "BHASHSMS_RCA_ANAL_REPORT_USER_TEMPLATE",
    "irw_rca_anal_report_messtouser"
  ),
  bhashsmsHapSchedmeetUserAvailWcTemplate: str(
    "BHASHSMS_HAP_SCHEDMEET_USERAVAIL_WC_TEMPLATE",
    "irw_hap_schedmeet_useravail_messtowc"
  ),
  bhashsmsHapSchedmeetUserAvailWcAwcTemplate: str(
    "BHASHSMS_HAP_SCHEDMEET_USERAVAIL_WC_AWC_TEMPLATE",
    "irw_hap_schedmeet_useravail_messtowcawc_01"
  ),
  bhashsmsHapSchedmeetUserSlotWcTemplate: str(
    "BHASHSMS_HAP_SCHEDMEET_USERSLOT_WC_TEMPLATE",
    "irw_hap_schedmeet_userslot_messtowc"
  ),
  bhashsmsHapSchedmeetUserSlotWcAwcTemplate: str(
    "BHASHSMS_HAP_SCHEDMEET_USERSLOT_WC_AWC_TEMPLATE",
    "irw_hap_schedmeet_userslot_messtowcawc"
  ),
  bhashsmsHapSchedmeetMeetInvUserTemplate: str(
    "BHASHSMS_HAP_SCHEDMEET_MEETINV_USER_TEMPLATE",
    "irw_hap_schedmeet_meetinv_messtouser"
  ),
  bhashsmsProtocolSetWcScheduleMeetUserTemplate: str(
    "BHASHSMS_PROTOCOLSET_WC_SCHEDULE_MEET_USER_TEMPLATE",
    "irw_protocolset_wc_schemeet_messtouser"
  ),
  bhashsmsUobPiCoachTemplate: str("BHASHSMS_UOB_PI_COACH_TEMPLATE", "ir_uob_pi_011"),
  bhashsmsUobPiUserTemplate: str("BHASHSMS_UOB_PI_USER_TEMPLATE", "ir_uob_pi_012"),
  bhashsmsProgramInitSchedmeetConfavailUserTemplate: str(
    "BHASHSMS_PROGRAMINIT_SCHEDMEET_CONFAVAIL_USER_TEMPLATE",
    "irw_programinit_schedmeet_confavail_messtouser"
  ),
  bhashsmsProgramInitSchedmeetUserAvailWcTemplate: str(
    "BHASHSMS_PROGRAMINIT_SCHEDMEET_USERAVAIL_WC_TEMPLATE",
    "irw_programinit_schedmeet_useravail_messtowc"
  ),
  bhashsmsProgramInitSchedmeetUserAvailWcAwcTemplate: str(
    "BHASHSMS_PROGRAMINIT_SCHEDMEET_USERAVAIL_WC_AWC_TEMPLATE",
    "irw_programinit_schedmeet_useravail_messtowcawc"
  ),
  bhashsmsProgramInitSchedmeetUserSlotWcTemplate: str(
    "BHASHSMS_PROGRAMINIT_SCHEDMEET_USERSLOT_WC_TEMPLATE",
    "irw_programinit_schedmeet_userslot_messtowc"
  ),
  bhashsmsProgramInitSchedmeetUserSlotWcAwcTemplate: str(
    "BHASHSMS_PROGRAMINIT_SCHEDMEET_USERSLOT_WC_AWC_TEMPLATE",
    "irw_programinit_schedmeet_userslot_messtowcawc"
  ),
  bhashsmsProgramInitSchedmeetMeetInvUserTemplate: str(
    "BHASHSMS_PROGRAMINIT_SCHEDMEET_MEETINV_USER_TEMPLATE",
    "irw_programinit_schedmeet_meetinv_messtouser"
  ),
  bhashsmsUobRbTemplate: str("BHASHSMS_UOB_RB_TEMPLATE", "ir_uob_rb_01"),
  bhashsmsUob180SubmitWcTemplate: str(
    "BHASHSMS_UOB_180_SUBMIT_WC_TEMPLATE",
    "irw_bodyana_init_180submit_messtowc_01"
  ),
  bhashsmsUob180SubmitWcAwcTemplate: str(
    "BHASHSMS_UOB_180_SUBMIT_WC_AWC_TEMPLATE",
    "irw_ba_180sub_messtowcawc"
  ),
  bhashsmsUob180ReviewUserTemplate: str(
    "BHASHSMS_UOB_180_REVIEW_USER_TEMPLATE",
    "irw_bodyana_init_180review_messtouser"
  ),
  bhashsmsUob180ReshareUserTemplate: str(
    "BHASHSMS_UOB_180_RESHARE_USER_TEMPLATE",
    "irw_bodyana_init_180reshare_messtouser"
  ),
  bhashsmsUobInternalParaTestListUserTemplate: str(
    "BHASHSMS_INTERNALPARA_TESTLIST_USER_TEMPLATE",
    "irw_internalpara_testlist_shared_messtouser"
  ),
  bhashsmsUobInternalParaTestReportSubmitWcTemplate: str(
    "BHASHSMS_INTERNALPARA_TESTREPORT_SUBMIT_WC_TEMPLATE",
    "irw_internalpara_testreport_submit_messtowc"
  ),
  bhashsmsUobInternalParaTestReportSubmitWcAwcTemplate: str(
    "BHASHSMS_INTERNALPARA_TESTREPORT_SUBMIT_WC_AWC_TEMPLATE",
    "irw_internalpara_testreport_submit_messtowcawc"
  ),
  bhashsmsUseMessageAsParams: bool("BHASHSMS_USE_MESSAGE_AS_PARAMS"),
  bhashsmsAllowSessionText: bool("BHASHSMS_ALLOW_SESSION_TEXT"),

  openaiApiKey: str("OPENAI_API_KEY"),
  openaiModel: str("OPENAI_MODEL", "gpt-4.1-mini"),
  /** Optional stronger model for lab PDF extraction (falls back to OPENAI_MODEL). */
  openaiLabReportModel: str("OPENAI_LAB_REPORT_MODEL"),

  birthdayJobTimezone: str("BIRTHDAY_JOB_TIMEZONE", "Asia/Kolkata"),
  birthdayJobCronSchedule: str("BIRTHDAY_JOB_CRON_SCHEDULE", "5 0 * * *"),
  birthdayJobCronEnabled: cronEnabled("BIRTHDAY_JOB_CRON_ENABLED"),

  energyExchangeFyCronTimezone: str("ENERGY_EXCHANGE_FY_CRON_TIMEZONE", "Asia/Kolkata"),
  energyExchangeFyCronSchedule: str("ENERGY_EXCHANGE_FY_CRON_SCHEDULE", "5 0 * * *"),
  energyExchangeFyCronEnabled: cronEnabled("ENERGY_EXCHANGE_FY_CRON_ENABLED"),

  monthlyChampionCronTimezone: str("MONTHLY_CHAMPION_CRON_TIMEZONE", "Asia/Kolkata"),
  monthlyChampionCronSchedule: str("MONTHLY_CHAMPION_CRON_SCHEDULE", "10 0 1 * *"),
  monthlyChampionCronEnabled: cronEnabled("MONTHLY_CHAMPION_CRON_ENABLED"),

  challengeLifecycleCronTimezone: str("CHALLENGE_LIFECYCLE_CRON_TIMEZONE", "Asia/Kolkata"),
  challengeLifecycleCronSchedule: str("CHALLENGE_LIFECYCLE_CRON_SCHEDULE", "15 * * * *"),
  challengeLifecycleCronEnabled: cronEnabled("CHALLENGE_LIFECYCLE_CRON_ENABLED"),

  /** Bedtime FCM: cron ticks every minute; each user gets push at (bedtime − 30 min) in timezone below. */
  dailyReflectionBedtimeCronTimezone: str(
    "DAILY_REFLECTION_BEDTIME_CRON_TIMEZONE",
    "Asia/Kolkata"
  ),
  dailyReflectionBedtimeCronSchedule: str(
    "DAILY_REFLECTION_BEDTIME_CRON_SCHEDULE",
    "* * * * *"
  ),
  dailyReflectionBedtimeCronEnabled: process.env.DAILY_REFLECTION_BEDTIME_CRON_ENABLED !== "false",

  accountDualRead: process.env.ACCOUNT_DUAL_READ !== "false",
  accountDualWrite: bool("ACCOUNT_DUAL_WRITE"),
  accountAuthEnabled: bool("ACCOUNT_AUTH_ENABLED"),
  accountLegacyShims: process.env.ACCOUNT_LEGACY_SHIMS !== "false",
};
