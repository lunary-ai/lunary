import { SignJWT } from "jose"
import SessionReact from "supertokens-auth-react/recipe/session"
import SuperTokensReact from "supertokens-auth-react"
import Router from "next/router"

export function sign(payload, secret: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 60 * 60 // one hour

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(secret))
}

export function logIn() {}

export function signup() {}

export async function signOut() {
  window.localStorage.clear()
  await SessionReact.signOut()
  Router.push("/login")
}
