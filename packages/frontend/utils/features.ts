import {
  IconAnalyze,
  IconBolt,
  IconCertificate,
  IconChartArcs,
  IconDatabase,
  IconFileInvoice,
  IconFolder,
  IconHeadset,
  IconHistory,
  IconLink,
  IconLinkPlus,
  IconLockAccess,
  IconMasksTheater,
  IconMoodNerd,
  IconMoodSmile,
  IconPaint,
  IconPlayerPlay,
  IconStatusChange,
  IconTableExport,
  IconTags,
  IconTemplate,
  IconThumbUp,
  IconUserShield,
  IconUsers,
  IconView360,
} from "@tabler/icons-react";

type Feature = {
  id: string;
  title: string;

  Icon: any;
  description?: string;
  plans: {
    id: string;
    value: string | boolean;
    help?: string;
  }[];
};

export const FEATURES: Feature[] = [
  {
    id: "basic",
    title: "Basic Features",
    Icon: IconAnalyze,
    plans: [
      { id: "free", value: true },
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "events",
    title: "Logs / Events",
    Icon: IconBolt,
    plans: [
      { id: "free", value: "10k" },
      {
        id: "team",
        value: "50k included",
        help: "then $10 / 50k / month",
      },
      { id: "enterprise", value: "Custom" },
    ],
  },
  {
    id: "team",
    title: "Maximum Seats",
    Icon: IconUsers,
    plans: [
      { id: "free", value: "1" },
      { id: "team", value: "10" },
      { id: "enterprise", value: "Custom" },
    ],
  },
  {
    id: "history",
    title: "History",
    Icon: IconHistory,
    description: "How long we keep the data you've recorded",
    plans: [
      { id: "free", value: "1-month" },
      { id: "team", value: "2 years" },
      { id: "enterprise", value: "Unlimited" },
    ],
  },
  {
    id: "views",
    title: "Smart Views",
    Icon: IconView360,
    description: "Create reusable filters to analyze your data",
    plans: [
      { id: "free", value: true },
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "prompts",
    title: "Unlimited Prompts",
    Icon: IconTemplate,
    plans: [
      { id: "free", value: true },
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "api",
    title: "Full API Access",
    Icon: IconLink,
    plans: [
      { id: "free", value: true },
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "playground",
    title: "AI Playground",
    Icon: IconPlayerPlay,
    description: "Test your prompts directly with 25+ LLMs",
    plans: [
      { id: "free", value: "Limited usage" },
      {
        id: "team",
        value: "1000 / month",
        help: "then $0.05 per query",
      },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "projects",
    title: "Unlimited Projects",
    Icon: IconFolder,
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "analytics",
    title: "Custom Dashboards",
    Icon: IconChartArcs,
    description: "Create custom analytics dashboards to visualize your data",
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "feedback",
    title: "Human Reviews",
    Icon: IconThumbUp,
    description: "Review AI outputs with your team, create fine-tuned datasets",
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "topics",
    title: "Topics",
    Icon: IconTags,
    description:
      "Automatically classify your chatbot conversations into topics",
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "sentiment",
    title: "Sentiment",
    Icon: IconMoodSmile,
    description: "Detect the sentiment of your chatbot conversations",
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "export",
    title: "CSV & JSONL Exports",
    Icon: IconTableExport,
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "support",
    title: "Support",
    Icon: IconHeadset,
    plans: [
      { id: "team", value: "Priority" },
      {
        id: "enterprise",
        value: "Same-Day",
        help: "+ Shared Slack/Teams channel",
      },
    ],
  },
  {
    id: "docker",
    title: "Host on your servers",
    Icon: IconDatabase,
    description:
      "Install and host Lunary on your own infrastructure with our Kubernetes or Docker setups.",
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "sso",
    title: "SSO / SAML",
    Icon: IconUserShield,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "rbac",
    title: "Granular Access Control",
    Icon: IconLockAccess,
    description: "Control access to your data and projects.",
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "pii",
    title: "PII Masking",
    description: "AI powered PII detection",
    Icon: IconMasksTheater,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "soc2",
    title: "SOC2 & ISO27001 Reports",
    Icon: IconCertificate,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "sla",
    title: "99.9% SLA",
    Icon: IconStatusChange,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "invoicing",
    title: "Custom Invoicing",
    Icon: IconFileInvoice,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "data-warehouse",
    title: "Data Warehouse connectors",
    Icon: IconLinkPlus,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "papertrail",
    title: "Audit Papertrail",
    Icon: IconHistory,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "whitelabel",
    title: "White Label",
    Icon: IconPaint,
    plans: [{ id: "enterprise", value: true }],
  },
  {
    id: "manager",
    title: "Technical Account Manager",
    Icon: IconMoodNerd,
    plans: [{ id: "enterprise", value: true }],
  },
];
