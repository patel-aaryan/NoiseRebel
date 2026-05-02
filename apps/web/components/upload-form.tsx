"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@noise-rebel/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@noise-rebel/ui/components/form";
import { Input } from "@noise-rebel/ui/components/input";

import { discordIdSchema } from "./request-form";

const MAX_SIZE = 10 * 1024 * 1024;

const uploadSchema = z.object({
  target_discord_id: discordIdSchema,
  file: z
    .custom<FileList>((v) => v instanceof FileList && v.length > 0, "Please select a file.")
    .refine((v) => v[0]?.type === "audio/mpeg" || v[0]?.name.endsWith(".mp3"), "Only MP3 files are allowed.")
    .refine((v) => (v[0]?.size ?? 0) <= MAX_SIZE, "File must be under 10 MB."),
});

type UploadValues = z.infer<typeof uploadSchema>;

type UploadResult =
  | { step: "idle" }
  | { step: "done"; id: string }
  | { step: "error"; message: string };

export function UploadForm() {
  const [result, setResult] = useState<UploadResult>({ step: "idle" });

  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { target_discord_id: "" },
  });

  async function onSubmit(values: UploadValues) {
    const file = values.file[0]!;
    setResult({ step: "idle" });

    try {
      // 1. Get presigned PUT URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDiscordId: values.target_discord_id,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "audio/mpeg",
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to get upload URL.");
      }
      const { uploadUrl, key, requestId } = await res.json();

      // 2. Upload directly to R2
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "audio/mpeg" },
      });
      if (!putRes.ok) throw new Error("Failed to upload file to storage.");

      // 3. Confirm
      const confirmRes = await fetch("/api/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          key,
          targetDiscordId: values.target_discord_id,
        }),
      });
      if (!confirmRes.ok) {
        const { error } = await confirmRes.json();
        throw new Error(error ?? "Failed to confirm upload.");
      }

      setResult({ step: "done", id: requestId });
      form.reset();
    } catch (err) {
      setResult({
        step: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="target_discord_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Discord user ID</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="123456789012345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MP3 File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  onChange={(e) => field.onChange(e.target.files)}
                  className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
              </FormControl>
              <FormDescription>Max 10 MB</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="self-start"
        >
          {form.formState.isSubmitting ? "Uploading…" : "Upload & submit"}
        </Button>
        {result.step === "done" && (
          <p className="text-sm text-emerald-600">
            Uploaded! Request id: <code>{result.id}</code>
          </p>
        )}
        {result.step === "error" && (
          <p className="text-sm text-destructive">{result.message}</p>
        )}
      </form>
    </Form>
  );
}
