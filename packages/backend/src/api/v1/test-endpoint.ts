import Router from "koa-router";
import Context from "@/src/utils/koa";

const testEndpoint = new Router({
  prefix: "/test-endpoint",
});

/**
 * @openapi
 * /v1/test-endpoint:
 *   post:
 *     summary: Test endpoint for playground API testing
 *     description: A public endpoint that echoes back the request data for testing the playground custom API feature
 *     tags: [Test]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response with echoed data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 receivedAt:
 *                   type: string
 *                   format: date-time
 *                   description: When the request was received
 *                 echo:
 *                   type: object
 *                   description: The request data echoed back
 *                 headers:
 *                   type: object
 *                   description: Request headers received
 *                 method:
 *                   type: string
 *                   description: HTTP method used
 */
testEndpoint.post("/", async (ctx: Context) => {
  const requestBody = ctx.request.body || {};

  const headers = Object.entries(ctx.request.headers)
    .filter(
      ([key]) =>
        !["authorization", "cookie", "x-api-key"].includes(key.toLowerCase()),
    )
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  ctx.body = [{ role: "system", content: "You are a helpful assistant." }];
  return;
  ctx.body = {
    message: "Test endpoint successfully received your request",
    receivedAt: new Date().toISOString(),
    echo: requestBody,
    headers,
    method: ctx.method,
  };
  ctx.status = 200;
});

/**
 * @openapi
 * /v1/test-endpoint/auth:
 *   post:
 *     summary: Test endpoint with authentication check
 *     description: A test endpoint that validates authentication headers
 *     tags: [Test]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response with authentication info
 *       401:
 *         description: Unauthorized - missing or invalid authentication
 */
testEndpoint.post("/auth", async (ctx: Context) => {
  const authHeader = ctx.request.headers.authorization;
  const apiKeyHeader = ctx.request.headers["x-api-key"];

  let authType = null;
  let authenticated = false;

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      authType = "bearer";
      authenticated = authHeader.length > 7;
    } else if (authHeader.startsWith("Basic ")) {
      authType = "basic";
      authenticated = authHeader.length > 6;
    }
  } else if (apiKeyHeader) {
    authType = "api_key";
    authenticated = apiKeyHeader.length > 0;
  }

  if (!authenticated) {
    ctx.status = 401;
    ctx.body = {
      error: "Unauthorized",
      message: "Missing or invalid authentication",
    };
    return;
  }

  ctx.body = {
    message: "Authentication successful",
    authType,
    receivedAt: new Date().toISOString(),
    echo: ctx.request.body || {},
  };
  ctx.status = 200;
});

export default testEndpoint;
