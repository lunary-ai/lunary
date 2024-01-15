import { SignJWT } from "jose"
import Router from "next/router"
import { useState, useEffect, useCallback } from "react"
import * as jose from "jose"
import local from "next/font/local"
import { set } from "date-fns"

// TODO: to remove
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
  Router.push("/login")
}

interface SessionData {
  userId: string
  email: string
  orgId: string
}

function useSession() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  console.log(isLoading, sessionData)

  async function setSession(token: string) {
    try {
      setIsLoading(true)
      localStorage.setItem("auth-token", token)
      const payload = await jose.decodeJwt<SessionData>(token)
      const session = {
        userId: payload.userId,
        email: payload.email,
        orgId: payload.orgId,
      }

      setSessionData(session)
    } catch (error) {
      console.error("Failed to decode or set session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function clearSession() {
    localStorage.removeItem("auth-token")
    setSessionData(null)
  }

  useEffect(() => {
    const token = localStorage.getItem("auth-token")
    if (token) {
      setSession(token)
    }
    setIsLoading(false)
  }, [])

  return {
    session: sessionData,
    isLoading,
    setSession,
    clearSession,
  }
}

export default useSession
