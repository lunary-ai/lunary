import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!)
export default sql
