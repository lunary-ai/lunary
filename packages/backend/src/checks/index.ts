import sql from "../utils/db";
import { callML } from "../utils/ml";
import aiAssert from "./ai/assert";
import aiFact from "./ai/fact";
import aiSimilarity from "./ai/similarity";
// import aiNER from "./ai/ner"
// import aiToxicity from "./ai/toxic"
import rouge from "rouge";
import { and, or } from "../utils/checks";
import { CleanRun } from "../utils/ingest";

export const isOpenAIMessage = (field: any) =>
  field &&
  typeof field === "object" &&
  field.role &&
  (field.content ||
    field.toolCalls ||
    field.functionCall ||
    field.tool_calls ||
    field.function_call);

function getTextsTypes(field: "any" | "input" | "output", run: any) {
  let textsToCheck = [];
  if (field === "any") {
    textsToCheck.push(lastMsg(run["input"]), lastMsg(run["output"]));
  } else {
    textsToCheck.push(lastMsg(run[field]));
  }

  return textsToCheck.filter(Boolean);
}

export type CheckRunner = {
  id: string;
  evaluator?: (
    run: any,
    params: any,
  ) => Promise<{
    passed: boolean;
    details?: any;
  }>;
  sql?: (params: any) => any; // todo: postgres sql type
  ingestionCheck?: (run: CleanRun, params: any) => Promise<boolean>;
};

export function lastMsg(field: any) {
  if (typeof field === "string" || !field) {
    return field;
  } else if (Array.isArray(field) && isOpenAIMessage(field[0])) {
    const lastContent = field.at(-1).content;
    return typeof lastContent === "string"
      ? lastContent
      : JSON.stringify(lastContent);
  } else if (isOpenAIMessage(field)) {
    return field.content;
  } else {
    return JSON.stringify(field);
  }
}

function postgresOperators(operator: string) {
  switch (operator) {
    case "gt":
      return sql`>`;
    case "gte":
      return sql`>=`;
    case "lt":
      return sql`<`;
    case "lte":
      return sql`<=`;
    case "eq":
      return sql`=`;
    case "neq":
      return sql`!=`;
    case "iequals":
      return sql`ILIKE`;
    case "icontains":
      return sql`ILIKE`;
    case "contains":
      return sql`LIKE`;
    case "startswith":
      return sql`LIKE`;
    case "istartswith":
      return sql`ILIKE`;
    case "endswith":
      return sql`LIKE`;
    case "iendswith":
      return sql`ILIKE`;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

export const CHECK_RUNNERS: CheckRunner[] = [
  {
    id: "type",
    sql: ({ type }) => {
      if (type === "trace") {
        return sql`(r.type in ('agent','chain') and (pr.id is not null or r.parent_run_id is null))`;
      } else if (type == "chat") {
        return sql`(r.type = 'chat' or r.type = 'custom-event')`;
      } else {
        return sql`(r.type = ${type})`;
      }
    },
  },
  {
    id: "models",
    sql: ({ models }) => sql`(r.name = any(${models}))`,
    ingestionCheck: async (run, params) => {
      const { models } = params;
      for (const model of models) {
        if (model === run.name) {
          return false;
        }
      }
      return true;
    },
  },
  {
    id: "tools",
    sql: () => {},
    ingestionCheck: async (run, params) => {
      const { toolName } = params;
      if (run.type === "tool" && toolName === run.name) {
        return false;
      }
      return true;
    },
  },
  {
    id: "tags",
    sql: ({ tags }) => sql`(r.tags && ${sql.array(tags)})`,
    ingestionCheck: async (run, params) => {
      const { tags } = params;

      if (run.tags) {
        for (const tag of run.tags) {
          if (tags.includes(tag.toString())) {
            return false;
          }
        }
      }

      return true;
    },
  },
  {
    id: "templates",
    sql: ({ templates }) => sql`t.id = ANY(${sql.array(templates, 20)})`, // 20 is to specify it's a postgres int4
  },
  {
    id: "metadata",
    sql: ({ key, value }) => {
      if (!key || !value) return sql`true`;

      return sql`r.metadata @> ${sql.json({ [key]: value })}
        ${value === "true" ? sql`or r.metadata @> ${sql.json({ [key]: true })}` : sql``}
        ${value === "false" ? sql`or r.metadata @> ${sql.json({ [key]: false })}` : sql``}
        ${value === "null" ? sql`or r.metadata @> ${sql.json({ [key]: null })}` : sql``}
        ${!isNaN(Number.parseInt(value)) ? sql`or r.metadata @> ${sql.json({ [key]: Number.parseInt(value) })}` : sql``}
      `;
    },
    ingestionCheck: async (run, params) => {
      const { key, value } = params;

      if (run.metadata && run.metadata[key] === value) {
        return false;
      }

      return true;
    },
  },
  {
    id: "status",
    sql: ({ status }) => sql`(r.status = ${status})`,
  },
  {
    id: "languages",
    sql: ({ field, codes }) => {
      if (!codes || !codes.length) return sql`true`;

      return sql`(
        e2.type = 'language'
        and jsonb_typeof(er2.result->${field}) = 'array'
        and exists (
            select 1
            from jsonb_array_elements(er2.result->${field}) as elem
            where elem->>'isoCode' =  any(${sql.array(codes)})
        )
      )
      `;
    },
  },
  {
    id: "pii",
    sql: ({ containsPii }) => {
      if (!containsPii) {
        return sql`true`;
      }

      if (containsPii === "false") {
        return sql`not (
          e2.type = 'pii'
          and (jsonb_typeof(er2.result->'input') = 'array' or jsonb_typeof(er2.result->'output') = 'array')
          and (
            exists (
              select 1
              from jsonb_array_elements(er2.result->'input') as input_array
              where input_array[0] is not null
            ) or exists (
              select 1
              from jsonb_array_elements(er2.result->'output') as output_array
              where output_array[0] is not null
            )
          )
        )`;
      }

      return sql`(
        e2.type = 'pii'
        and (jsonb_typeof(er2.result->'input') = 'array' or jsonb_typeof(er2.result->'output') = 'array')
        and (exists (
            select 1
            from jsonb_array_elements(er2.result->'input') as input_array
            where input_array[0] is not null
        ) or exists (
            select 1
            from jsonb_array_elements(er2.result->'output') as output_array
            where output_array[0] is not null
        ))
      )
      `;
    },
  },
  {
    id: "sentiment",
    sql: ({
      sentiment,
    }: {
      sentiment: "positive" | "negative" | "neutral";
    }) => {
      if (!sentiment) return sql`true`;

      return and([
        sql`e.type = 'sentiment'`,
        or([
          sql`(
            SELECT (elem ->> 'label') = ${sentiment} 
            FROM jsonb_array_elements(er.result::jsonb -> 'input') AS elem
            ORDER BY (elem->>'index')::int DESC
            LIMIT 1
          )`,
          sql`(
            SELECT (elem ->> 'label') = ${sentiment} 
            FROM jsonb_array_elements(er.result::jsonb -> 'output') AS elem
            ORDER BY (elem->>'index')::int DESC
            LIMIT 1
          )`,
        ]),
      ]);
    },
  },
  {
    id: "toxicity",
    sql: ({ field, type }) => {
      console.log("toxicity", field, type);
      // if (!["toxic", "non-toxic"].includes(type)) return sql`true`;

      const column = field === "input" ? "rt.toxic_input" : "rt.toxic_output";

      return sql`(rt.toxic_input is true)`;
      // return sql`(${sql.unsafe(column)} = ${type === "toxic" ? true : false})`;
    },
  },
  {
    id: "topics",
    sql: ({ field, topics }) => {
      if (!topics || !topics.length) return sql`true`;

      return sql`(
        e2.type = 'topics'
        and jsonb_typeof(er2.result->${field}) = 'array'
        and exists (
            select 1
            from jsonb_array_elements(er2.result->${field}) as elem
            where elem[0]->>'topic' =  any(${sql.array(topics)})
        )
      )
      `;
    },
  },
  {
    id: "users",
    sql: ({ users }) =>
      sql`(r.external_user_id = ANY(${sql.array(users, 20)}))`, // 20 is to specify it's a postgres int4
    ingestionCheck: async (run, params) => {
      const { users } = params;

      for (let userId of users) {
        const [dbUserId] =
          await sql`select external_id from external_user where id = ${userId}`;
        if (dbUserId.externalId === run.userId) {
          return false;
        }
      }

      return true;
    },
  },
  {
    id: "feedback",
    sql: ({ types }) => {
      // If one of the type is {"comment": ""}, we just need to check if there is a 'comment' key
      // otherwise, we need to check for the key:value pair

      return or(
        types.map((type: string) => {
          const parsedType = JSON.parse(type);
          const key = Object.keys(parsedType)[0];
          const value = parsedType[key];

          if (key === "comment") {
            // comment is a special case because there can be infinite values
            return sql`(
            r.feedback->comment is not null or parent_feedback.feedback->comment is not null
            or 
              exists(select feedback from run where parent_run_id = r.id and run.feedback->>'comment' = ${value}) 
            )`;
          } else if (key === "thumb") {
            if (value === null) {
              return sql`(
                r.feedback->>'thumb' is null 
                and 
                  not exists(select feedback from run where parent_run_id = r.id and (run.feedback->>'thumb' = 'up' or run.feedback->>'thumb' = 'down')) 
              )`;
            }
            return sql`(
              r.feedback->>'thumb' = ${value} 
              or 
                exists(select feedback from run where parent_run_id = r.id and run.feedback->>'thumb' = ${value}) 
              )`;
          }
        }),
      );
    },
  },
  {
    id: "regex",
    evaluator: async (run, params) => {
      const { regex, type, field } = params;

      const re = new RegExp(regex);

      const runField =
        typeof run[field] === "string"
          ? run[field]
          : JSON.stringify(run[field]);

      const has = re.test(lastMsg(runField));

      const passed = type === "contains" ? has : !has;

      const match = has ? re.exec(runField)[0] : "";

      return {
        passed,
        details: { match },
      };
    },
  },
  {
    id: "custom-events",
    sql: ({ customEvents }: { customEvents: string[] | null }) => {
      if (!customEvents || !customEvents.length)
        return sql`(r.type = 'custom-event')`;
      return sql`(r.type = 'custom-event' and r.name = any(${sql.array(customEvents)}))`;
    },
  },
  {
    id: "json",
    evaluator: async (run, params) => {
      const { field, type } = params;
      let passed = false;
      let reason = "";

      const fieldText = getTextsTypes(field, run)[0];

      if (type === "valid") {
        try {
          JSON.parse(fieldText);
          passed = true;
        } catch (e: any) {
          reason = e.message;
        }
      } else if (type === "invalid") {
        try {
          JSON.parse(fieldText);
          passed = false;
        } catch (e) {}
      } else if (type === "contains") {
        const regex = new RegExp(/{.*?}/g);
        const matches = fieldText.match(regex);
        if (matches) {
          passed = matches.some((match) => {
            try {
              JSON.parse(match);
              return true; // Found valid JSON
            } catch (e) {}
          });
        }
      }

      return {
        passed,
        reason,
      };
    },
  },
  {
    id: "length",
    sql: ({ field, operator, length }) =>
      sql`length(${sql(field + "_text")}) ${postgresOperators(operator)} ${length}`,
  },
  {
    id: "date",
    sql: ({ operator, date }) => {
      const parsed = new Date(date);
      const isValid = parsed instanceof Date && !isNaN(parsed.getTime());

      if (!date || !isValid) return sql`true`;

      return sql`r.created_at ${postgresOperators(operator)} ${parsed}`;
    },
  },
  {
    id: "duration",
    sql: ({ operator, duration }) =>
      sql`r.duration ${postgresOperators(operator)} ${duration} * interval '1 second'`,
  },
  {
    id: "cost",
    sql: ({ operator, cost }) =>
      sql`r.cost ${postgresOperators(operator)} ${cost}`,
  },
  {
    id: "tokens",
    // sum completion_tokens and prompt_tokens if field is total
    sql: ({ field, operator, tokens }) => {
      if (!tokens) return sql`true`;

      if (field === "total") {
        return sql`r.prompt_tokens + r.completion_tokens ${postgresOperators(
          operator,
        )} ${tokens}`;
      } else {
        return sql`${sql(field + "_tokens")} ${postgresisOperators(
          operator,
        )} ${tokens}`;
      }
    },
  },
  {
    id: "search",
    sql: ({ query }) =>
      sql`(r.input::text ilike ${`%${query}%`} or r.output::text ilike ${`%${query}%`})`,
  },
  {
    id: "string",
    sql: ({ fields, type, text, sensitive }) => {
      // inspiration (r.input ilike ${ "%" + search + "%" } or r.output ilike ${"%" + search + "%"})`;

      let operator = sql`LIKE`;
      let caseSensitive = sensitive === "true";

      let textParam = text;

      if (type === "starts") {
        // JSON fragment: ..., {"content": "text...
        textParam = `, "content": "${text}`;
      } else if (type === "ends") {
        textParam = `${text}"}`;
      }

      if (type === "contains" || type === "starts" || type === "ends") {
        operator = caseSensitive ? sql`LIKE` : sql`ILIKE`;
        textParam = "%" + textParam + "%";
      } else if (type === "notcontains") {
        operator = caseSensitive ? sql`NOT LIKE` : sql`NOT ILIKE`;
        textParam = "%" + textParam + "%";
      }

      let field = sql`(input::text || output::text)`;

      if (fields === "input") {
        field = sql`input::text`;
      } else if (fields === "output") {
        field = sql`output::text`;
      }

      return sql`${field} ${operator} ${textParam}`;
    },
  },

  {
    id: "assertion",
    async evaluator(run, params) {
      const { assertion } = params;

      const { passed, reason } = await aiAssert(
        lastMsg(run["output"]),
        assertion,
      );

      return {
        passed,
        reason,
        details: { reason },
      };
    },
  },
  // {
  //   id: "sentiment",
  //   async evaluator(run, params) {
  //     const { field, sentiment } = params

  //     const score = await aiSentiment(lastMsg(run[field]))

  //     let passed = false

  //     if (sentiment === "positive") {
  //       passed = score >= 0.7
  //     } else if (sentiment === "negative") {
  //       passed = score <= 0.4
  //     } else {
  //       passed = score >= 0.4 && score <= 0.7
  //     }

  //     return {
  //       passed,
  //       reason: `Sentiment score: ${score}`,
  //       details: { sentiment: score },
  //     }
  //   },
  // },
  {
    id: "tone",
    async evaluator(run, params) {
      const { persona } = params;
      // using aiAsertion
      const { passed, reason } = await aiAssert(
        lastMsg(run["output"]),
        `The tone of the response is spoken in a '${persona}' way.`,
      );

      return {
        passed,
        reason,
        details: { reason },
      };
    },
  },
  {
    id: "factualness",
    async evaluator(run, params) {
      const { choices } = params;

      const input = lastMsg(run["input"]);
      const output = lastMsg(run["output"]);

      if (!run.idealOutput) throw new Error("No ideal response to compare to");

      const { result, reason } = await aiFact(input, output, run.idealOutput);

      const passed = choices.includes(result);

      return {
        passed,
        reason,
      };
    },
  },

  {
    id: "rouge",
    async evaluator(run, params) {
      const { percent, rouge: rougeType } = params;

      const output = lastMsg(run["output"]);

      if (!run.idealOutput)
        throw new Error(
          "You need to set an ideal output for each prompt in the dataset in order to use the Rouge Evaluator.",
        );

      const scorer = rouge[rougeType];

      const rougeScore = scorer(output, run.idealOutput) * 100;

      const passed = rougeScore >= parseInt(percent);

      return {
        passed,
        reason: `Rouge score: ${rougeScore} >= ${percent}%`,
        details: { rouge: rougeScore },
      };
    },
  },
  {
    id: "similarity",
    async evaluator(run, params) {
      const { algorithm, percent } = params;
      const output = lastMsg(run["output"]);

      if (!run.idealOutput) throw new Error("No ideal response to compare to");

      const similarity = await aiSimilarity(output, run.idealOutput, algorithm);

      const passed = similarity >= percent;

      return {
        passed,
        details: { similarity },
      };
    },
  },

  {
    id: "toxicity",
    async evaluator(run, params) {
      const { field, type } = params;

      const labels = await callML("toxicity", {
        texts: getTextsTypes(field, run),
      });

      const hasToxicity = labels.length > 0;

      const passed = type === "contains" ? hasToxicity : !hasToxicity;

      let reason = "No toxicity detected";
      if (hasToxicity) {
        reason = `Toxicity detected: ${labels.join(", ")}`;
      }

      return {
        passed,
        reason,
        details: { labels },
      };
    },
  },
];

export default CHECK_RUNNERS;
