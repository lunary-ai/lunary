const config = {
  IS_SELF_HOSTED:
    process.env.NEXT_PUBLIC_IS_SELF_HOSTED === "true" ? true : false,
  IS_CLOUD: process.env.NEXT_PUBLIC_IS_SELF_HOSTED !== "true",
  RECAPTCHA_SITE_KEY: "6LeDTNsqAAAAANXZDQATUpJ8s1vttWkZabP6g3O6",
};

export default config;
