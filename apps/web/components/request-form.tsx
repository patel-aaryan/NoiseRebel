"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@noise-rebel/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@noise-rebel/ui/components/form";
import { Input } from "@noise-rebel/ui/components/input";

import { submitRequest } from "@/app/actions";
import { type UrlFormValues, urlSchema } from "@/lib/form-schemas";
import { UploadForm } from "./upload-form";

function UrlForm() {
  const [result, setResult] = useState<
    { ok: true; id: string } | { ok: false; error: string } | null
  >(null);

  const form = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
    defaultValues: { target_discord_id: "", url: "" },
  });

  async function onSubmit(values: UrlFormValues) {
    const data = new FormData();
    data.set("target_discord_id", values.target_discord_id);
    data.set("url", values.url);
    const res = await submitRequest(null, data);
    setResult(res);
    if (res?.ok) form.reset();
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
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Media URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://youtube.com/watch?v=..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
          {form.formState.isSubmitting ? "Submitting…" : "Submit request"}
        </Button>
        {result?.ok && (
          <p className="text-sm text-emerald-600">
            Submitted! Request id: <code>{result.id}</code>
          </p>
        )}
        {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}
      </form>
    </Form>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

type Mode = "url" | "upload";

export function RequestForm() {
  const [mode, setMode] = useState<Mode>("url");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex gap-1 self-start rounded-md border border-input p-1">
        {(["url", "upload"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "url" ? "Paste URL" : "Upload MP3"}
          </button>
        ))}
      </div>

      {mode === "url" ? <UrlForm /> : <UploadForm />}
    </div>
  );
}
