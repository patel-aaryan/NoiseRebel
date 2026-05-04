type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type RequestSource = "url" | "upload";

export interface RequestRow {
  id: string;
  submitter_discord_id: string;
  target_discord_id: string;
  url: string;
  status: RequestStatus;
  file_path: string | null;
  source: RequestSource;
  created_at: Date;
}
