import * as pii from "./pii";
import * as language from "./language";
import * as llm from "./llm";
import * as topics from "./topics";
import * as toxicity from "./toxicity";
import * as sentiment from "./sentiment";
import * as guidelines from "./guidelines";
import * as replies from "./replies";
import * as bias from "./bias";
import * as bleu from "./bleu";
import * as gleu from "./gleu";
import * as rouge from "./rouge";
import * as cosine from "./cosine";
import * as fuzzy from "./fuzzy";
import * as intent from "./intent";

const evaluators = {
  pii,
  language,
  llm,
  topics,
  toxicity,
  sentiment,
  guidelines,
  replies,
  bias,
  bleu,
  gleu,
  rouge,
  cosine,
  fuzzy,
  intent,
};

export default evaluators;
