import { z } from "zod";

import type { TaxonomyActionState } from "../action-state";
import { TaxonomyConflictError } from "./taxonomy";

export function validationActionState(
  previous: TaxonomyActionState,
  error: z.ZodError,
): TaxonomyActionState {
  const flattened = z.flattenError(error);
  return {
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).map(([field, messages]) => [
        field,
        Array.isArray(messages) && typeof messages[0] === "string"
          ? messages[0]
          : undefined,
      ]),
    ),
    message: "Review the highlighted fields and try again.",
    revision: previous.revision + 1,
    status: "error",
  };
}

export function mutationErrorActionState(
  previous: TaxonomyActionState,
  error: unknown,
): TaxonomyActionState {
  return {
    fieldErrors: {},
    message:
      error instanceof TaxonomyConflictError
        ? error.message
        : "The change could not be saved. Please try again.",
    revision: previous.revision + 1,
    status: "error",
  };
}

export function successActionState(
  previous: TaxonomyActionState,
  message: string,
): TaxonomyActionState {
  return {
    fieldErrors: {},
    message,
    revision: previous.revision + 1,
    status: "success",
  };
}
