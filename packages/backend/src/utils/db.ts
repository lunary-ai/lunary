import postgres from "postgres"

const isProduction = process.env.NODE_ENV === "production"

const sql = postgres(process.env.DATABASE_URL!, {
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  transform: {
    ...postgres.camel,

    undefined: null,
  },
  max: isProduction ? 50 : 5,
  connection: {
    application_name: `backend-${isProduction ? "production" : "development"}-${new Date().getTime()}`,
  },
  debug: process.env.DEBUG ? debugFn : false,
})

function debugFn(
  connection: number,
  query: string,
  parameters: any[],
  paramTypes: any[],
) {
  console.log("connection:", connection)
  console.log("query:", query)
  console.log("parameters:", parameters)
  console.log("paramTypes:", paramTypes)
  console.log("-----\n")
}

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
