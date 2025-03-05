import swaggerJsdoc from "swagger-jsdoc";
import Router from "koa-router";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lunary API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "https://api.lunary.ai",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  },
  apis: ["./src/api/v1/**/*.ts"],
};

const openapiSpecification = swaggerJsdoc(options);

const router = new Router();

router.get("/openapi", async (ctx) => {
  ctx.body = openapiSpecification;
});

export default router;
