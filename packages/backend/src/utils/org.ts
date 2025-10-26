import sql from "@/src/utils/db";

export async function checkOrgBetaAccess(
  orgId?: string | null,
): Promise<boolean> {
  if (!orgId) return false;

  const rows = await sql<{ beta: boolean }[]>`
    select beta from org where id = ${orgId} limit 1
  `;

  return Boolean(rows[0]?.beta);
}
