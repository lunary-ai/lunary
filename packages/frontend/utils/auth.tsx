import { useLocalStorage } from "@mantine/hooks";
import { decodeJwt } from "jose";
import Router from "next/router";
import { createContext, useContext, useEffect, useMemo } from "react";

const SIGN_OUT_EVENT = "sign-out";

export async function signOut() {
  const jwt = window.localStorage.getItem("auth-token");
  if (jwt) {
    const payload = decodeJwt(jwt);
    const email = payload.email as string;
    const encodedEmail = encodeURIComponent(email);
    Router.push(`/login?email=${encodedEmail}`);
  } else {
    Router.push("/login");
  }
  window.localStorage.clear();
}

interface AuthContext {
  isSignedIn: boolean;
  setJwt: (
    val: string | ((prevState: string | null) => string | null) | null,
  ) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContext | null>(null);

function checkJwt(jwt) {
  try {
    const payload = decodeJwt(jwt);
    const exp = payload.exp;

    if (!exp || exp < Date.now() / 1000) {
      throw new Error("Token expired");
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [jwt, setJwt, removeJwt] = useLocalStorage<string | null>({
    key: "auth-token",
    getInitialValueInEffect: false,
    serialize: (value) => value || "",
    deserialize: (localStorageValue) => localStorageValue || null,
    defaultValue: null,
  });

  const isSignedIn = useMemo(() => checkJwt(jwt), [jwt]);

  function doSignOut() {
    removeJwt();
    // Router.push("/login")
  }

  useEffect(() => {
    window.addEventListener(SIGN_OUT_EVENT, doSignOut);
    return () => {
      window.removeEventListener(SIGN_OUT_EVENT, doSignOut);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isSignedIn, setJwt, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}
