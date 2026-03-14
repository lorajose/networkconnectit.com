"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { withAppBasePath } from "@/lib/app-paths";
import {
  createFirstInternalAdminUser,
  getFirstAdminBootstrapAvailability
} from "@/lib/bootstrap-admin";
import type { ManagementFormState } from "@/lib/management/form-state";
import { firstAdminBootstrapSchema } from "@/lib/validations/first-admin-bootstrap";

function bootstrapValidationError(
  message: string,
  fieldErrors: Record<string, string[] | undefined> = {}
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

function getFirstAdminBootstrapFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    bootstrapToken: formData.get("bootstrapToken")
  };
}

export async function bootstrapFirstAdminAction(
  _state: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const availability = await getFirstAdminBootstrapAvailability();

  if (!availability.available) {
    return bootstrapValidationError(
      "First-admin bootstrap is not available in this environment."
    );
  }

  const parsed = firstAdminBootstrapSchema.safeParse(
    getFirstAdminBootstrapFormValues(formData)
  );

  if (!parsed.success) {
    return bootstrapValidationError(
      "Fix the highlighted fields before creating the first internal admin.",
      parsed.error.flatten().fieldErrors
    );
  }

  try {
    await createFirstInternalAdminUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      bootstrapToken: parsed.data.bootstrapToken
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return bootstrapValidationError("A user with that email already exists.", {
        email: ["A user with that email already exists."]
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "First-admin bootstrap could not be completed.";

    if (message.toLowerCase().includes("token")) {
      return bootstrapValidationError(message, {
        bootstrapToken: [message]
      });
    }

    if (message.toLowerCase().includes("email")) {
      return bootstrapValidationError(message, {
        email: [message]
      });
    }

    return bootstrapValidationError(message);
  }

  redirect(
    withAppBasePath(
      `/login?bootstrap=success&email=${encodeURIComponent(parsed.data.email)}`
    )
  );
}
