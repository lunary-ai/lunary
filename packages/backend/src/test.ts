import sql from "./utils/db"

async function main() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(startOfDay)
  endOfDay.setHours(23, 59, 59, 999)

  const res =
    await sql`select generate_series(${startOfDay}, ${endOfDay}, '1 hour')`
}

main()
