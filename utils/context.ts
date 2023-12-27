import { createContext } from "react"

type AppContextType = {
  appId?: string
  setAppId: (app: string) => void
}

export const AppContext = createContext<AppContextType>({
  appId: undefined,
  setAppId: () => {},
})
