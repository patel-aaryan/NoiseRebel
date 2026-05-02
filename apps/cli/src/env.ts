import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../../..")

const candidates = [
  path.join(repoRoot, "packages/db/.env.local"),
  path.join(repoRoot, "apps/cli/.env"),
  path.join(repoRoot, ".env.local"),
]

for (const file of candidates) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file })
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to packages/db/.env.local or export it in the environment."
  )
}
