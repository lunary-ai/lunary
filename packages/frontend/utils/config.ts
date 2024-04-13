const config = {
  IS_SELF_HOSTED:
    process.env.NEXT_PUBLIC_IS_SELF_HOSTED === "true" ? true : false,
}

export default config
