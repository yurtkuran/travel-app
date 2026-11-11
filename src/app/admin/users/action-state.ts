export interface LinkActionState {
  expiresAt?: string;
  message?: string;
  setupUrl?: string;
  status: "idle" | "error" | "success";
  userId?: string;
}

export const initialLinkActionState: LinkActionState = { status: "idle" };
