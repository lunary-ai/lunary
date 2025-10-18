import { afterEach, describe, expect, test } from "bun:test";

import { resetSqlMock, setSqlResolver } from "../utils/mockSql";
import { IDs } from "../../_helpers/ids";
import { processEventsIngestion } from "@/src/api/v1/runs/ingest";

const insertedRuns: any[] = [];

describe("processEventsIngestion", () => {
  afterEach(() => {
    resetSqlMock();
    insertedRuns.length = 0;
  });

  test("remaps appId API keys to the owning project before inserting runs", async () => {
    const initialProjectId = IDs.projectPublic;
    const resolvedProjectId = IDs.projectPrivate;

    setSqlResolver((query, values) => {
      if (query.includes("from ingestion_rule")) {
        return [];
      }
      if (query.includes("from api_key")) {
        return [{ projectId: resolvedProjectId }];
      }
      if (query.includes("select * from run where id")) {
        return [];
      }
      if (query.includes("insert into run")) {
        insertedRuns.push(values[0]);
        return [];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const event = {
      event: "start",
      type: "llm",
      runId: "run-abc",
      timestamp: new Date().toISOString(),
      appId: IDs.projectPublic,
    } as any;

    const results = await processEventsIngestion(initialProjectId, event);

    expect(results).toEqual([
      {
        id: "run-abc",
        success: true,
      },
    ]);
    expect(insertedRuns.length).toBe(1);
    expect(insertedRuns[0].projectId).toBe(resolvedProjectId);
  });
});
