export interface SubmissionActionState {
  fieldErrors: Record<string, string | undefined>;
  message?: string;
  revision: number;
  status: "error" | "idle";
}

export const initialSubmissionActionState: SubmissionActionState = {
  fieldErrors: {},
  revision: 0,
  status: "idle",
};
