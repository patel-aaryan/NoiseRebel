import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | undefined;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/**
 * HTTPS URL for an object key on your public R2 (or CDN) domain.
 * `R2_PUBLIC_BASE_URL` must be like `https://media.example.com` (no trailing slash).
 */
export function publicObjectUrl(key: string): string {
  const raw = process.env.R2_PUBLIC_BASE_URL;
  if (!raw?.trim()) throw new Error("R2_PUBLIC_BASE_URL is not set");

  const base = raw.replace(/\/$/, "");
  const k = key.startsWith("/") ? key.slice(1) : key;
  return `${base}/${k}`;
}

/** Lazy-initialised S3-compatible client pointed at Cloudflare R2. */
export function r2Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${env("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

function bucket(): string {
  return env("R2_BUCKET_NAME");
}

/**
 * Returns a presigned PUT URL so a client can upload directly to R2.
 * @param key      Object key, e.g. `"audios/<uuid>.mp3"`
 * @param contentType  MIME type of the file (e.g. `"audio/mpeg"`)
 * @param expiresIn Seconds until the URL expires (default 10 min)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  return getSignedUrl(
    r2Client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

/**
 * Server-side upload: stream / buffer → R2.
 * Used by the CLI after yt-dlp to push files into the bucket.
 */
export async function uploadFile(
  key: string,
  body: Buffer | ReadableStream | Uint8Array,
  contentType: string
): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body as any,
      ContentType: contentType,
    })
  );
}

/**
 * Delete an object from R2.
 */
export async function deleteFile(key: string): Promise<void> {
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    })
  );
}
