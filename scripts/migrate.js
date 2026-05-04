#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * This script handles running db-migrate with proper environment variable loading
 * for both development and production environments.
 */

import { spawn } from "node:child_process"
import path, { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"
import dotenv from "dotenv"

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Determine environment
const isProduction = process.env.NODE_ENV === "production"
const isCI = process.env.CI === "true"

// Load appropriate .env file for development
if (!isProduction && !isCI) {
  const repoRoot = path.join(__dirname, "..")
  const envCandidates = [
    path.join(repoRoot, "packages", "infra", ".env.local"),
    path.join(repoRoot, "packages", "server", "db", ".env.local"),
    path.join(repoRoot, ".env.local"),
  ]

  let envLoaded = false
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath })
      console.log(`✓ Loaded environment from ${path.relative(repoRoot, envPath)}`)
      envLoaded = true
    }
  }

  if (!envLoaded) {
    const rel = envCandidates.map((p) => path.relative(repoRoot, p)).join(", ")
    console.warn("⚠ Warning: no .env.local found")
    console.warn(`  Checked: ${rel}`)
    console.warn("  Make sure DATABASE_URL is set in your environment\n")
  }
} else {
  console.log(`✓ Running in ${isProduction ? "production" : "CI"} mode`)
}

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set")
  console.error("\nFor development, make sure you have .env.local with:")
  console.error("  DATABASE_URL=postgresql://...\n")
  process.exit(1)
}

// Migrations live in packages/infra/src/migrations (infra package)
const migrationsDir = "src/migrations"

// Get the command (up, down, reset, etc.)
const command = process.argv[2] || "up"
const args = process.argv.slice(3)

console.log(`\n🔄 Running database migration: ${command}\n`)

// Always use migrations dir in the db package; for create, add --sql-file
let dbMigrateArgs = ["-m", migrationsDir, command, ...args]
if (command === "create" && !args.includes("--sql-file")) {
  dbMigrateArgs.push("--sql-file")
}

// Run db-migrate from the db package (finds database.json there)
const dbMigrate = spawn(
  "pnpm",
  ["--filter", "@noise-rebel/infra", "exec", "db-migrate", ...dbMigrateArgs],
  {
    stdio: "inherit",
    env: process.env,
    shell: true,
    cwd: path.join(__dirname, ".."),
  }
)

dbMigrate.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ Migration completed successfully\n")
  } else {
    console.error(`\n❌ Migration failed with exit code ${code}\n`)
    process.exit(code)
  }
})

dbMigrate.on("error", (err) => {
  console.error("❌ Failed to start migration process:", err)
  process.exit(1)
})
