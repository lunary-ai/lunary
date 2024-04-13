export interface Account {
  id: string
  createdAt: Date
  email: string | null
  passwordHash: string | null
  recoveryToken: string | null
  name: string | null
  orgId: string | null
  role: "owner" | "admin" | "member" | "viewer" | "prompt_editor" | "billing"
  verified: boolean
  avatarUrl: string | null
  lastLoginAt: Date | null
  singleUseToken: string | null
}
