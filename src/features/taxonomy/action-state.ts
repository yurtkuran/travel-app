export interface TaxonomyActionState {
  fieldErrors: Record<string, string | undefined>;
  message?: string;
  revision: number;
  status: "error" | "idle" | "success";
}

export const initialTaxonomyActionState: TaxonomyActionState = {
  fieldErrors: {},
  revision: 0,
  status: "idle",
};
