import Koa from "koa"

type CustomContext<StateT = Koa.DefaultState> = Koa.ParameterizedContext<
  StateT,
  { a: 1 }
>
type AuthenticatedContext = Koa.Context & {
  state: { userId: string; orgId: string; projectId: string }
}
type Context = AuthenticatedContext

export default Context
