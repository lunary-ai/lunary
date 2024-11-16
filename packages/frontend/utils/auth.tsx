import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { decodeJwt } from "jose";
import Router from "next/router";
import { createContext, useContext, useEffect, useMemo } from "react";

const SIGN_OUT_EVENT = "sign-out";

export async function signOut() {
  const jwt = window.localStorage.getItem("auth-token");
  window.localStorage.clear();
  window.sessionStorage.clear();

  // used by the useProjectIdStorage hook
  const event = new Event("userSignedOut");
  window.dispatchEvent(event);

  if (jwt) {
    const payload = decodeJwt(jwt);
    const email = payload.email as string;
    const encodedEmail = encodeURIComponent(email);
    Router.push(`/login?email=${encodedEmail}`);
  } else {
    Router.push("/login");
  }
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

  const actualJwtValue = readLocalStorageValue({ key: "auth-token" });
  const isSignedIn = useMemo(
    () => checkJwt(jwt) && actualJwtValue, // sometimes jwt (the state) is set but the actual value in local storage is null. It's random https://linear.app/lunary/issue/LLM-2173/create-our-own-uselocalstorage-hook-because-the-mantine-one-is-not
    [jwt, actualJwtValue],
  );

  function doSignOut() {
    removeJwt();
    sessionStorage.removeItem("projectId");
    sessionStorage.removeItem("dateRange-analytics");
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
