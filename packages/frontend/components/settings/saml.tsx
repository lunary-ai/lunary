import { useOrg } from "@/utils/dataHooks";
import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import { Flex, TextInput, Button, Text, Table } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconLogin, IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { CopyInput } from "../blocks/CopyText";
import { SettingsCard } from "../blocks/SettingsCard";
import config from "@/utils/config";

export function SAMLConfig() {
  const { org, updateOrg, mutate } = useOrg();

  const [idpXml, setIdpXml] = useState(org?.samlIdpXml || "");
  const [idpLoading, setIdpLoading] = useState(false);
  const [spLoading, setSpLoading] = useState(false);

  // Check if URL is supplied, if so download the xml
  async function addIdpXml() {
    setIdpLoading(true);

    const res = await errorHandler(
      fetcher.post(`/auth/saml/${org?.id}/download-idp-xml`, {
        arg: {
          content: idpXml,
        },
      }),
    );

    if (res) {
      notifications.show({
        title: "IDP XML added",
        message: "The IDP XML has been added successfully",
        icon: <IconCheck />,
        color: "green",
      });

      mutate();
    }

    setIdpLoading(false);
  }

  async function downloadSpXml() {
    setSpLoading(true);
    const response = await fetcher.getText(`/auth/saml/${org?.id}/metadata/`);
    const blob = new Blob([response], { type: "text/xml" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "SP_Metadata.xml");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    setSpLoading(false);
  }

  const samlEnabled = config.IS_SELF_HOSTED
    ? org.license.samlEnabled
    : org.samlEnabled;

  return (
    <SettingsCard
      title={"SAML Configuration"}
      paywallConfig={{
        enabled: !samlEnabled,
        description:
          "Enable SAML to configure Single Sign-On (SSO) with your Identity Provider (IDP)",
        Icon: IconLogin,
        feature: "SAML",
        plan: "enterprise",
        p: 16,
      }}
    >
      <Text fw="bold">
        1. Provide your Identity Provider (IDP) Metadata XML.
      </Text>
      <Flex gap="md">
        <TextInput
          style={{ flex: 1 }}
          value={idpXml}
          placeholder="Paste the URL or content of your IDP XML here"
          w="max-content"
          onChange={(e) => setIdpXml(e.currentTarget.value)}
        />

        <Button
          variant="light"
          loading={idpLoading}
          onClick={() => {
            addIdpXml();
          }}
        >
          Add IDP XML
        </Button>
      </Flex>

      <Text fw="bold">
        2. Setup the configuration in your Identity Provider (IDP)
      </Text>

      <Table>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>Identifier (Entity ID):</Table.Td>
            <Table.Td>
              <CopyInput value={"urn:lunary.ai:saml:sp"} readOnly />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Assertion Consumer Service (ACS) URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/acs`}
                readOnly
              />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Single Logout Service (SLO) URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/slo`}
                readOnly
              />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Sign on URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/login`}
                readOnly
              />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Single Logout URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/slo`}
                readOnly
              />
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      <Button
        onClick={() => downloadSpXml()}
        loading={spLoading}
        variant="default"
        rightSection={<IconDownload size="14" />}
      >
        Download Service Provider Metadata XML
      </Button>
    </SettingsCard>
  );
}
