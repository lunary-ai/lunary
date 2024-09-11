import { useBigQuery } from "@/utils/dataHooks/data-warehouse";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Loader,
  PasswordInput,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { useState } from "react";

export default function BigQuery() {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { connector, insert, isLoading: isBigQueryLoading } = useBigQuery();

  if (isBigQueryLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  async function submit() {
    try {
      setIsLoading(true);
      await insert(apiKey);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Container>
      <Title>BigQuery Configuration</Title>

      {!connector && (
        <>
          <Alert
            my="lg"
            variant="light"
            color="yellow"
            title="Prerequisites"
            icon={<IconAlertTriangle />}
          >
            The connector requires prerequisites to be fulfilled to run
            successfully:{" "}
            <Anchor
              size="sm"
              href="https://lunary.ai/docs/enterprise/bigquery"
              target="_blank"
            >
              Prerequisites
            </Anchor>
          </Alert>

          <PasswordInput
            value={apiKey}
            placeholder="Google Cloud API Key"
            onChange={(e) => setApiKey(e.target.value)}
          />

          <Button
            style={{ float: "right" }}
            mt="md"
            loading={isLoading}
            onClick={submit}
          >
            Save
          </Button>
        </>
      )}

      {connector && (
        <Alert
          my="lg"
          variant="light"
          color="green"
          title="Connector successfully created"
          icon={<IconCheck />}
        >
          A new BigQuery dataset "lunary" will be populated in a few minutes, if
          you're setting it up for the first time.
        </Alert>
      )}
    </Container>
  );
}
