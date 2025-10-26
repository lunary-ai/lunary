export type JobContext = {
  orgId: string;
  jobId: string;
  rawType: string;
  type: string;
  subject?: string;
  payload?: any;
  updateProgress: (pct: number) => Promise<void>;
};
