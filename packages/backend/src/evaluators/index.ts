import pii from "./pii"
import language from "./language"
import assert from "./assert"
import tones from "./tones"
import topics from "./topics"

import toxicity from "./toxicity"
import sentiment from "./sentiment"
import guidelines from "./guidelines"

const evaluators = {
  pii,
  language,
  assert,
  tones,
  topics,
  toxicity,
  sentiment,
  guidelines,
}

export default evaluators
