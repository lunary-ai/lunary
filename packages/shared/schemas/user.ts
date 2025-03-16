import { Role } from "../access-control";

export interface User {
  id: string;
  created_at: Date;
  email: string | null;
  password_hash: string | null;
  recovery_token: string | null;
  name: string | null;
  org_id: string | null;
  role: Role;
  verified: boolean;
  avatar_url: string | null;
  last_login_at: Date | null;
  single_use_token: string | null;
  export_single_use_token: string | null;
}
