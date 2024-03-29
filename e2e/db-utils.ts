import sql from "../packages/backend/src/utils/db"

export async function setOrgPro() {
  return sql`update org set plan = 'pro' where name = 'TESTORG'`
}

export async function setOrgFree() {
  return sql`update org set plan = 'free' where name = 'TESTORG'`
}

export async function deleteOrg() {
  return sql`delete from org where name = 'TESTORG'`
}
