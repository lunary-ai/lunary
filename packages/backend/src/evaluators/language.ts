import { Run } from "shared"
import { callML } from "../utils/ml"
import { sleep } from "../utils/misc"

/* 

TODO: need to enforce the structure with jsonschema in the DB
```sql
select distinct
    jsonb_typeof(input) as root_type
from run
where type = 'llm';


===TYPE OBJECT===: 
with runs as (
    select
        *
    from
        run
),
object_keys as (
    select
        id,
        ARRAY_AGG(key order by key) as key_set
    from (
        select
            id,
            jsonb_object_keys(input) as key
        from
            runs
        where
            type = 'llm'
            and jsonb_typeof(input) = 'object') subquery
    group by
        id
)
select
    ok.key_set
from
    runs r
    left join object_keys ok on r.id = ok.id
where
    r.type = 'llm'
    and jsonb_typeof(r.input) = 'object'
group by
    key_set;

{content,fileName,question}
{content,functionCall,role,toolCalls}
{content,role}
{createChatCompletionRequest}
{creativeModeMessage,userName}
{datatime,query,webResults}
{extracted,question}
{functions,messages}
{maxTokens,messages,model,temperature}
{maxTokens,messages,model,temperature,tools}
{messages,model,temperature}
{messages,stopSequences,system}
{messages,system}
{messages,tools}
{py/b64}
{query,webResults}
{question}
{role,text}
NULL




==TYPE ARRAY===:


*/

type Input = string | Array<any> | object | null
type Output = string | Array<any> | object | null
type Error = string | object | null

// TOOD: refacto this with all the other parsing function already in use
function parseMessages(messages: unknown) {
  if (!messages) {
    return [""]
  }
  if (typeof messages === "string" && messages.length) {
    return [messages]
  }

  if (messages === "__NOT_INGESTED__") {
    return [""]
  }

  if (Array.isArray(messages)) {
    let contentArray = []
    for (const message of messages) {
      let content = message.content || message.text
      if (typeof content === "string" && content.length) {
        contentArray.push(content)
      } else {
        contentArray.push(JSON.stringify(message))
      }
    }
    return contentArray
  }

  if (typeof messages === "object") {
    return [JSON.stringify(messages)]
  }

  return [""]
}
// Output format: {"input": [ {iso_code: 'en', confidence: 1} ], "output": ..., "errror" : ... }
// TODO: document the data format (array of string for each message in input, output array of isocode, null if no detection) + json schema in the db
// TODO: there shouldn't be output and error at the same time for a run in the DB

export async function evaluate(run: Run, params: unknown) {
  const input = parseMessages(run.input)
  const output = parseMessages(run.output)
  const error = parseMessages(run.error)

  const [inputLanguages, outputLanguages, errrorLanguages] = await Promise.all([
    detectLanguages(input),
    detectLanguages(output),
    detectLanguages(error),
  ])

  const languages = {
    input: inputLanguages,
    output: outputLanguages,
    error: errrorLanguages,
  }

  // TODO: zod for languages, SHOLUD NOT INGEST IN DB IF NOT CORRECT FORMAT
  return languages
}

// TODO: type
async function detectLanguages(texts: string[]): Promise<any> {
  try {
    return callML("language", { texts })
  } catch (error) {
    console.error(error)
    console.log(texts)
  }
}
