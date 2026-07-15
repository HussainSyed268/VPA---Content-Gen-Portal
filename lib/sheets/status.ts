import type { Status } from '@/lib/types';

/**
 * Canonical sheet status strings (exact cells written by the pipeline / UI).
 * App code uses stable Status keys; convert at the Sheets boundary only.
 */
export const SHEET_STATUS: Record<Status, string> = {
  intake: 'New ✏️',
  in_progress: 'In Progress ⏳',
  drafting: 'Writing Script ✍️',
  needs_review: 'Review Needed 👀',
  retry: 'Redo Script 🔄',
  approved: 'Approved ✅',
  rejected: 'Rejected ❌',
  voice_generating: 'Generating Voice 🎙️',
  voice_ready: 'Voice Ready 🔊',
  video_generating: 'Generating Video 🎬',
  video_ready: 'Video Ready 🎥',
  posting_approved: 'Posting Approved ✅',
  redo_video: 'Redo Video 🔁',
  posted: 'Posted 🚀',
  failed: 'Failed ❌',
};

/** Statuses the portal UI is allowed to write (never pipeline-only states). */
export const USER_WRITABLE = new Set<Status>([
  'retry',
  'approved',
  'rejected',
  'posting_approved',
  'redo_video',
]);

/**
 * Allowed user transitions. Key = current app status, value = targets.
 * Review Needed → Redo Script | Approved | Rejected
 * Video Ready   → Posting Approved | Redo Video
 */
export const USER_TRANSITIONS: Partial<Record<Status, readonly Status[]>> = {
  needs_review: ['retry', 'approved', 'rejected'],
  video_ready: ['posting_approved', 'redo_video'],
};

/** Normalized key (emoji stripped) → app Status. */
const ALIASES: Record<string, Status> = {
  // Sheet labels
  new: 'intake',
  in_progress: 'in_progress',
  writing_script: 'drafting',
  review_needed: 'needs_review',
  redo_script: 'retry',
  approved: 'approved',
  rejected: 'rejected',
  generating_voice: 'voice_generating',
  voice_ready: 'voice_ready',
  generating_video: 'video_generating',
  video_ready: 'video_ready',
  posting_approved: 'posting_approved',
  redo_video: 'redo_video',
  posted: 'posted',
  failed: 'failed',

  // App / legacy keys the Web App may still emit
  intake: 'intake',
  scraping: 'in_progress',
  drafting: 'drafting',
  needs_review: 'needs_review',
  retry: 'retry',
  scheduled: 'posting_approved',
  voice_generating: 'voice_generating',
  video_generating: 'video_generating',
  failed_scrape: 'failed',
  failed_voice: 'failed',
  failed_video: 'failed',
  link_problem: 'failed',
  voice_error: 'failed',
  video_error: 'failed',
  live: 'posted',
  received: 'intake',
  ready_to_review: 'needs_review',
  new_draft_coming: 'retry',
  not_proceeding: 'rejected',
  making_voiceover: 'voice_generating',
  voiceover_done: 'voice_ready',
  making_video: 'video_generating',
};

/** Collapse arbitrary sheet text to a lookup key. */
export function normalizeStatusKey(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function toAppStatus(raw: unknown): Status {
  const key = normalizeStatusKey(raw);
  const mapped = ALIASES[key];
  if (mapped) return mapped;
  console.warn('[sheets] Unknown status value:', raw);
  return 'intake';
}

/** Exact string to write into the sheet `status` cell. */
export function toSheetStatus(status: Status): string {
  return SHEET_STATUS[status];
}

export function assertUserTransition(
  current: Status,
  next: Status
): void {
  if (!USER_WRITABLE.has(next)) {
    throw new Error(`Status "${next}" cannot be set from the portal`);
  }
  const allowed = USER_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new Error(
      `Cannot change status from "${SHEET_STATUS[current]}" to "${SHEET_STATUS[next]}"`
    );
  }
}
