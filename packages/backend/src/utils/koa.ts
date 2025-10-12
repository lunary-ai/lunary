import Koa from "koa";

type CustomContext<
  StateT = Koa.DefaultState,
  ContextT = Koa.DefaultContext,
> = Koa.ParameterizedContext<StateT, { a: 1 }>;

type AuthenticatedState = {
  userId: string;
  orgId: string;
  projectId: string;
  privateKey?: boolean;
  apiKeyType?: string;
};

type AuthenticatedContext = Koa.Context & {
  state: AuthenticatedState;
  body: Object;
};
type Context = AuthenticatedContext;

export default Context;
