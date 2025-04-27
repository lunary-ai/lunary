import * as pii from "./pii";
import * as language from "./language";
import * as assertion from "./assertion";
import * as tone from "./tone";
import * as topics from "./topics";
import * as toxicity from "./toxicity";
import * as sentiment from "./sentiment";
import * as guidelines from "./guidelines";
import * as replies from "./replies";
import * as bias from "./bias";

const evaluators = {
  pii,
  language,
  assertion,
  tone,
  topics,
  toxicity,
  sentiment,
  guidelines,
  replies,
  bias,
};

export default evaluators;
