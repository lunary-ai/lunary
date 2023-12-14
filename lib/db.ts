import postgres from "postgres"

const sql = postgres(process.env.DB_URI)
export default sql
