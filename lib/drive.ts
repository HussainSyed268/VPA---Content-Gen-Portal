/**
 * Google Drive share / view URLs → embeddable preview URL for playback.
 * Supports:
 *   https://drive.google.com/file/d/FILE_ID/view?...
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID&export=download
 *   https://drive.google.com/file/d/FILE_ID/preview
 *
 * Note: Drive `/preview` iframes are unreliable on mobile in general (not
 * just iOS/Safari) — small viewports, in-app/webview browsers, and
 * third-party cookie restrictions all cause the embed to fail or render
 * blank/broken. Prefer opening the view URL directly on those clients.
 */

const FILE_ID_RE =
  /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/(?:open|uc)\?.*?[?&]id=|drive\.google\.com\/uc\?export=download&id=)([a-zA-Z0-9_-]+)/i;

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  try {
    const u = new URL(url);
    if (u.hostname.includes('drive.google.com')) {
      const id = u.searchParams.get('id');
      if (id) return id;
    }
  } catch {
    /* ignore */
  }
  const fallback = url.match(FILE_ID_RE);
  return fallback ? fallback[1] : null;
}

/** URL suitable for an iframe player (Drive preview). */
export function toDrivePreviewUrl(url: string): string | null {
  const id = extractDriveFileId(url);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

/** Canonical open-in-Drive link (for "open" / copy). */
export function toDriveViewUrl(url: string): string {
  const id = extractDriveFileId(url);
  if (!id) return url;
  return `https://drive.google.com/file/d/${id}/view`;
}

/**
 * Drive preview iframes are unreliable on:
 *  - iOS and Safari (desktop + mobile), due to Intelligent Tracking
 *    Prevention / third-party cookie blocking, and
 *  - mobile devices generally (Android included), where the embed is
 *    often too small/broken to be worth showing at all.
 * On those clients, skip the iframe and open the file in Drive instead.
 */
export function driveEmbedUnreliable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|Firefox|FxiOS/i.test(ua);
  const isMobileUA = /Android|Mobi|Mobile|Windows Phone/i.test(ua);
  const isCoarsePointer =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 820px)').matches;
  return isIOS || isSafari || isMobileUA || isCoarsePointer;
}
