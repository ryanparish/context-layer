import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
});

let parsed: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (parsed) return parsed;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const keys = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${keys}`);
  }
  parsed = result.data;
  return parsed;
}

