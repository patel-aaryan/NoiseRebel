"use client";

import { useActionState } from "react";

import { Button } from "@noise-rebel/ui/components/button";

import { submitRequest, type SubmitState } from "@/app/actions";

export function RequestForm() {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitRequest,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Target Discord user ID</span>
        <input
          name="target_discord_id"
          required
          inputMode="numeric"
          pattern="\d{17,20}"
          placeholder="123456789012345678"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Media URL</span>
        <input
          name="url"
          type="url"
          required
          placeholder="https://youtube.com/watch?v=..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Submit request"}
      </Button>
      {state && state.ok ? (
        <p className="text-sm text-emerald-600">
          Submitted! Request id: <code>{state.id}</code>
        </p>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
