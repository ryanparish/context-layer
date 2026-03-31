import { z } from "zod";

/** Zod v4 runs checks in order; trim/lowercase must come before `.email()`. */
export const signupSchema = z.object({
  tenantName: z.string().trim().min(2).max(100),
  tenantSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and dashes"),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  tenantSlug: z.string().trim().toLowerCase().min(2).max(50),
});

