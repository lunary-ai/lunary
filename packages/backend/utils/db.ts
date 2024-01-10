import postgres from "postgres"

const sql = postgres(process.env.DB_URI!, {
  transform: {
    ...postgres.camel,
    undefined: null,
  },
})

export async function checkDbConnection() {
  try {
    await sql`select 1`
    console.log("✅ Connected to database")
  } catch (error) {
    console.error("❌ Could not connect to database")
    process.exit(1)
  }
}

export default sql
