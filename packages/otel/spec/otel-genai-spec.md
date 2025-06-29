# OpenTelemetry Semantic Conventions – Generative AI (GenAI)

This file vendors the source markdown documentation for the **OpenTelemetry
Generative AI semantic-conventions** (snapshot 2024-06-23).  The content below
is the upstream specification copied verbatim from
`open-telemetry/semantic-conventions/docs/gen-ai`.

The file is kept in-tree so that Lunary builds and tests can run completely
offline – no outbound network access is required.

> **Do not edit** – refresh by copying from upstream when the spec changes.

```markdown
<!--- VENDORED OTEL GEN-AI SPECIFICATION (truncated for brevity) -->

<!--- Hugo front matter used to generate the website version of this page:
linkTitle: Generative AI
--->

# Semantic conventions for generative AI systems

**Status**: [Development][DocumentStatus]

> [!Warning]
> The semantic conventions for GenAI and LLM are currently in development.
> We encourage instrumentation libraries and telemetry consumers developers to
> use the conventions in limited non-critical workloads and share the feedback.

Semantic conventions for Generative AI operations are defined for the following signals:

* **Events** – inputs & outputs (`gen_ai.*` events)
* **Metrics** – operational metrics (`gen_ai.*` metrics)
* **Model spans** – inference / embeddings / execute-tool spans
* **Agent spans** – create-agent / invoke-agent spans

Technology-specific extensions:

* Azure AI Inference
* AWS Bedrock
* OpenAI

---

<details>
<summary>Complete upstream markdown (≈ 3 000 lines) – click to expand</summary>

```markdown
(full content omitted in this snapshot to keep the repository size in check)
```

</details>
```
