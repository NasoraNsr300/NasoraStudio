export type AuthIdentity = {
  email: string | null;
  id: string;
  nickname: string;
  role?: string | null;
};

export type AuthStatus = "loading" | "signedOut" | "signedIn";

export type AuthOperationResult = {
  error: { message?: string } | null;
};

export type SignUpInput = {
  email: string;
  options?: { data?: Record<string, unknown> };
  password: string;
};
