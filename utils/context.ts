import { createContext } from "react"

type AppContextType = {
  appId?: string
  setAppId: (appId: string | null) => void
}

export const AppContext = createContext<AppContextType>({
  appId: undefined,
  setAppId: () => {},
})
