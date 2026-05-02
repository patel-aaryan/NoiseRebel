export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface RequestRow {
  id: string
  submitter_discord_id: string
  target_discord_id: string
  url: string
  status: RequestStatus
  file_path: string | null
  created_at: Date
}
