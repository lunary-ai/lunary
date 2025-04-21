import sql from "@/src/utils/db";
import { refreshCostsJob } from "./api/v1/runs/utils";

type JobHandler = (
  orgId: string,
  updateProgress: (pct: number) => Promise<void>,
) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  "refresh-costs": refreshCostsJob,
};

export async function startJobWorker(pollIntervalMs = 2_000) {
  while (true) {
    const [job] = await sql`
      with next_job as (
        select 
          *
        from   
          _job
        where  
          status = 'pending'
        order  
          by created_at
        limit  1
        for update skip locked
      )
      update 
        _job as j
      set    
        status = 'running'
      from  
        next_job
      where  
        j.id = next_job.id
      returning 
        j.id, j.org_id, j.type;
    `;

    if (!job) {
      console.debug(
        "[JOB] no pending job found, sleeping for",
        pollIntervalMs,
        "ms",
      );
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }

    const {
      id: jobId,
      orgId,
      type,
    } = job as {
      id: string;
      orgId: string;
      type: string;
    };

    console.info(`[JOB] picked ${type} (${jobId}) for org ${orgId}`);

    const handler = handlers[type];
    if (!handler) {
      await sql`
        update 
          _job
        set 
          status = 'failed',
          error  = 'unknown job type'
        where 
          id = ${jobId};
      `;
      continue;
    }

    // helper closure so handlers can stream progress
    async function updateProgress(pct: number) {
      await sql`
        update 
          _job
        set 
          progress = ${pct}
        where 
          id = ${jobId};
      `;
      console.info(`[JOB] ${type} (${jobId}) progress: ${pct}`);
    }

    console.info(`[JOB] ${type} (${jobId}) handler started`);
    try {
      await handler(orgId, updateProgress);

      await sql`
        update 
          _job
        set 
          status = 'done',
          ended_at = now(),
          progress = 100
        where  
          id = ${jobId};
      `;

      console.info(`[JOB] ${type} (${jobId}) completed`);
    } catch (error: any) {
      console.error(`[JOB] ${type} (${jobId}) failed:`, error);
      await sql`
        update 
          _job
        set 
          status = 'failed',
          ended_at = now(),
          error = ${error.message?.slice(0, 2000) || "unknown error"}
        where  
          id = ${jobId};
      `;
    }
  }
}
