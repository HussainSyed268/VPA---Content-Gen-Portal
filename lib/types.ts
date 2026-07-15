// Content status values — stable app keys. Sheet cells use the emoji labels
// in lib/sheets/status.ts (SHEET_STATUS).
export type Status =
  | 'intake' // New ✏️
  | 'in_progress' // In Progress ⏳
  | 'drafting' // Writing Script ✍️
  | 'needs_review' // Review Needed 👀
  | 'retry' // Redo Script 🔄
  | 'approved' // Approved ✅
  | 'rejected' // Rejected ❌
  | 'voice_generating' // Generating Voice 🎙️
  | 'voice_ready' // Voice Ready 🔊
  | 'video_generating' // Generating Video 🎬
  | 'video_ready' // Video Ready 🎥
  | 'posting_approved' // Posting Approved ✅
  | 'redo_video' // Redo Video 🔁
  | 'posted' // Posted 🚀
  | 'failed'; // Failed ❌

// A single piece of content. Keys map to sheet columns via lib/sheets/map.ts.
export interface ContentRow {
  /** Sheet row number (header is row 1; data starts at 2). Not a stored column. */
  id: number;
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
