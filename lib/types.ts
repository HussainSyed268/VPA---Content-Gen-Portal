// Content status values used across the pipeline.
// Mirrors the STATUS map and status strings in the original single-file dashboard.
export type Status =
  | 'intake'
  | 'scraping'
  | 'drafting'
  | 'needs_review'
  | 'retry'
  | 'approved'
  | 'rejected'
  | 'voice_generating'
  | 'voice_ready'
  | 'video_generating'
  | 'video_ready'
  | 'scheduled'
  | 'posted'
  | 'failed_scrape'
  | 'failed_voice'
  | 'failed_video';

// A single piece of content. Keys map 1:1 to the Google Sheet columns
// (manual §3.1). Optional fields may be blank/absent depending on status.
export interface ContentRow {
  id: string;
  date?: string;
  title: string;
  sourceType?: 'url' | 'topic' | 'outline';
  sourceUrl?: string;
  topic?: string;
  outline?: string;
  platforms?: string[];
  status: Status;
  summary?: string;
  keyBullets?: string[];
  script?: string;
  captionIG?: string;
  captionWeb?: string;
  audioUrl?: string;
  videoUrl?: string;
  driveUrl?: string;
  postUrls?: Record<string, string>;
  postedAt?: string;
  errorMessage?: string;
}

// The shape the client sends when creating a new idea (the "You" columns).
export type NewRowInput = Partial<
  Pick<ContentRow, 'title' | 'sourceType' | 'sourceUrl' | 'topic' | 'outline' | 'platforms'>
>;
