import { z } from "zod";

export const discordIdSchema = z
  .string()
  .regex(/^\d{17,20}$/, "Must be a Discord user ID (17–20 digits).");

export const urlSchema = z.object({
  target_discord_id: discordIdSchema,
  url: z.string().url("Must be a valid URL."),
});

export type UrlFormValues = z.infer<typeof urlSchema>;
