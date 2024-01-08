const threads = {
  revenue: 3,
  users: 13,
}

export const sendTelegramMessage = async (msg, thread) => {
  if (!process.env.TELEGRAM_BOT_KEY || !process.env.TELEGRAM_CHAT_ID) return

  const threadId = threads[thread] || null

  await fetch(
    `https://api.telegram.org/bot${
      process.env.TELEGRAM_BOT_KEY
    }/sendMessage?chat_id=${
      process.env.TELEGRAM_CHAT_ID
    }&parse_mode=HTML&disable_web_page_preview=True&text=${encodeURIComponent(
      msg,
    )}${threadId ? `&reply_to_message_id=${threadId}` : ""}`,
  )
}
