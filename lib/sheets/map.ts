import type { ContentRow, NewRowInput, Status } from '@/lib/types';
import type { SheetRawRow } from './types';
import { toAppStatus } from './status';

/** Split platform / bullet cells that may be comma, pipe, or newline separated. */
function splitList(raw: unknown): string[] | undefined {
  if (raw == null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  const text = String(raw).trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    /* plain text */
  }
  return text
    .split(/[\n|,]+/)
    .map((s) => s.replace(/^[•\-\u2022\u25CF\u2023\u2043*]+\s*/, '').trim())
    .filter(Boolean);
}

function asString(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  return String(raw);
}

function parsePostUrls(raw: unknown): Record<string, string> | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  const text = String(raw).trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function formatDate(raw: unknown): string | undefined {
  const s = asString(raw);
  if (!s) return undefined;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return s;
}

/**
 * Map a Web App row (sheet header keys) → ContentRow used by the UI.
 * Sheet headers are snake_case; source_content folds url/topic/outline.
 */
export function fromSheetRow(raw: SheetRawRow): ContentRow {
  const sourceType = (asString(raw.source_type) || undefined) as ContentRow['sourceType'];
  const sourceContent = asString(raw.source_content) || '';

  const row: ContentRow = {
    id: Number(raw.id),
    title: asString(raw.title) || '',
    status: toAppStatus(raw.status),
    sourceType,
    platforms: splitList(raw.target_platforms),
    summary: asString(raw.summary),
    keyBullets: splitList(raw.key_bullets),
    script: asString(raw.script),
    captionIG: asString(raw.captions_ig),
    captionWeb: asString(raw.captions_website),
    audioUrl: asString(raw.audio_url),
    videoUrl: asString(raw.video_url) || asString(raw.final_video_url),
    driveUrl: asString(raw.final_video_url) || asString(raw.video_url),
    postUrls: parsePostUrls(raw.post_urls),
    postedAt: asString(raw.posted_at),
    errorMessage: asString(raw.error_message),
    date: formatDate(raw.created_at),
  };

  if (sourceType === 'url') row.sourceUrl = sourceContent;
  else if (sourceType === 'outline') row.outline = sourceContent;
  else row.topic = sourceContent; // topic or unknown

  return row;
}

/** Map NewRowInput → sheet column payload for `action: "create"`. */
export function toSheetCreatePayload(input: NewRowInput): Record<string, unknown> {
  const sourceType = input.sourceType || 'topic';
  const sourceContent =
    sourceType === 'url'
      ? input.sourceUrl || ''
      : sourceType === 'outline'
        ? input.outline || ''
        : input.topic || '';

  return {
    title: input.title || '',
    source_type: sourceType,
    source_content: sourceContent,
    target_platforms: (input.platforms || []).join(', '),
  };
}

/** Ensure id is a sheet row number (≥ 2). */
export function parseRowId(id: string | number): number {
  const n = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`Invalid row id: ${id}`);
  }
  return n;
}

export type { Status };
