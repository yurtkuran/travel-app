"use server";

import { revalidatePath } from "next/cache";

import type { TaxonomyActionState } from "@/features/taxonomy/action-state";
import {
  mutationErrorActionState,
  successActionState,
  validationActionState,
} from "@/features/taxonomy/server/action-helpers";
import {
  createCity,
  createCitySchema,
} from "@/features/taxonomy/server/taxonomy";
import { requireAdminSession } from "@/features/auth/server/session";

export async function createCityAction(
  previous: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const session = await requireAdminSession();
  const parsed = createCitySchema.safeParse({
    country: String(formData.get("country") ?? ""),
    countryCode: String(formData.get("countryCode") ?? ""),
    name: String(formData.get("name") ?? ""),
    region: String(formData.get("region") ?? ""),
  });
  if (!parsed.success) return validationActionState(previous, parsed.error);

  try {
    await createCity(session.actor, parsed.data);
    revalidatePath("/admin/cities");
    return successActionState(previous, `${parsed.data.name} was created.`);
  } catch (error) {
    return mutationErrorActionState(previous, error);
  }
}
