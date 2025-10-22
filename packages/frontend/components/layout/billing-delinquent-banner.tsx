import { Alert, Anchor, Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangleFilled } from "@tabler/icons-react";
import { useState } from "react";
import useSWR from "swr";

import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import { hasAccess, roles, type Role } from "shared";
import config from "@/utils/config";

type Org = {
  id: string;
  billingDelinquent?: boolean;
  billingDelinquentSince?: string | null;
};

type User = {
  role?: string | null;
} | null;

function normalizeRole(role?: string | null): Role | undefined {
  if (!role) return undefined;
  return Object.prototype.hasOwnProperty.call(roles, role)
    ? (role as Role)
    : undefined;
}

export default function BillingDelinquentBanner({
  org,
  user,
}: {
  org: Org | null;
  user: User;
}) {
  if (config.IS_SELF_HOSTED) {
    return;
  }
  const [isRedirecting, setIsRedirecting] = useState(false);

  const shouldShow = !!org?.billingDelinquent;

  const role = normalizeRole(user?.role);
  const canViewBilling = !!role && hasAccess(role, "billing", "read");
  const canManageBilling = !!role && hasAccess(role, "billing", "update");

  const { data: invoiceData, isLoading: invoiceLoading } = useSWR(
    shouldShow && canViewBilling
      ? `/orgs/${org?.id}/billing/latest-invoice`
      : null,
    fetcher.get,
  );

  if (!shouldShow) return null;

  const invoiceUrl = invoiceData?.hostedInvoiceUrl as string | undefined;

  const handleManageBilling = async () => {
    if (!org?.id || !canManageBilling) return;

    setIsRedirecting(true);
    try {
      const data = await errorHandler(
        await fetcher.get(`/orgs/${org.id}/billing-portal`),
      );

      if (data?.url) {
        window.location.href = data.url;
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <Alert
      variant="filled"
      color="red"
      icon={<IconAlertTriangleFilled size={20} />}
      title="Payment failed"
      mb="lg"
    >
      <Group gap="sm" justify="space-between">
        <Text size="sm">
          We couldn’t process your latest payment. Your workspace will be
          downgraded and data older than 30 days will be permanently deleted
          unless you update your billing details.
        </Text>

        <Group gap="sm">
          {invoiceUrl && !invoiceLoading && canManageBilling && (
            <Anchor
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
              c="var(--mantine-color-red-1)"
            >
              Pay outstanding invoice
            </Anchor>
          )}
        </Group>

        {!canManageBilling && (
          <Text size="sm" c="var(--mantine-color-red-1)">
            Contact an org owner or billing admin to resolve billing issues.
          </Text>
        )}
      </Group>
    </Alert>
  );
}
