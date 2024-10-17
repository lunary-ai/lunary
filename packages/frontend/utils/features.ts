import {
  IconAnalyze,
  IconBolt,
  IconCertificate,
  IconChartArcs,
  IconDatabase,
  IconFileInvoice,
  IconFlask2,
  IconFolder,
  IconHeadset,
  IconHistory,
  IconLink,
  IconLinkPlus,
  IconLockAccess,
  IconMailAi,
  IconMasksTheater,
  IconMoodNerd,
  IconPaint,
  IconPlayerPlay,
  IconShieldBolt,
  IconStatusChange,
  IconTableExport,
  IconTemplate,
  IconThumbUpFilled,
  IconUserShield,
  IconUsers,
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
      { id: "free", value: "10k included" },
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
      { id: "enterprise", value: "♾️" },
    ],
  },
  {
    id: "history",
    title: "History",
    Icon: IconHistory,
    plans: [
      { id: "free", value: "1-month" },
      { id: "team", value: "Unlimited" },
      { id: "enterprise", value: "Unlimited" },
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
    id: "playground",
    title: "AI Playground",
    Icon: IconPlayerPlay,
    plans: [
      { id: "free", value: "Limited usage" },
      {
        id: "team",
        value: "500 / month included",
        help: "then $0.05 per query",
      },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "evaluations",
    title: "Evaluations",
    Icon: IconFlask2,
    description: "AI evaluators count towards your AI playground usage",
    plans: [
      { id: "team", value: true },
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
    title: "Advanced Analytics",
    Icon: IconChartArcs,
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "feedback",
    title: "Human Reviews",
    Icon: IconThumbUpFilled,
    plans: [
      { id: "team", value: true },
      { id: "enterprise", value: true },
    ],
  },
  {
    id: "api",
    title: "Full API Access",
    Icon: IconLink,
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
    id: "datalake",
    title: "Data Lakes connectors",
    Icon: IconLinkPlus,
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
