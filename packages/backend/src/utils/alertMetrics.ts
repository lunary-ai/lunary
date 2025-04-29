import sql from "@/src/utils/db";

/**
 * Compute error rate (percentage) over past N minutes.
 */
export async function computeError(
  projectId: string,
  intervalMinutes: number,
): Promise<number> {
  const [{ value }] = await sql`
    with window as (
      select error
      from run
      where project_id = ${projectId}
        and created_at >= now() - interval '${intervalMinutes} minutes'
    )
    select
      coalesce(avg(case when window.error is not null then 1 else 0 end) * 100, 0) as value
    from window
  `;
  return value;
}

/**
 * Compute total cost over past N minutes.
 */
export async function computeCost(
  projectId: string,
  intervalMinutes: number,
): Promise<number> {
  const [{ value }] = await sql`
    select
      coalesce(sum(cost), 0) as value
    from run
    where project_id = ${projectId}
      and created_at >= now() - interval '${intervalMinutes} minutes'
  `;
  return value;
}

/**
 * Compute feedback thumbs-up percentage over past N minutes.
 */
export async function computeFeedback(
  projectId: string,
  intervalMinutes: number,
): Promise<number> {
  const [{ value }] = await sql`
    select
      coalesce(
        avg(case when feedback->>'thumb' = 'up' then 1 else 0 end) * 100,
        0
      ) as value
    from run
    where project_id = ${projectId}
      and created_at >= now() - interval '${intervalMinutes} minutes'
  `;
  return value;
}

/**
 * Compute latency percentile over past N minutes, in seconds.
 * percentile should be given as decimal (e.g., 0.5 for p50).
 */
export async function computeLatencyPercentile(
  projectId: string,
  intervalMinutes: number,
  percentile: number,
): Promise<number> {
  const [{ value }] = await sql`
    select
      coalesce(
        percentile_cont(${percentile}) within group (
          order by extract(epoch from duration)::float
        ),
        0
      ) as value
    from run
    where project_id = ${projectId}
      and created_at >= now() - interval '${intervalMinutes} minutes'
  `;
  return value;
}
