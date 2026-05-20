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
};
