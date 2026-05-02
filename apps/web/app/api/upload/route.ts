import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { getPresignedUploadUrl } from "@noise-rebel/infra/r2";
import { query } from "@noise-rebel/infra";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["audio/mpeg", "audio/mp3"]);

/**
 * POST /api/upload
 *
 * Authenticated users call this to get a presigned PUT URL for uploading an
 * MP3 directly to R2.  The response also contains the `key` (R2 object key)
 * so the client can confirm the upload afterwards.
 *
 * Body: { targetDiscordId: string, fileName: string, fileSize: number, fileType: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { targetDiscordId, fileName, fileSize, fileType } = body as {
    targetDiscordId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  };

  // Validate inputs
  if (!targetDiscordId || !/^\d{17,20}$/.test(targetDiscordId)) {
    return NextResponse.json(
      { error: "Target must be a Discord user ID (17–20 digits)." },
      { status: 400 }
    );
  }

  if (!fileName || !fileSize || !fileType) {
    return NextResponse.json({ error: "Missing file metadata." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json({ error: "Only MP3 files are allowed." }, { status: 400 });
  }

  if (fileSize > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 10 MB." }, { status: 400 });
  }

  // Generate an R2 key and a presigned PUT URL
  const requestId = randomUUID();
  const key = `audios/${requestId}.mp3`;
  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, key, requestId });
}

/**
 * PUT /api/upload
 *
 * Called by the client *after* the file has been uploaded to R2.
 * Creates the `requests` row with `source = 'upload'`.
 *
 * Body: { requestId: string, key: string, targetDiscordId: string }
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, key, targetDiscordId } = body as {
    requestId: string;
    key: string;
    targetDiscordId: string;
  };

  if (!requestId || !key || !targetDiscordId) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  await query(
    `INSERT INTO requests (id, submitter_discord_id, target_discord_id, url, status, file_path, source)
     VALUES ($1, $2, $3, $4, 'PENDING', $5, 'upload')`,
    [requestId, session.discordId, targetDiscordId, `r2://${key}`, key]
  );

  return NextResponse.json({ ok: true, id: requestId });
}
