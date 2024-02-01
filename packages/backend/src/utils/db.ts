import postgres from "postgres"

const isProduction = process.env.NODE_ENV === "production"

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  transform: {
    ...postgres.camel,

    undefined: null,
  },
  max: isProduction ? 50 : 1,
  connection: {
    application_name: `backend-${isProduction ? "production" : "development"}`,
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
