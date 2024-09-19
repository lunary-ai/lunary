// TODO: use zod
const IS_SELF_HOSTED = process.env.IS_SELF_HOSTED === "true" ? true : false;

const config = {
  IS_SELF_HOSTED,
  SKIP_EMAIL_VERIFY: process.env.SKIP_EMAIL_VERIFY === "true" ? true : false,
  GENERIC_SENDER_ADDRESS: IS_SELF_HOSTED
    ? process.env.EMAIL_SENDER_ADDRESS
    : process.env.GENERIC_SENDER_ADDRESS,
  PERSONAL_SENDER_ADDRESS: process.env.PERSONAL_SENDER_ADDRESS,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number.parseInt(process.env.SMTP_PORT || "465"),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  DATA_WAREHOUSE_EXPORTS_ALLOWED: process.env.ALLOW_DATA_WAREHOUSE_EXPORTS, // WARNING: this should only enabled for deployments with one organization, because all the database will be exported
};

export default config;
