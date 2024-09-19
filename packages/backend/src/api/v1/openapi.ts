import swaggerJsdoc from "swagger-jsdoc";
import Router from "koa-router";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lunary API",
      version: "1.0.0",
    },
  },
  apis: ["./src/api/v1/**/*.ts"], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);

const router = new Router();

router.get("/openapi", async (ctx) => {
  ctx.body = openapiSpecification;
});

export default router;
