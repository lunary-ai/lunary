// TODO: merge this with access control?

export const AUDIT_LOG_RESOURCES = {
  org_name: {
    id: "org_name",
    displayValue: "Org Name",
    actions: {
      update: {
        id: "update",
        displayValue: "Updated",
      },
    },
  },
  team_member: {
    id: "team_member",
    displayValue: "Team Member",
    actions: {
      login: {
        id: "login",
        displayValue: "Logged in",
      },
      logout: {
        id: "logout",
        displayValue: "Logged out",
      },
      update: {
        id: "update",
        displayValue: "Changed permissions",
      },
      invite: {
        id: "invite",
        displayValue: "Invited to team",
      },
      remove_from_team: {
        id: "remove_from_team",
        displayValue: "Removed from Team",
      },
    },
  },
  project: {
    id: "project",
    displayValue: "Project",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      rename: {
        id: "rename",
        displayValue: "Renamed",
      },
    },
  },
  dashboard: {
    id: "dashboard",
    displayValue: "Dashboard",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      update: {
        id: "update",
        displayValue: "Updated",
      },
    },
  },
  custom_chart: {
    id: "custom_chart",
    displayValue: "Custom Chart",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      update: {
        id: "update",
        displayValue: "Updated",
      },
    },
  },
  llm_log: {
    id: "llm_log",
    displayValue: "LLM Log",
    actions: {
      make_public: {
        id: "make_public",
        displayValue: "Made public",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      export: {
        id: "export",
        displayValue: "Downloaded export",
      },
      add_feedback: {
        id: "add_feedback",
        displayValue: "Added feedback",
      },
    },
  },
  trace: {
    id: "trace",
    displayValue: "Trace",
    actions: {
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      export: {
        id: "export",
        displayValue: "Downloaded export",
      },
      add_feedback: {
        id: "add_feedback",
        displayValue: "Added feedback",
      },
    },
  },
  conversation: {
    id: "conversation",
    displayValue: "Conversation",
    actions: {
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      export: {
        id: "export",
        displayValue: "Downloaded export",
      },
      add_feedback: {
        id: "add_feedback",
        displayValue: "Added feedback",
      },
    },
  },
  view: {
    id: "view",
    displayValue: "View",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      rename: {
        id: "rename",
        displayValue: "Renamed",
      },
      update: {
        id: "update",
        displayValue: "Updated filters",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      export_data: {
        id: "export_data",
        displayValue: "Downloaded export",
      },
    },
  },
  external_user: {
    id: "external_user",
    displayValue: "External User",
    actions: {
      delete_data: {
        id: "delete_data",
        displayValue: "Deleted User data",
      },
    },
  },
  prompt: {
    id: "prompt",
    displayValue: "Prompt",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      rename: {
        id: "rename",
        displayValue: "Renamed",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      save_draft: {
        id: "save_draft",
        displayValue: "Saved draft",
      },
      deploy: {
        id: "deploy",
        displayValue: "Deployed",
      },
      run_playground: {
        id: "run_playground",
        displayValue: "Ran prompt playground",
      },
    },
  },
  dataset: {
    id: "dataset",
    displayValue: "Dataset",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      rename: {
        id: "rename",
        displayValue: "Renamed",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      add_prompt: {
        id: "add_prompt",
        displayValue: "Added prompt",
      },
      update_prompt: {
        id: "update_prompt",
        displayValue: "Updated prompt",
      },
      delete_prompt: {
        id: "delete_prompt",
        displayValue: "Deleted prompt",
      },
    },
  },
  checklist: {
    id: "checklist",
    displayValue: "Checklist",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      update: {
        id: "update",
        displayValue: "Updated",
      },
      rename: {
        id: "rename",
        displayValue: "Renamed",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
    },
  },
  cost_mapping: {
    id: "cost_mapping",
    displayValue: "Custom Model Cost Mapping",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
    },
  },
  api_key: {
    id: "api_key",
    displayValue: "API Key",
    actions: {
      regenerate: {
        id: "refresh",
        displayValue: "Refreshed",
      },
    },
  },
  org_api_key: {
    id: "org_api_key",
    displayValue: "Organization API Key",
    actions: {
      regenerate: {
        id: "refresh",
        displayValue: "Regenerated",
      },
    },
  },
  pii_masking: {
    id: "pii_masking",
    displayValue: "PII Masking",
    actions: {
      enable: {
        id: "enable",
        displayValue: "Enabled",
      },
      disable: {
        id: "disable",
        displayValue: "Disabled",
      },
    },
  },
  data_warehouse_connection: {
    id: "data_warehouse_connection",
    displayValue: "Data Warehouse Connection",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      update: {
        id: "update",
        displayValue: "Updated",
      },
    },
  },
  enricher: {
    id: "enricher",
    displayValue: "Enricher",
    actions: {
      create: {
        id: "create",
        displayValue: "Created",
      },
      delete: {
        id: "delete",
        displayValue: "Deleted",
      },
      update: {
        id: "update",
        displayValue: "Updated",
      },
    },
  },
};

type ResourcesMap = typeof AUDIT_LOG_RESOURCES;
export type AuditLogResourceType = keyof ResourcesMap;
export type AuditLogAction<T extends AuditLogResourceType> =
  keyof ResourcesMap[T]["actions"];

export interface DBAuditLog {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  resourceType: string;
  resourceId: string | null;
  action: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  projectId: string | null;
  projectName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}
