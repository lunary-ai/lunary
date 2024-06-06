const config = {
  IS_SELF_HOSTED: process.env.IS_SELF_HOSTED === "true" ? true : false,
  SKIP_EMAIL_VERIFY: process.env.SKIP_EMAIL_VERIFY === "true" ? true : false,
}

export default config
