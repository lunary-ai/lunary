import { Sql } from "postgres"

/**
 *
 * @param projectId
 * @param sql needed as a param because this function is used in a transaction
 */
export async function insertDefaultApiKeys(projectId: string, sql: Sql) {
  const publicKey = {
    type: "public",
    projectId: projectId,
    apiKey: projectId,
  }
  sql`
    insert into api_key ${sql(publicKey)}
  `
  const privateKey = [
    {
      type: "private",
      projectId: projectId,
    },
  ]
  await sql`
    insert into api_key ${sql(privateKey)}
  `
}
