import * as pii from "./pii"
import * as language from "./language"
import * as assert from "./assert"
import * as tones from "./tones"
import * as topics from "./topics"
import * as toxicity from "./toxicity"
import * as sentiment from "./sentiment"
import * as guidelines from "./guidelines"
import * as replies from "./replies"

const evaluators = {
  pii,
  language,
  assert,
  tones,
  topics,
  toxicity,
  sentiment,
  guidelines,
  replies,
}

export default evaluators
