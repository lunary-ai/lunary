export const sendTelegramMessage = async (msg) => {
  if (!process.env.TELEGRAM_BOT_KEY || !process.env.TELEGRAM_CHAT_ID) return

  await fetch(
    `https://api.telegram.org/bot${
      process.env.TELEGRAM_BOT_KEY
    }/sendMessage?chat_id=${
      process.env.TELEGRAM_CHAT_ID
    }&parse_mode=HTML&disable_web_page_preview=True&text=${encodeURIComponent(
      msg
    )}`
  )
}
