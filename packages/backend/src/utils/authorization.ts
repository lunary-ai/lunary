import sql from "./db"

export async function checkProjectAccess(projectId: string, userId: string) {
  const [{ exists: hasAccess }] = await sql`
      select exists (
        select 1 
        from project 
        where org_id = (select org_id from account where id = ${userId}) 
          and id = ${projectId}
      )
    `
  return hasAccess
}
