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

  awsRegion: process.env.AWS_REGION || "ap-south-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  dynamodbSkipVerify: process.env.DYNAMODB_SKIP_VERIFY === "true",

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

  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",

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
};
