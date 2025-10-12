import sql from "../../backend/src/utils/db";

export async function fetchLatestThreadMessage() {
  const rows = await sql`
    select content
    from run
    where type = 'thread'
    order by created_at desc
    limit 1
  `;

  return rows[0]?.content;
}
