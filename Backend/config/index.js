require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET;

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || jwtSecret,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  jwtResetPasswordSecret:
    process.env.JWT_RESET_PASSWORD_SECRET || jwtSecret,
  jwtResetPasswordExpiresIn:
    process.env.JWT_RESET_PASSWORD_EXPIRES_IN || "1h",

  jwtVerifyEmailSecret: process.env.JWT_VERIFY_EMAIL_SECRET || jwtSecret,
  jwtVerifyEmailExpiresIn: process.env.JWT_VERIFY_EMAIL_EXPIRES_IN || "1h",

  adminRegistrationEnabled:
    process.env.ADMIN_REGISTRATION_ENABLED === "true",

  exposeOtpInResponse: process.env.EXPOSE_OTP_IN_RESPONSE === "true",
  otpLength: Number(process.env.OTP_LENGTH) || 6,
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 10,

  /** Google Authenticator (TOTP) for staff portal login */
  totpIssuer: process.env.TOTP_ISSUER || "Wellness Admin",
  jwtMfaExpiresIn: process.env.JWT_MFA_EXPIRES_IN || "5m",
  totpMaxFailedAttempts: Number(process.env.TOTP_MAX_FAILED_ATTEMPTS) || 5,

  awsRegion: process.env.AWS_REGION || "ap-south-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  dynamodbSkipVerify: process.env.DYNAMODB_SKIP_VERIFY === "true",

  // S3 bucket region can differ from DynamoDB (e.g. Mumbai bucket + Singapore tables)
  awsS3Region:
    process.env.AWS_S3_REGION || process.env.AWS_REGION || "ap-south-1",
  awsS3BucketName: process.env.AWS_S3_BUCKET_NAME,
  awsS3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL || "",

  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",

  mockPayments: process.env.MOCK_PAYMENTS === "true",
  autoConfirmMockPayments:
    process.env.AUTO_CONFIRM_MOCK_PAYMENT !== "false" &&
    (process.env.NODE_ENV || "development") !== "production",

  zoomAccountId: process.env.ZOOM_ACCOUNT_ID || "",
  zoomClientId: process.env.ZOOM_CLIENT_ID || "",
  zoomClientSecret: process.env.ZOOM_CLIENT_SECRET || "",
  zoomUserId: process.env.ZOOM_USER_ID || "me",

  bhashsmsUser: process.env.BHASHSMS_USER || "",
  bhashsmsPass: process.env.BHASHSMS_PASS || "",
  bhashsmsSender: process.env.BHASHSMS_SENDER || "BUZWAP",
  bhashsmsBaseUrl:
    process.env.BHASHSMS_BASE_URL || "http://bhashsms.com/api/sendmsgutil.php",
  /** Approved WhatsApp utility template name (Bhash `text` param — not free-form body). */
  bhashsmsTemplate: process.env.BHASHSMS_TEMPLATE || "invoice_1",
  /** Template body variables for Bhash `Params` (e.g. "1" or "name,amount"). */
  bhashsmsTemplateParams:
    process.env.BHASHSMS_TEMPLATE_PARAMS != null &&
    String(process.env.BHASHSMS_TEMPLATE_PARAMS).trim() !== ""
      ? String(process.env.BHASHSMS_TEMPLATE_PARAMS).trim()
      : "1",
  /**
   * Public PDF URL for document/payment templates (invoice_1).
   * Only used when sendWhatsAppText({ attachDocument: true }) or sendWhatsAppDocument.
   */
  bhashsmsDocumentUrl: process.env.BHASHSMS_DOCUMENT_URL || "",
  bhashsmsDocumentFname: process.env.BHASHSMS_DOCUMENT_FNAME || "PDF File",
  /**
   * Approved utility template for Admin reminder / free-text style sends.
   * Params will be the reminder body. Required unless SplitCredits session text is enabled.
   */
  bhashsmsReminderTemplate: process.env.BHASHSMS_REMINDER_TEMPLATE || "",
  /**
   * When true, put the app message into Params instead of BHASHSMS_TEMPLATE_PARAMS
   * (for document/payment templates that accept a body variable).
   */
  bhashsmsUseMessageAsParams: process.env.BHASHSMS_USE_MESSAGE_AS_PARAMS === "true",
  /**
   * When true, reminder sends use free-form `text` (session message).
   * Needs SplitCredits / open session on the Bhash WhatsApp account.
   */
  bhashsmsAllowSessionText: process.env.BHASHSMS_ALLOW_SESSION_TEXT === "true",

  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",

  birthdayJobTimezone: process.env.BIRTHDAY_JOB_TIMEZONE || "Asia/Kolkata",
  // 12:05 AM daily — minute 5, hour 0
  birthdayJobCronSchedule: process.env.BIRTHDAY_JOB_CRON_SCHEDULE || "5 0 * * *",
  birthdayJobCronEnabled:
    process.env.BIRTHDAY_JOB_CRON_ENABLED === "true" ||
    (process.env.BIRTHDAY_JOB_CRON_ENABLED !== "false" &&
      (process.env.NODE_ENV || "development") === "production"),

  energyExchangeFyCronTimezone:
    process.env.ENERGY_EXCHANGE_FY_CRON_TIMEZONE || "Asia/Kolkata",
  // 12:05 AM IST daily
  energyExchangeFyCronSchedule:
    process.env.ENERGY_EXCHANGE_FY_CRON_SCHEDULE || "5 0 * * *",
  energyExchangeFyCronEnabled:
    process.env.ENERGY_EXCHANGE_FY_CRON_ENABLED === "true" ||
    (process.env.ENERGY_EXCHANGE_FY_CRON_ENABLED !== "false" &&
      (process.env.NODE_ENV || "development") === "production"),

  monthlyChampionCronTimezone: process.env.MONTHLY_CHAMPION_CRON_TIMEZONE || "Asia/Kolkata",
  // 12:10 AM on the 1st of every month — evaluates the month that just ended
  monthlyChampionCronSchedule: process.env.MONTHLY_CHAMPION_CRON_SCHEDULE || "10 0 1 * *",
  monthlyChampionCronEnabled:
    process.env.MONTHLY_CHAMPION_CRON_ENABLED === "true" ||
    (process.env.MONTHLY_CHAMPION_CRON_ENABLED !== "false" &&
      (process.env.NODE_ENV || "development") === "production"),

  challengeLifecycleCronTimezone:
    process.env.CHALLENGE_LIFECYCLE_CRON_TIMEZONE || "Asia/Kolkata",
  // Hourly IST — grant/revoke challenge access around start/end dates
  challengeLifecycleCronSchedule:
    process.env.CHALLENGE_LIFECYCLE_CRON_SCHEDULE || "15 * * * *",
  challengeLifecycleCronEnabled:
    process.env.CHALLENGE_LIFECYCLE_CRON_ENABLED === "true" ||
    (process.env.CHALLENGE_LIFECYCLE_CRON_ENABLED !== "false" &&
      (process.env.NODE_ENV || "development") === "production"),

  /** Staff Account consolidation — docs/domain/account-migration-design-freeze.md */
  accountDualRead: process.env.ACCOUNT_DUAL_READ !== "false",
  accountDualWrite: process.env.ACCOUNT_DUAL_WRITE === "true",
  accountAuthEnabled: process.env.ACCOUNT_AUTH_ENABLED === "true",
  accountLegacyShims: process.env.ACCOUNT_LEGACY_SHIMS !== "false",
};
