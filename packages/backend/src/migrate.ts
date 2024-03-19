import "dotenv/config"
import sql from "./utils/db"
import fs from "fs"
import path from "path"

const migrationsDir = path.join(__dirname, "../../db")

async function main() {
  let exitCode = 0
  try {
    await sql`create extension if not exists "uuid-ossp";`
    await sql`
      create table if not exists _db_migration (
        id uuid default uuid_generate_v4() primary key,
        name varchar(255) not null, 
        executed_at timestamp with time zone default now() 
      )
    `

    const executedMigrations = await sql`
      select  * from _db_migration
    `

    const migrationFiles = fs.readdirSync(migrationsDir).sort((a, b) => {
      const numA = parseInt(a.split(".")[0], 10)
      const numB = parseInt(b.split(".")[0], 10)
      return numA - numB
    })

    const pendingMigrations = migrationFiles.filter(
      (file) =>
        !executedMigrations.some((migration) => migration.name === file),
    )

    if (pendingMigrations.length === 0) {
      console.info("No migration to run")
      return
    }

    for (const migrationFile of pendingMigrations) {
      const migrationPath = path.join(migrationsDir, migrationFile)
      await sql.begin(async (sql) => {
        await sql.file(migrationPath)
        await sql`insert into _db_migration ${sql({ name: migrationFile })}`
        console.info(`Migration from ${migrationFile} executed`)
      })
    }

    console.log("✅ DB migrations done")
  } catch (error) {
    console.error(error)
    exitCode = 1
  } finally {
    await sql.end()
  }

  process.exit(exitCode)
}

main()
