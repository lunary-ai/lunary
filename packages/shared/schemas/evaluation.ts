import { Message } from "./old-openai";

export interface EvaluationPrompt {
  messages: Message[];
  variations: Variation[];
}

export interface Evaluation {
  name?: string;
  prompts: EvaluationPrompt[];
  providers: any[];
  checklistId: string;
  datasetId: string;
}

export interface Variation {
  variables: Record<string, string>;
  idealOutput?: string;
}

export interface OldProvider {
  model: string;
  config: Record<string, any>;
}
