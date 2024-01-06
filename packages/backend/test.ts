import Koa from "koa";
import cors from "@koa/cors";
import logger from "koa-logger";

const app = new Koa();

app.use(async (ctx, next) => {
  // fix for bug where preflight request method is in lowercase
  if (ctx.method === "options") {
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, OPTIONS, DELETE"
    );
    ctx.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    ctx.status = 204;
    return;
  }
  await next();
});

app.use(cors());
app.use(logger());

// app.use(async (ctx, next) => {
//   console.log(ctx.method);
//   if (ctx.method === "options") {
//     ctx.set("Access-Control-Allow-Origin", "*");
//     ctx.set("Access-Control-Allow-Methods", "GET, PATCH");
//     ctx.set(
//       "Access-Control-Allow-Headers",
//       "Origin, X-Requested-With, Content-Type, Accept"
//     );
//     console.log("SALUT");
//     ctx.status = 204;
//     return;
//   }

//   await next();
// });

app.listen(3000);
