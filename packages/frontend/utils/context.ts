import { createContext } from "react"

type ProjectContextType = {
  projectId?: string
  setProjectId: (appId: string | null) => void
}

export const ProjectContext = createContext<ProjectContextType>({
  projectId: undefined,
  setProjectId: () => {},
})
