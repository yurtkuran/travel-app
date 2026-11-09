"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/features/auth/server/session";
import type { TaxonomyActionState } from "@/features/taxonomy/action-state";
import {
  mutationErrorActionState,
  successActionState,
  validationActionState,
} from "@/features/taxonomy/server/action-helpers";
import {
  createCategory,
  createCategorySchema,
} from "@/features/taxonomy/server/taxonomy";

export async function createCategoryAction(
  previous: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const session = await requireAdminSession();
  const parsed = createCategorySchema.safeParse({
    description: String(formData.get("description") ?? ""),
    displayOrder: String(formData.get("displayOrder") ?? ""),
    name: String(formData.get("name") ?? ""),
    ratingDimensionIds: formData.getAll("ratingDimensionIds").map(String),
  });
  if (!parsed.success) return validationActionState(previous, parsed.error);

  try {
    await createCategory(session.actor, parsed.data);
    revalidatePath("/admin/categories");
    return successActionState(previous, `${parsed.data.name} was created.`);
  } catch (error) {
    return mutationErrorActionState(previous, error);
  }
}
