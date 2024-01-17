import { SignJWT } from "jose"
import Router from "next/router"
import { useState, useEffect, createContext, useContext } from "react"
import * as jose from "jose"

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

const SIGN_OUT_EVENT = "signout"

export async function signOut() {
  window.localStorage.clear()
  window.dispatchEvent(new Event(SIGN_OUT_EVENT))
  Router.push("/login")
}

interface SessionData {
  userId: string
  email: string
  orgId: string
}

interface SessionContextProps {
  session: SessionData | null
  isLoading: boolean
  setSession: (token: string) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextProps | null>(null)

export function SessionProvider({ children }) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

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

  function handleSignOut() {
    clearSession()
  }

  useEffect(() => {
    const listener = () => {
      console.log("SIGN OUT")
      handleSignOut()
    }
    window.addEventListener(SIGN_OUT_EVENT, listener)

    return () => {
      window.removeEventListener(SIGN_OUT_EVENT, listener)
    }
  }, [])

  function clearSession() {
    localStorage.removeItem("auth-token")
    setSessionData(null)
  }

  useEffect(() => {
    const token = localStorage.getItem("auth-token")
    if (token) {
      setSession(token).then(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  return (
    <SessionContext.Provider
      value={{ session: sessionData, isLoading, setSession, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export default function useSession() {
  const context = useContext(SessionContext)
  if (context === null) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
