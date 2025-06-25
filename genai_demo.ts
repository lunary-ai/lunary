import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { context, setSpan } from "@opentelemetry/api";

const exporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

const tracer = provider.getTracer("genai-demo");

async function main() {
  const span = tracer.startSpan("chat", {
    attributes: {
      "gen_ai.operation.name": "chat",
      "gen_ai.system": "openai",
      "gen_ai.request.prompt": "Hello, how are you?",
      "gen_ai.response.completion": "I'm fine!",
      "gen_ai.usage.input_tokens": 5,
      "gen_ai.usage.output_tokens": 6,
      "lunary.project_key": "demo_key",
    },
  });
  await new Promise((r) => setTimeout(r, 50));
  span.end();
  await provider.shutdown();
  console.log("trace sent");
}

main();
