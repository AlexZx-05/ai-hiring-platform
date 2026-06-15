export type AppRole = "admin" | "recruiter" | "candidate";

export type AuthContext = {
  sub: string;
  email?: string;
  role: AppRole;
  tenantId: string;
  groups: string[];
  tokenUse: string;
};
