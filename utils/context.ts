import { createContext } from "react"

type AppContextType = {
  app?: any
  setApp?: (app: any) => void
}

export const AppContext = createContext<AppContextType>({
  app: undefined,
  setApp: () => {},
})
