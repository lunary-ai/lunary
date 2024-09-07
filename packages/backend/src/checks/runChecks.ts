import { CheckLogic, LogicElement } from "shared";
import CHECK_RUNNERS from ".";
import sql from "@/src/utils/db";
import { convertChecksToSQL } from "@/src/utils/checks";

type CheckResults = {
  passed: boolean;
  filterId?: string;
  details?: any;
};

const hasNonSQLCheck = (checks: CheckLogic): boolean =>
  checks.some((check) => {
    if (typeof check === "string") return false;

    if (Array.isArray(check)) return hasNonSQLCheck(check);

    const { id } = check;

    const runner = CHECK_RUNNERS.find((f) => f.id === id);

    if (runner?.evaluator) {
      return true;
    }

    return false;
  });

// create  a virtual table with the run data and then run the sql fragment see if it returns any rows
async function sqlEval(sqlFragment: any, run: any): Promise<boolean> {
  let passed = false;

  // those are eval-specific and differ from the run object
  delete run.idealOutput;
  delete run.runId;
  delete run.results;
  delete run.passed;
  delete run.details;

  if (!run.id) return passed;

  await sql.begin(async (tx) => {
    // create a virtual table with the run columns, without the id, project_id and is_public columns
    await tx`create temp table temp_run (like run) on commit drop`;

    const res = await tx`insert into temp_run ${tx(run)} returning * `;

    // run the sql fragment and see if it returns any rows
    sqlFragment.isTempRun = true;
    const [result] = await tx`
      select 
        * 
      from 
        temp_run r 
        left join external_user eu on r.external_user_id = eu.id
        left join run_parent_feedback_cache rpfc on r.id = rpfc.id
        left join template_version tv on r.template_version_id = tv.id
        left join template t on tv.template_id = t.id
        left join evaluation_result_v2 er on r.id = er.run_id 
        left join evaluator e on er.evaluator_id = e.id
      where 
        ${sqlFragment}
    `;
    passed = !!result;
  });
  return passed;
}

async function checkRun(
  run: any,
  check: LogicElement,
  forceIngestionCheck: Boolean,
): Promise<CheckResults> {
  if (typeof check === "string") {
    // Handle AND or OR
    return { passed: true };
  }

  if (Array.isArray(check)) {
    const logicType = check[0];
    const subChecks = check.slice(1);
    if (logicType === "OR") {
      for (const subCheck of subChecks) {
        const result = await checkRun(run, subCheck, forceIngestionCheck);
        if (result.passed) {
          return { passed: true, details: [result] };
        }
      }
      return {
        passed: false,
        details: subChecks.map(() => ({ passed: false })),
      };
    } else {
      // Handle nested AND
      const results: CheckResults[] = await Promise.all(
        subChecks.map((subCheck) =>
          checkRun(run, subCheck, forceIngestionCheck),
        ),
      );
      return {
        passed: results.every((result) => result.passed),
        details: results,
      };
    }
  }

  const { id, params } = check;
  const runner = CHECK_RUNNERS.find((f) => f.id === id);

  if (!runner || (!runner.sql && !runner.evaluator)) {
    return { passed: true };
  }

  if (forceIngestionCheck && runner.ingestionCheck) {
    const passed = await runner.ingestionCheck(run, params);
    return { passed, filterId: id };
  }

  if (runner.sql) {
    const snippet = runner.sql(params);

    const passed = await sqlEval(snippet, run);

    return { passed, filterId: id };
  }

  return { filterId: runner.id, ...(await runner.evaluator!(run, params)) };
}

export async function runChecksOnRun(
  run: any,
  checks: CheckLogic,
  optimize = false,
) {
  if (!checks.length) return { passed: true, results: [] };

  let passed = false;
  const results: CheckResults[] = [];

  const onlySQL = !hasNonSQLCheck(checks);

  if (onlySQL && optimize) {
    // More efficient to do it all in SQL if only SQL filters are used
    const filterSql = convertChecksToSQL(checks);

    passed = await sqlEval(filterSql, run);
  } else {
    const logicType = checks[0];
    const subChecks = checks.slice(1);
    if (logicType === "OR") {
      for (const check of subChecks) {
        const res = await checkRun(run, check, false);
        results.push(res);
        if (res.passed) {
          passed = true;
          break;
        }
      }
    } else {
      // Handle nested AND
      for (const check of subChecks) {
        const res = await checkRun(run, check, false);
        results.push(res);
        passed = res.passed;
        if (!res.passed) break;
      }
    }
  }

  return { passed, results };
}

export async function checkIngestionRule(run: any, checks: CheckLogic) {
  if (!checks.length || (checks.length === 1 && checks[0] === "AND"))
    return true;

  let passed = false;
  const results: CheckResults[] = [];

  const logicType = checks[0];
  const subChecks = checks.slice(1);
  if (logicType === "OR") {
    for (const check of subChecks) {
      const res = await checkRun(run, check, false, true);
      results.push(res);
      if (res.passed) {
        passed = true;
        break;
      }
    }
  } else {
    // Handle nested AND
    for (const check of subChecks) {
      const res = await checkRun(run, check, false, true);
      results.push(res);
      passed = res.passed;
      if (!res.passed) break;
    }
  }

  return passed;
}
