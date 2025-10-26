import * as pii from "./pii";
import * as language from "./language";
import * as llm from "./llm";
import * as topics from "./topics";
import * as toxicity from "./toxicity";
import * as sentiment from "./sentiment";
import * as guidelines from "./guidelines";
import * as replies from "./replies";
import * as bleu from "./bleu";
import * as gleu from "./gleu";
import * as rouge from "./rouge";
import * as cosine from "./cosine";
import * as fuzzy from "./fuzzy";
import * as intent from "./intent";
import * as textSimilarity from "./text-similarity";
import * as modelLabeler from "./model-labeler";
import * as modelScorer from "./model-scorer";

const evaluators = {
  pii,
  language,
  llm,
  topics,
  toxicity,
  sentiment,
  guidelines,
  replies,
  bleu,
  gleu,
  rouge,
  cosine,
  fuzzy,
  intent,
  "text-similarity": textSimilarity,
  "model-labeler": modelLabeler,
  "model-scorer": modelScorer,
};

export default evaluators;
