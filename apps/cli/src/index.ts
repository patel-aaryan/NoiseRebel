import "./env"

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
} from "@clack/prompts"
import pc from "picocolors"

import { pool, query } from "@noise-rebel/infra"
import { uploadFile } from "@noise-rebel/infra/r2"

import type { RequestRow } from "@noise-rebel/types"

const AUDIOS_DIR = process.env.AUDIOS_DIR ?? "/app/audios"

type Action = "approve" | "reject" | "skip" | "quit"

async function fetchPending(): Promise<RequestRow[]> {
  const res = await query<RequestRow>(
    `SELECT id, submitter_discord_id, target_discord_id, url, status, file_path, source, created_at
     FROM requests
     WHERE status = 'PENDING'
     ORDER BY created_at ASC`
  )
  return res.rows
}

function formatRequest(req: RequestRow, index: number, total: number): string {
  const source = req.source ?? "url"
  return [
    `${pc.dim(`[${index + 1}/${total}]`)} ${pc.bold(req.id)}`,
    `  ${pc.cyan("submitter")} ${req.submitter_discord_id}`,
    `  ${pc.cyan("target   ")} ${req.target_discord_id}`,
    `  ${pc.cyan("url      ")} ${req.url}`,
    `  ${pc.cyan("source   ")} ${source === "upload" ? pc.magenta("MP3 upload") : "URL"}`,
    `  ${pc.cyan("created  ")} ${req.created_at.toISOString()}`,
  ].join("\n")
}

function downloadAudio(req: RequestRow): string {
  const filename = `${req.id}.mp3`
  const outputPath = path.join(AUDIOS_DIR, filename)
  const command = `yt-dlp -x --audio-format mp3 -o ${JSON.stringify(outputPath)} ${JSON.stringify(req.url)}`
  execSync(command, { stdio: "inherit" })
  return filename
}

async function approve(req: RequestRow): Promise<void> {
  const source = req.source ?? "url"

  if (source === "upload") {
    // File already in R2 — just mark as approved
    await query(
      `UPDATE requests SET status = 'APPROVED' WHERE id = $1`,
      [req.id]
    )
    log.success(`Approved ${pc.bold(req.id)} ${pc.dim("(file already in R2)")}`)
    return
  }

  // URL-based: download with yt-dlp, then upload to R2
  const s = spinner()
  s.start(`Downloading audio for ${req.id}`)
  let filename: string
  let localPath: string
  try {
    filename = downloadAudio(req)
    localPath = path.join(AUDIOS_DIR, filename)
  } catch (err) {
    s.stop(pc.red("Download failed"))
    throw err
  }
  s.stop(pc.green(`Downloaded → ${localPath}`))

  // Upload to R2
  const r2Key = `audios/${req.id}.mp3`
  const s2 = spinner()
  s2.start("Uploading to R2…")
  try {
    const fileBuffer = fs.readFileSync(localPath)
    await uploadFile(r2Key, fileBuffer, "audio/mpeg")
  } catch (err) {
    s2.stop(pc.red("R2 upload failed"))
    throw err
  }
  s2.stop(pc.green(`Uploaded → r2://${r2Key}`))

  await query(
    `UPDATE requests SET status = 'APPROVED', file_path = $1 WHERE id = $2`,
    [r2Key, req.id]
  )
  log.success(`Approved ${pc.bold(req.id)}`)

  // Clean up local file
  try {
    fs.unlinkSync(localPath)
  } catch {
    // non-fatal
  }
}

async function reject(req: RequestRow): Promise<void> {
  const sure = await confirm({
    message: `Delete request ${pc.bold(req.id)}? This cannot be undone.`,
    initialValue: false,
  })
  if (isCancel(sure) || !sure) {
    log.info("Rejection cancelled.")
    return
  }
  await query(`DELETE FROM requests WHERE id = $1`, [req.id])
  log.warn(`Deleted ${pc.bold(req.id)}`)
}

async function promptAction(): Promise<Action> {
  const choice = await select<Action>({
    message: "Decision?",
    options: [
      { value: "approve", label: pc.green("Approve") + " — download & mark APPROVED" },
      { value: "reject", label: pc.red("Reject") + " — delete the row" },
      { value: "skip", label: "Skip — leave PENDING for later" },
      { value: "quit", label: "Quit review" },
    ],
  })
  if (isCancel(choice)) return "quit"
  return choice
}

async function main(): Promise<void> {
  intro(pc.bgCyan(pc.black(" noise-rebel review queue ")))

  const pending = await fetchPending()
  if (pending.length === 0) {
    outro(pc.green("Inbox zero. No pending requests."))
    return
  }

  note(`${pending.length} pending request(s)\nAudios dir: ${AUDIOS_DIR}`, "queue")

  for (let i = 0; i < pending.length; i++) {
    const req = pending[i]!
    log.message(formatRequest(req, i, pending.length))

    const action = await promptAction()
    if (action === "quit") break
    if (action === "skip") {
      log.info("Skipped.")
      continue
    }
    try {
      if (action === "approve") await approve(req)
      else await reject(req)
    } catch (err) {
      log.error(err instanceof Error ? err.message : String(err))
      const keepGoing = await confirm({
        message: "Continue with the next request?",
        initialValue: true,
      })
      if (isCancel(keepGoing) || !keepGoing) break
    }
  }

  outro(pc.green("Done."))
}

try {
  await main()
} catch (err) {
  cancel(err instanceof Error ? err.message : String(err))
  process.exitCode = 1
} finally {
  await pool().end()
}
