import sql from "../utils/db";
import { callML } from "../utils/ml";
import aiAssert from "./ai/assert";
import aiFact from "./ai/fact";
import aiSimilarity from "./ai/similarity";
// import aiNER from "./ai/ner"
// import aiToxicity from "./ai/toxic"
import RE2 from "re2";
import rouge from "rouge";
import { and, or } from "../utils/checks";
import { CleanRun } from "../utils/ingest";
import { isOpenAIMessage } from "../utils/misc";

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
    sql: ({ type }) =>
      type === "trace"
        ? // matches agent and chain runs with no parent or parent is a chat run
          sql`(r.type in ('agent','chain') and (parent_run_id is null OR EXISTS (SELECT 1 FROM run AS parent_run WHERE parent_run.id = r.parent_run_id AND parent_run.type = 'chat')))`
        : sql`(r.type = ${type})`,
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
    sql: ({ tags }) => sql`(tags && ${sql.array(tags)})`,
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
      return sql`(CAST(metadata->>${key} AS TEXT) = ${value})`;
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
    sql: ({ status }) => sql`(status = ${status})`,
  },
  {
    id: "languages",
    sql: ({ field, codes }) => {
      if (!codes || !codes.length) return sql`true`;

      return and([
        sql`e.type = 'language'`,
        or(
          codes.map((code: string) => {
            const jsonSql = [{ isoCode: code }];
            return sql`er.result::jsonb -> ${field} @> ${sql.json(jsonSql)}`;
          }),
        ),
      ]);
    },
  },
  {
    id: "entities",
    sql: ({ types }) => {
      if (!types.length) return sql`true`;

      return and([
        sql`e.type = 'pii'`,
        or(
          types.map((type: string) => {
            return sql`EXISTS (
              SELECT 1
              FROM jsonb_array_elements(er.result -> 'input') as input_array
              WHERE input_array @> ${sql.json([{ type }])}
            ) OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(er.result -> 'output') as output_array
              WHERE output_array @> ${sql.json([{ type }])}
            )`;
          }),
        ),
      ]);
    },
  },

  {
    id: "sentiment",
    sql: ({ sentiment }) => {
      if (!sentiment) return sql`true`;

      let expression;
      switch (sentiment) {
        case "positive":
          expression = sql`>= 0.5`;
          break;
        case "negative":
          expression = sql`<= -0.5`;
          break;
        case "neutral":
          expression = sql`BETWEEN -0.5 AND 0.5`;
          break;
      }

      return and([
        sql`e.type = 'sentiment'`,
        or([
          sql`(
            SELECT (elem ->> 'score')::float ${expression}
            FROM jsonb_array_elements(er.result::jsonb -> 'input') AS elem
            ORDER BY (elem->>'index')::int DESC
            LIMIT 1
          )`,
          sql`(
            SELECT (elem ->> 'score')::float ${expression}
            FROM jsonb_array_elements(er.result::jsonb -> 'output') AS elem
            ORDER BY (elem->>'index')::int DESC
            LIMIT 1
          )`,
        ]),
      ]);
    },
  },
  {
    id: "users",
    sql: ({ users }) => sql`(external_user_id = ANY(${sql.array(users, 20)}))`, // 20 is to specify it's a postgres int4
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
            return sql`(r.feedback->${key} is not null or rpfc.feedback->${key} is not null)`;
          } else if (key === "thumb") {
            return sql`(r.feedback->>'thumbs' = ${value} or rpfc.feedback->>'thumbs' = ${value} or r.feedback->>'thumb' = ${value} or rpfc.feedback->>'thumb' = ${value})`;
          } else {
            return sql`(r.feedback->>${key} = ${value} OR rpfc.feedback->>${key} = ${value})`;
          }
        }),
      );
    },
  },
  {
    id: "regex",
    evaluator: async (run, params) => {
      const { regex, type, field } = params;

      const re = new RE2(regex);

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
        const regex = new RE2(/{.*?}/g);
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
  // {
  //   id: "xml",
  //   name: "XML / HTML",
  //   uiType: "smart",
  //   params: [
  //     {
  //       label: "Response",
  //       type: "label",
  //     },
  //     FORMAT_PARAM,
  //     {
  //       type: "label",
  //       label: "XML / HTML",
  //     },
  //   ],
  //   evaluator: async (run) => {
  //     let parsable = false
  //     let passed = false

  //     try {
  //       if (!run.output.startsWith("<")) throw "Not an object"
  //       // TODO: use a real XML parser
  //       // new DOMParser().parseFromString(run.output, "text/xml")
  //       parsable = true
  //       partial = true
  //     } catch (e) {}

  //     return {
  //       parsable,
  //       partial,
  //     }
  //   },

  // },
  // {
  //   id: "cc",
  //   sql: ({ field, type }) => {
  //     const operator = type === "contains" ? sql`~` : sql`!~`

  //     return sql`${sql(field + "_text")} ${operator} '(?:4[0-9]{3}(?:[ -]?[0-9]{4}){3}|[25][1-7][0-9]{2}(?:[ -]?[0-9]{4}){3}|6(?:011|5[0-9]{2})(?:[ -]?[0-9]{4}){3}|3[47][0-9]{2}(?:[ -]?[0-9]{4}){3}|3(?:0[0-5]|[68][0-9])(?:[ -]?[0-9]{4}){2}|(?:2131|1800|35\d{2})\d{2}(?:[ -]?\d{4}){3})'`
  //   },
  // },
  // {
  //   id: "email",
  //   sql: ({ field, type }) => {
  //     const regexPattern = sql`[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+`
  //     const operator = type === "contains" ? sql`~` : sql`!~`

  //     return sql`${sql(field + "_text")}::text ${operator} '${regexPattern}'`
  //   },
  // },
  // {
  //   id: "phone",
  //   sql: ({ field, type }) => {
  //     const regexPattern = sql`^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$`
  //     const operator = type === "contains" ? sql`~` : sql`!~`

  //     return sql`${sql(field + "_text")} ${operator} '${regexPattern}'`
  //   },
  // },
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
      sql`duration ${postgresOperators(operator)} ${duration} * interval '1 second'`,
  },
  {
    id: "cost",
    sql: ({ operator, cost }) =>
      sql`cost ${postgresOperators(operator)} ${cost}`,
  },
  {
    id: "tokens",
    // sum completion_tokens and prompt_tokens if field is total
    sql: ({ field, operator, tokens }) => {
      if (!tokens) return sql`true`;

      if (field === "total") {
        return sql`completion_tokens + prompt_tokens ${postgresOperators(
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
