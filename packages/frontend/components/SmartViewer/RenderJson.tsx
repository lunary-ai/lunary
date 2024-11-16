import { useMemo } from "react";
import ProtectedText from "../blocks/ProtectedText";
// import { JsonView, defaultStyles } from "react-json-view-lite"
// import errorHandler from "@/utils/errors"
import ErrorBoundary from "../blocks/ErrorBoundary";
import HighlightPii from "./HighlightPii";

export const Json = ({ data, compact, piiDetection }) => {
  if (!data) return null;

  const parsed = useMemo(() => {
    if (!data) return null;

    if (typeof data === "string" && data?.startsWith("{")) {
      try {
        const parsedData = JSON.parse(data);
        if (
          typeof parsedData === "object" &&
          Object.keys(parsedData).length === 1 &&
          "result" in parsedData
        ) {
          return parsedData.result;
        }
        return parsedData;
      } catch (e) {
        return data;
      }
    }

    if (
      typeof data === "object" &&
      data !== null &&
      Object.keys(data).length === 1 &&
      "result" in data
    ) {
      return data.result;
    }

    return data;
  }, [data]);

  return (
    <ProtectedText>
      <HighlightPii
        text={
          compact ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2)
        }
        piiDetection={piiDetection}
      />
    </ProtectedText>
  );
};

export const RenderJson = ({ data, compact, piiDetection }) => (
  <ErrorBoundary>
    <Json data={data} compact={compact} piiDetection={piiDetection} />
  </ErrorBoundary>
);
