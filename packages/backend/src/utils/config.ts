const config = {
  isSelfHosted: process.env.IS_SELF_HOSTED === "true" ? true : false,
  skipEmailVerify: process.env.SKIP_EMAIL_VERIFY === "true" ? true : false,
}

export default config
