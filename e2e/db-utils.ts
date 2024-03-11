import sql from "../packages/backend/src/utils/db"

export async function setOrgPro() {
  await sql`update org set plan = 'pro' where name = 'TESTORG'`
}

export async function setOrgFree() {
  await sql`update org set plan = 'free' where name = 'TESTORG'`
}

export async function deleteOrg() {
  await sql`delete from org where name = 'TESTORG'`
}
