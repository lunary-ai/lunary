#!/bin/bash

# Test script to verify OTEL endpoints are working

echo "Testing OTEL endpoints on Lunary backend..."

# Test traces endpoint
echo -e "\n1. Testing /v1/traces endpoint:"
curl -X POST http://localhost:3333/v1/traces \
  -H "Content-Type: application/x-protobuf" \
  -H "lunary-project-key: test-key" \
  --data-binary @/dev/null \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test metrics endpoint  
echo -e "\n2. Testing /v1/metrics endpoint:"
curl -X POST http://localhost:3333/v1/metrics \
  -H "Content-Type: application/x-protobuf" \
  -H "lunary-project-key: test-key" \
  --data-binary @/dev/null \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test logs endpoint
echo -e "\n3. Testing /v1/logs endpoint:"  
curl -X POST http://localhost:3333/v1/logs \
  -H "Content-Type: application/x-protobuf" \
  -H "lunary-project-key: test-key" \
  --data-binary @/dev/null \
  -w "\nStatus: %{http_code}\n" \
  -s

echo -e "\nOTEL endpoint tests complete!"