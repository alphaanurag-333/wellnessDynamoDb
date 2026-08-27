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
  bhashsmsUobHapTemplate: str("BHASHSMS_UOB_HAP_TEMPLATE", "ir_uob_hap_01"),
  bhashsmsUobLauTemplate: str("BHASHSMS_UOB_LAU_TEMPLATE", "ir_uob_lau_01"),
  bhashsmsUobPiCoachTemplate: str("BHASHSMS_UOB_PI_COACH_TEMPLATE", "ir_uob_pi_011"),
  bhashsmsUobPiUserTemplate: str("BHASHSMS_UOB_PI_USER_TEMPLATE", "ir_uob_pi_012"),
  bhashsmsUobRbTemplate: str("BHASHSMS_UOB_RB_TEMPLATE", "ir_uob_rb_01"),
  bhashsmsUseMessageAsParams: bool("BHASHSMS_USE_MESSAGE_AS_PARAMS"),
  bhashsmsAllowSessionText: bool("BHASHSMS_ALLOW_SESSION_TEXT"),

  openaiApiKey: str("OPENAI_API_KEY"),
  openaiModel: str("OPENAI_MODEL", "gpt-4.1-mini"),

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

  accountDualRead: process.env.ACCOUNT_DUAL_READ !== "false",
  accountDualWrite: bool("ACCOUNT_DUAL_WRITE"),
  accountAuthEnabled: bool("ACCOUNT_AUTH_ENABLED"),
  accountLegacyShims: process.env.ACCOUNT_LEGACY_SHIMS !== "false",
};
