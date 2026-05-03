"use server";

import { revalidatePath } from "next/cache";

import { auth, signIn, signOut } from "@/auth";
import { query } from "@noise-rebel/infra";

type SubmitState = { ok: true; id: string } | { ok: false; error: string } | null;

const AUTH_URL = process.env.AUTH_URL;
if (!AUTH_URL) throw new Error("AUTH_URL is not set");

const DISCORD_ID = /^\d{17,20}$/;

export async function submitRequest(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const session = await auth();
  if (!session?.discordId) {
    return { ok: false, error: "You must sign in with Discord first." };
  }

  const target = formData.get("target_discord_id")?.toString().trim() ?? "";
  const url = formData.get("url")?.toString().trim() ?? "";

  if (!target || !url) return { ok: false, error: "Both fields are required." };

  if (!DISCORD_ID.test(target)) return { ok: false, error: "Target must be Discord user ID." };

  try {
    new URL(url);
  } catch {
    return { ok: false, error: "Media URL is not a valid URL." };
  }

  const result = await query<{ id: string }>(
    `INSERT INTO requests (submitter_discord_id, target_discord_id, url, status)
     VALUES ($1, $2, $3, 'PENDING')
     RETURNING id`,
    [session.discordId, target, url]
  );

  revalidatePath("/");
  return { ok: true, id: result.rows[0]!.id };
}

export async function signInWithDiscord() {
  await signIn("discord", { redirectTo: AUTH_URL });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
