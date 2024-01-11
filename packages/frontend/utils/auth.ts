import { SignJWT } from "jose"
import Router from "next/router"
import SessionReact from "supertokens-auth-react/recipe/session"

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

export async function signOut() {
  window.localStorage.clear()
  await SessionReact.signOut()
  Router.push("/login")
}
