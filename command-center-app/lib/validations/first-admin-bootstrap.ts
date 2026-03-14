import { z } from "zod";

function hasLowercase(value: string) {
  return /[a-z]/.test(value);
}

function hasUppercase(value: string) {
  return /[A-Z]/.test(value);
}

function hasNumber(value: string) {
  return /\d/.test(value);
}

export const firstAdminBootstrapSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter the admin's full name.")
      .max(191, "Name must be 191 characters or fewer."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid work email address."),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters long.")
      .max(72, "Password must be 72 characters or fewer.")
      .refine(hasLowercase, {
        message: "Password must include a lowercase letter."
      })
      .refine(hasUppercase, {
        message: "Password must include an uppercase letter."
      })
      .refine(hasNumber, {
        message: "Password must include a number."
      }),
    confirmPassword: z.string(),
    bootstrapToken: z
      .string()
      .trim()
      .min(1, "Enter the bootstrap token for this environment.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match."
  });

export type FirstAdminBootstrapInput = z.infer<
  typeof firstAdminBootstrapSchema
>;
