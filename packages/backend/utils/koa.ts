import Koa from "koa"

type CustomContext<
  StateT = Koa.DefaultState,
  ContextT = Koa.DefaultContext,
> = Koa.ParameterizedContext<StateT, { a: 1 }>

type AuthenticatedContext = Koa.Context & {
  state: { userId: string; orgId: string; projectId: string }
  body: Object
}
type Context = AuthenticatedContext

export default Context
