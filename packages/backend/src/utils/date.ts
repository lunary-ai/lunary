export function getReadableDateTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
  const readableDateTime = formatter.format(date)
  return readableDateTime
}
