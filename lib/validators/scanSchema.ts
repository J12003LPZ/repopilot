import { z } from "zod";
import { parseRepoUrl } from "@/lib/github/parseRepoUrl";

export const createScanSchema = z.object({
  githubUrl: z
    .string()
    .min(1, "GitHub URL is required")
    .refine((v) => parseRepoUrl(v) !== null, {
      message: "Enter a valid public github.com repository URL",
    }),
  deployedUrl: z
    .url("Enter a valid URL")
    .refine((v) => v.startsWith("https://") || v.startsWith("http://"), {
      message: "Enter an http or https URL",
    })
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
