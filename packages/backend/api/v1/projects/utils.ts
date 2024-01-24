import sql from "@/utils/db"

export async function insertDefaultApiKeys(projectId: string) {
  const publicKey = {
    type: "public",
    projectId: projectId,
    apiKey: projectId,
  }
  await sql`
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
