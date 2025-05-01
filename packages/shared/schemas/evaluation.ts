import { Message } from "./old-openai";

export interface Evaluation {
  name?: string;
  prompts: Prompt[];
  providers: any[];
  checklistId: string;
  datasetId: string;
}

export interface Prompt {
  messages: Message[];
  variations: Variation[];
}

export interface Variation {
  variables: Record<string, string>;
  idealOutput?: string;
}

export interface OldProvider {
  model: string;
  config: Record<string, any>;
}
