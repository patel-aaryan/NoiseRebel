import { Pool } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set")

export const pool = new Pool({ connectionString: DATABASE_URL })
