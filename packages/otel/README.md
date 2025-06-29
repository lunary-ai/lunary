# OpenTelemetry Integration

The OpenTelemetry receiver has been integrated directly into the Lunary backend API.

## Endpoints

The backend now accepts OTLP/HTTP protocol buffer data at:

- `POST http://localhost:3333/v1/traces` - For trace data
- `POST http://localhost:3333/v1/metrics` - For metrics data
- `POST http://localhost:3333/v1/logs` - For log data

## Authentication

Include your Lunary project key in the `lunary-project-key` header or set the `LUNARY_PUBLIC_KEY` environment variable.

## Examples

The examples in this directory demonstrate how to send OpenTelemetry data to Lunary using various SDKs and frameworks.

Configure your OTLP exporter to point to `http://localhost:3333` (or your deployed Lunary API URL) instead of the default OTLP port 4318.