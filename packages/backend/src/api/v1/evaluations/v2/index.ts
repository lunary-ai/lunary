import Router from "koa-router";

const evaluations = new Router({ prefix: "/evaluations/v2" });

evaluations.get("/", async (ctx) => {
  ctx.body = [{ id: 1 }];
});

export default evaluations;
