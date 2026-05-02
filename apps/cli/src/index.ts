import "./env"

import { execSync } from "node:child_process"
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

import { pool, query } from "@noise-rebel/db"

import type { RequestRow } from "@noise-rebel/types"

const AUDIOS_DIR = process.env.AUDIOS_DIR ?? "/app/audios"

type Action = "approve" | "reject" | "skip" | "quit"

async function fetchPending(): Promise<RequestRow[]> {
  const res = await query<RequestRow>(
    `SELECT id, submitter_discord_id, target_discord_id, url, status, file_path, created_at
     FROM requests
     WHERE status = 'PENDING'
     ORDER BY created_at ASC`
  )
  return res.rows
}

function formatRequest(req: RequestRow, index: number, total: number): string {
  return [
    `${pc.dim(`[${index + 1}/${total}]`)} ${pc.bold(req.id)}`,
    `  ${pc.cyan("submitter")} ${req.submitter_discord_id}`,
    `  ${pc.cyan("target   ")} ${req.target_discord_id}`,
    `  ${pc.cyan("url      ")} ${req.url}`,
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
  const s = spinner()
  s.start(`Downloading audio for ${req.id}`)
  let filename: string
  try {
    filename = downloadAudio(req)
  } catch (err) {
    s.stop(pc.red("Download failed"))
    throw err
  }
  s.stop(pc.green(`Downloaded → ${path.join(AUDIOS_DIR, filename)}`))

  await query(
    `UPDATE requests SET status = 'APPROVED', file_path = $1 WHERE id = $2`,
    [filename, req.id]
  )
  log.success(`Approved ${pc.bold(req.id)}`)
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
