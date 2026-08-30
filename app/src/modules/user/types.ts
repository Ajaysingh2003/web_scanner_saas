export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
  email_verified_at: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer" | string;
  expires_in: number;
  user: AuthUser;
};

export type RegisterResponse = {
  user: AuthUser;
  verification_required: boolean;
};

export type OAuthStartResponse = {
  provider: "google" | "github";
  url: string;
};

export type ApiKey = {
  id: string;
  key_id: string;
  name: string;
  created_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type CreatedApiKey = ApiKey & {
  secret: string;
};

export type AuthMessage = {
  detail: string;
};

export type Workspace = {
  id: string;
  name: string;
  isDefault?: boolean;
};

export type Plan = {
  name: string;
  projects_limit?: number | null;
  scans_per_month?: number | null;
  api_keys_limit?: number | null;
};
