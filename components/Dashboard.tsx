'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRows, createRow, updateStatus } from '@/lib/client';
import type { ContentRow } from '@/lib/types';

/* ============================================================
   STATUS MAP — from Section 4, in plain English
   ============================================================ */
const STATUS: Record<string, { label: string; klass: string; say: string }> = {
  intake: { label: 'Received', klass: 'st-working', say: 'The engine just got your idea and is picking it up.' },
  scraping: { label: 'Reading your link', klass: 'st-working', say: 'Fetching the content from your link.' },
  failed_scrape: { label: 'Link problem', klass: 'st-stop', say: 'Couldn’t open that link. Check it’s correct, then try again.' },
  drafting: { label: 'Writing script', klass: 'st-working', say: 'Researching the topic and writing your script — back shortly.' },
  needs_review: { label: 'Ready to review', klass: 'st-review', say: 'Your script is ready! Read it, then choose Approve, Retry, or Reject.' },
  approved: { label: 'Approved', klass: 'st-ready', say: 'You approved it — voice & video are being made. Sit back.' },
  retry: { label: 'New draft coming', klass: 'st-working', say: 'A fresh version of the script is on the way.' },
  rejected: { label: 'Not proceeding', klass: 'st-stop', say: 'This one was stopped and archived. No further action.' },
  voice_generating: { label: 'Making voiceover', klass: 'st-working', say: 'Recording the voiceover in Dr. Bob’s cloned voice.' },
  voice_ready: { label: 'Voiceover done', klass: 'st-working', say: 'Voiceover is done — video is next.' },
  video_generating: { label: 'Making video', klass: 'st-working', say: 'Rendering the AI avatar video. This can take a few minutes.' },
  video_ready: { label: 'Video ready', klass: 'st-ready', say: 'Your video is done! Give it a quick watch.' },
  scheduled: { label: 'Scheduled', klass: 'st-ready', say: 'Queued to post automatically at the best time.' },
  posted: { label: 'Live', klass: 'st-live', say: 'Published! Tap Share to grab the links.' },
  failed_voice: { label: 'Voice error', klass: 'st-stop', say: 'Something went wrong with the voice. The VPA team is on it.' },
  failed_video: { label: 'Video error', klass: 'st-stop', say: 'Something went wrong with the video. The VPA team is on it.' },
};

// Top stat cards — action-oriented buckets. Each is a filter AND a live count.
const STAGES = [
  { key: 'review', label: 'Scripts to review', color: 'var(--warn)', icon: '👀', statuses: ['needs_review'] },
  { key: 'approve', label: 'Videos to approve', color: 'var(--brand)', icon: '🎥', statuses: ['video_ready'] },
  { key: 'production', label: 'In production', color: '#7C5CD6', icon: '🎬', statuses: ['intake', 'scraping', 'drafting', 'retry', 'approved', 'voice_generating', 'voice_ready', 'video_generating', 'scheduled'] },
  { key: 'published', label: 'Published', color: 'var(--ok)', icon: '🚀', statuses: ['posted'] },
  { key: 'attention', label: 'Needs attention', color: 'var(--danger)', icon: '⚠️', statuses: ['failed_scrape', 'failed_voice', 'failed_video'] },
];

// Pipeline board columns, left -> right.
const COLUMNS = [
  { key: 'drafting', label: 'Drafting', icon: '📝', statuses: ['intake', 'scraping', 'drafting', 'retry'] },
  { key: 'screview', label: 'Script Review', icon: '👀', statuses: ['needs_review'] },
  { key: 'production', label: 'In Production', icon: '🎬', statuses: ['approved', 'voice_generating', 'voice_ready', 'video_generating'] },
  { key: 'vreview', label: 'Video Review', icon: '🎥', statuses: ['video_ready'] },
  { key: 'published', label: 'Published', icon: '🚀', statuses: ['scheduled', 'posted'] },
  { key: 'attention', label: 'Needs Attention', icon: '⚠️', statuses: ['failed_scrape', 'failed_voice', 'failed_video', 'rejected'] },
];

// Per-status pill shown on pipeline cards: label, emoji, colour tone.
const PIPE: Record<string, { pill: string; ic: string; tone: string }> = {
  intake: { pill: 'In progress', ic: '⏳', tone: 'grey' },
  scraping: { pill: 'Reading link', ic: '🔗', tone: 'grey' },
  drafting: { pill: 'Writing script', ic: '✍️', tone: 'grey' },
  retry: { pill: 'Redo script', ic: '🔄', tone: 'amber' },
  needs_review: { pill: 'Review needed', ic: '👀', tone: 'amber' },
  approved: { pill: 'Script approved', ic: '✅', tone: 'purple' },
  voice_generating: { pill: 'Recording voice', ic: '🎙️', tone: 'purple' },
  voice_ready: { pill: 'Voice ready', ic: '🎙️', tone: 'purple' },
  video_generating: { pill: 'Filming avatar', ic: '🎬', tone: 'purple' },
  video_ready: { pill: 'Video ready', ic: '🎥', tone: 'blue' },
  scheduled: { pill: 'Approved to post', ic: '✅', tone: 'green' },
  posted: { pill: 'Posted', ic: '🚀', tone: 'green' },
  failed_scrape: { pill: 'Failed', ic: '⚠️', tone: 'red' },
  failed_voice: { pill: 'Failed', ic: '⚠️', tone: 'red' },
  failed_video: { pill: 'Failed', ic: '⚠️', tone: 'red' },
  rejected: { pill: 'Rejected', ic: '🚫', tone: 'grey' },
};

// 4-step progress tracker: Idea -> Script -> Video -> Published
const STAGE_OF: Record<string, number> = {
  intake: 1, scraping: 1, failed_scrape: 1,
  drafting: 2, needs_review: 2, retry: 2, rejected: 2,
  approved: 3, voice_generating: 3, voice_ready: 3, video_generating: 3, video_ready: 3, failed_voice: 3, failed_video: 3,
  scheduled: 4, posted: 4,
};
const STAGE_LABELS = ['Idea', 'Script', 'Video', 'Published'];

/* ============================================================
   HELPERS (ported from the original)
   ============================================================ */
function esc(s?: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function platText(p?: string[]) {
  return p && p.length ? p.join(' · ') : '—';
}
function platIcon(x: string) {
  if (x === 'Instagram') return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>';
  if (x === 'Website') return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M3 12h18" stroke="currentColor" stroke-width="2"/></svg>';
  if (x === 'YouTube') return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M10 9l5 3-5 3V9Z" fill="currentColor"/></svg>';
  return '';
}
function platBadges(p?: string[]) {
  if (!p) return '';
  const m: Record<string, string> = { Instagram: 'ig', Website: 'web', YouTube: 'yt' };
  return p.map((x) => `<span class="pbadge ${m[x] || ''}" title="${x}">${platIcon(x)}</span>`).join('');
}
function emptyBlock(msg: string) {
  return `<div class="empty"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><div>${msg}</div></div>`;
}

// Searchable date forms so "Jul", "2026", "7/2/2026" or "2026-07-02" all match.
function dateHay(r: ContentRow) {
  const out: string[] = [];
  [r.date, r.postedAt].filter(Boolean).forEach((s) => {
    out.push(s as string);
    const d = new Date(s as string);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
      out.push(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`, `${m}/${day}/${y}`);
    }
  });
  return out;
}

function trackerHTML(status: string) {
  const stage = STAGE_OF[status] || 1;
  const posted = status === 'posted';
  const errored = ['failed_scrape', 'failed_voice', 'failed_video'].includes(status);
  const stopped = status === 'rejected';
  let segs = '', labs = '';
  for (let i = 1; i <= 4; i++) {
    let seg = '';
    if (posted || i < stage) seg = 'done';
    else if (i === stage) seg = errored ? 'error' : (stopped ? 'stopped' : 'current');
    segs += `<div class="seg ${seg}"></div>`;
    const lab = (posted || i <= stage) ? (errored && i === stage ? 'err' : 'on') : '';
    labs += `<span class="${lab}">${STAGE_LABELS[i - 1]}</span>`;
  }
  return `<div class="track"><div class="tsegs">${segs}</div><div class="tlabels">${labs}</div></div>`;
}

// CSV export — columns follow Section 3.1 of the manual — every detail included.
function csvFor(rows: ContentRow[]) {
  const cols: [string, (r: ContentRow) => any][] = [
    ['Title', (r) => r.title],
    ['Date Added', (r) => r.date],
    ['Source Type', (r) => r.sourceType],
    ['Source URL', (r) => r.sourceUrl],
    ['Topic', (r) => r.topic],
    ['Outline / Script', (r) => r.outline],
    ['Target Platforms', (r) => (r.platforms || []).join(', ')],
    ['Status', (r) => r.status],
    ['Status (plain)', (r) => (STATUS[r.status] || ({} as any)).label],
    ['Summary', (r) => r.summary],
    ['Key Bullets', (r) => (r.keyBullets || []).join(' | ')],
    ['Script', (r) => r.script],
    ['Caption (IG)', (r) => r.captionIG],
    ['Caption (Website)', (r) => r.captionWeb],
    ['Audio URL', (r) => r.audioUrl],
    ['Video URL', (r) => r.videoUrl],
    ['Google Drive URL', (r) => r.driveUrl],
    ['Platform Post URLs', (r) => (r.postUrls ? Object.entries(r.postUrls).map(([k, v]) => k + ': ' + v).join(' | ') : '')],
    ['Posted At', (r) => r.postedAt],
    ['Error Message', (r) => r.errorMessage],
  ];
  const cell = (v: any) => '"' + (v == null ? '' : String(v)).replace(/"/g, '""') + '"';
  const header = cols.map((c) => cell(c[0])).join(',');
  const body = rows.map((r) => cols.map((c) => cell(c[1](r))).join(',')).join('\r\n');
  return '﻿' + header + '\r\n' + body; // BOM so Excel reads emoji/accents
}

// Turn "Jul 2, 2026" or "2026-07-02" into a comparable YYYYMMDD number.
function rowDateNum(r: ContentRow) {
  const s = r.date || r.postedAt; if (!s) return null;
  const d = new Date(s); if (isNaN(d.getTime())) return null;
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function inputDateNum(val: string) {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

type ModalState = { title: string; body: string } | null;

export default function Dashboard() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [view, setView] = useState<'home' | 'library' | 'export'>('home');

  // Create form state
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<'url' | 'topic' | 'outline' | null>(null);
  const [urlVal, setUrlVal] = useState('');
  const [topicVal, setTopicVal] = useState('');
  const [outlineVal, setOutlineVal] = useState('');
  const [plats, setPlats] = useState<string[]>([]);
  const [confirmShown, setConfirmShown] = useState(false);

  // My Content state
  const [viewMode, setViewMode] = useState<'review' | 'pipeline'>('review');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [synced, setSynced] = useState('');

  // Export state
  const [expKw, setExpKw] = useState('');
  const [expFrom, setExpFrom] = useState('');
  const [expTo, setExpTo] = useState('');

  // Modal + toast
  const [modal, setModal] = useState<ModalState>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const r = await fetchRows();
    setRows(r);
  }, []);

  // init — load rows + set the "Last synced" time after mount (avoids hydration mismatch)
  useEffect(() => {
    reload();
    refreshSynced();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshSynced() {
    const t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setSynced(t);
  }

  function toast(msg: string) {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2600);
  }

  function go(v: 'home' | 'library' | 'export') {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (v === 'home') resetCreate();
    if (v === 'library' || v === 'export') reload();
  }

  // ---------- Needs-review signal ----------
  const needsReview = rows.filter((r) => r.status === 'needs_review').length;

  function reviewNow() {
    setActiveFilter('review');
    setViewMode('review');
    go('library');
  }

  // ---------- Create form ----------
  function pickSource(type: 'url' | 'topic' | 'outline') {
    setSourceType(type);
  }
  function togglePlat(p: string) {
    setPlats((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }
  function validateForm() {
    const t = title.trim();
    let srcOk = false;
    if (sourceType === 'url') srcOk = urlVal.trim().length > 3;
    if (sourceType === 'topic') srcOk = topicVal.trim().length > 2;
    if (sourceType === 'outline') srcOk = outlineVal.trim().length > 2;
    return !!(t && sourceType && srcOk && plats.length > 0);
  }
  async function submitCreate() {
    if (!validateForm()) return;
    const row = {
      title: title.trim(),
      sourceType: sourceType || undefined,
      sourceUrl: sourceType === 'url' ? urlVal.trim() : '',
      topic: sourceType === 'topic' ? topicVal.trim() : '',
      outline: sourceType === 'outline' ? outlineVal.trim() : '',
      platforms: plats,
    };
    await createRow(row);
    setConfirmShown(true);
    reload();
    const anchor = document.getElementById('formAnchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function resetCreate() {
    setConfirmShown(false);
    setTitle('');
    setUrlVal('');
    setTopicVal('');
    setOutlineVal('');
    setSourceType(null);
    setPlats([]);
  }

  // ---------- Library ----------
  function setFilter(k: string) {
    setActiveFilter((cur) => (cur === k ? 'all' : k));
    setViewMode('review');
  }
  function onSearch(v: string) {
    setSearchTerm(v.trim().toLowerCase());
  }
  function clearSearch() {
    setSearchTerm('');
  }

  function filterRows(all: ContentRow[]) {
    let shown = all;
    if (activeFilter !== 'all') {
      const st = STAGES.find((s) => s.key === activeFilter);
      if (st) shown = all.filter((r) => st.statuses.includes(r.status));
    }
    if (searchTerm) {
      shown = shown.filter((r) => {
        const hay = [r.title, r.topic, r.summary, r.sourceUrl, r.outline, ...dateHay(r)]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(searchTerm);
      });
    }
    return shown;
  }

  async function act(id: string, status: string) {
    await updateStatus(id, status as any);
    const msg = status === 'approved' ? 'Approved! Your video is being made.'
      : status === 'scheduled' ? 'Approved — scheduled to publish. 🎉'
      : status === 'retry' ? 'Sent back for a redo.'
      : 'Marked as rejected.';
    toast(msg);
    refreshSynced();
    reload();
  }

  // ---------- Modals ----------
  function closeModal() { setModal(null); }
  function openItem(id: string) {
    const r = rows.find((x) => x.id === id); if (!r) return;
    const s = STATUS[r.status] || ({} as any);
    let body = `<p style="margin-top:0"><span class="status ${s.klass}"><span class="led"></span>${s.label}</span></p>
      <div class="block">${s.say || ''}</div>`;
    if (r.summary) body += `<h4>Summary</h4><div class="block">${esc(r.summary)}</div>`;
    if (r.script) body += `<h4>Script</h4><div class="block">${esc(r.script)}</div>`;
    if (r.captionIG) body += `<h4>Instagram caption</h4><div class="block">${esc(r.captionIG)}</div>`;
    if (r.captionWeb) body += `<h4>Website caption</h4><div class="block">${esc(r.captionWeb)}</div>`;
    if (r.status === 'needs_review') {
      body += `<div class="card-actions" style="margin-top:8px">
        <button class="abtn a-approve" data-act="approved" data-id="${r.id}" data-close="1">Approve</button>
        <button class="abtn a-retry" data-act="retry" data-id="${r.id}" data-close="1">Redo</button>
        <button class="abtn a-reject" data-act="rejected" data-id="${r.id}" data-close="1">Reject</button>
        <span class="act-hint">Approving creates the video in Dr. Bob’s voice.</span>
      </div>`;
    }
    setModal({ title: r.title, body });
  }
  function openVideo(id: string) {
    const r = rows.find((x) => x.id === id); if (!r) return;
    const link = r.videoUrl || r.driveUrl || '#';
    let body = `<div class="videobox"><div class="play"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M8 6v12l10-6-10-6Z" fill="currentColor"/></svg></div></div>
      <div class="share-row"><input value="${link}" readonly data-select="1" /><button data-copy="${link}">Copy</button></div>`;
    if (r.driveUrl) body += `<p style="color:var(--muted);font-size:13.5px">Also saved to your Google Drive automatically.</p>`;
    setModal({ title: 'Watch: ' + r.title, body });
  }
  function openShare(id: string) {
    const r = rows.find((x) => x.id === id); if (!r) return;
    let body = '';
    const links = r.postUrls || {};
    const platsWithLinks = Object.keys(links);
    if (platsWithLinks.length) {
      body += `<h4>Live post links</h4>`;
      platsWithLinks.forEach((p) => {
        body += `<div class="share-row"><input value="${links[p]}" readonly data-select="1" /><button data-copy="${links[p]}">Copy</button></div>`;
      });
    }
    const vid = r.videoUrl || r.driveUrl;
    if (vid) {
      body += `<h4 style="margin-top:16px">Video link</h4>
        <div class="share-row"><input value="${vid}" readonly data-select="1" /><button data-copy="${vid}">Copy</button></div>`;
    }
    if (!body) body = `<div class="block">Links will appear here once this video is published.</div>`;
    setModal({ title: 'Share: ' + r.title, body });
  }
  function copyText(t: string) {
    navigator.clipboard?.writeText(t);
    toast('Link copied to clipboard');
  }

  // Delegate clicks inside the dynamically-built modal body.
  function onModalClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest('[data-act],[data-copy],[data-select]') as HTMLElement | null;
    if (!el) return;
    if (el.hasAttribute('data-select')) { (el as HTMLInputElement).select(); return; }
    const copy = el.getAttribute('data-copy');
    if (copy != null) { copyText(copy); return; }
    const actName = el.getAttribute('data-act');
    if (actName) {
      const id = el.getAttribute('data-id')!;
      act(id, actName);
      if (el.getAttribute('data-close')) closeModal();
    }
  }

  // ---------- Card HTML (Review Queue) ----------
  function cardHTML(r: ContentRow) {
    const s = STATUS[r.status] || { label: r.status, klass: 'st-working', say: '' };
    let mid = `<div class="say">${s.say}</div>`;
    if (r.status === 'needs_review' && r.script) {
      mid = `<div class="script-prev clip">${esc(r.script).slice(0, 260)}</div>` + mid;
    }
    let actions = '';
    if (r.status === 'needs_review') {
      actions = `
        <button class="abtn a-open" data-open="item" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/></svg>Read script</button>
        <button class="abtn a-approve" data-act="approved" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Approve</button>
        <button class="abtn a-retry" data-act="retry" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 018-8 8 8 0 016.9 4M20 4v4h-4M20 12a8 8 0 01-8 8 8 8 0 01-6.9-4M4 20v-4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Redo</button>
        <button class="abtn a-reject" data-act="rejected" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Reject</button>
        <span class="act-hint">Approving creates the video in Dr. Bob’s voice.</span>`;
    } else if (r.status === 'video_ready') {
      actions = `
        <button class="abtn a-watch" data-open="video" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M9 8v8l6-4-6-4Z" fill="currentColor"/></svg>Watch the video</button>
        <button class="abtn a-approve" data-act="scheduled" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Approve to post</button>
        <button class="abtn a-retry" data-act="retry" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 018-8 8 8 0 016.9 4M20 4v4h-4M20 12a8 8 0 01-8 8 8 8 0 01-6.9-4M4 20v-4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Redo video</button>
        <button class="abtn a-reject" data-act="rejected" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Reject</button>
        <span class="act-hint">Approving schedules it to publish to ${platText(r.platforms)}.</span>`;
    } else if (r.status === 'posted') {
      actions = `
        <button class="abtn a-share" data-open="share" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Share links</button>
        <button class="abtn a-open" data-open="video" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M9 8v8l6-4-6-4Z" fill="currentColor"/></svg>Watch</button>`;
    } else {
      actions = `<button class="abtn a-open" data-open="item" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/></svg>Details</button>`;
    }

    const dateLabel = (r.status === 'posted' && r.postedAt) ? 'Posted ' + r.postedAt
      : r.date ? 'Created ' + r.date : '';
    const dateHTML = dateLabel
      ? `<div class="date"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${dateLabel}</div>` : '';
    return `<div class="card">
      <div class="row1">
        <div>
          <h3>${esc(r.title)}</h3>
          ${dateHTML}
          <div class="plats">${platBadges(r.platforms)}</div>
        </div>
        <span class="spacer" style="margin-left:auto"></span>
        <span class="status ${s.klass}"><span class="led"></span>${s.label}</span>
      </div>
      ${trackerHTML(r.status)}
      ${mid}
      <div class="card-actions">${actions}</div>
    </div>`;
  }

  // ---------- Review Queue render ----------
  const shown = filterRows(rows);
  let cardsHTML: string;
  if (!shown.length) {
    const stage = STAGES.find((s) => s.key === activeFilter);
    const msg = searchTerm ? `No matches for “${esc(searchTerm)}”.`
      : stage ? `No videos in “${stage.label}” right now.`
      : 'Nothing here yet.';
    cardsHTML = emptyBlock(msg);
  } else {
    cardsHTML = shown.map(cardHTML).join('');
  }

  // ---------- Pipeline render ----------
  const boardHTML = COLUMNS.map((col) => {
    let items = rows.filter((r) => col.statuses.includes(r.status));
    if (searchTerm) {
      items = items.filter((r) => [r.title, r.topic, r.summary, r.sourceUrl, r.outline, ...dateHay(r)]
        .filter(Boolean).join(' ').toLowerCase().includes(searchTerm));
    }
    const cards = items.map((r) => {
      const p = PIPE[r.status] || { pill: r.status, ic: '', tone: 'grey' };
      return `<div class="pcard" data-open="item" data-id="${r.id}">
          <div class="pcard-title">${esc(r.title)}</div>
          <span class="pill pill-${p.tone}">${p.ic} ${p.pill}</span>
        </div>`;
    }).join('') || '<div class="col-empty">—</div>';
    return `<div class="col">
        <div class="col-head"><span>${col.icon} ${col.label}</span><span class="col-count">${items.length}</span></div>
        <div class="col-body">${cards}</div>
      </div>`;
  }).join('');

  // Delegate clicks inside the dynamically-built library HTML (cards + board).
  function onLibraryClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest('[data-act],[data-open]') as HTMLElement | null;
    if (!el) return;
    const id = el.getAttribute('data-id')!;
    const open = el.getAttribute('data-open');
    if (open === 'item') return openItem(id);
    if (open === 'video') return openVideo(id);
    if (open === 'share') return openShare(id);
    const actName = el.getAttribute('data-act');
    if (actName) act(id, actName);
  }

  // ---------- Export ----------
  function exportMatches(all: ContentRow[]) {
    const kw = (expKw || '').trim().toLowerCase();
    const from = inputDateNum(expFrom);
    const to = inputDateNum(expTo);
    return all.filter((r) => {
      if (kw) {
        const hay = [r.title, r.topic, r.summary, r.sourceUrl, r.outline, r.script, r.captionIG].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (from !== null || to !== null) {
        const n = rowDateNum(r);
        if (n === null) return false;
        if (from !== null && n < from) return false;
        if (to !== null && n > to) return false;
      }
      return true;
    });
  }
  const exportMatch = exportMatches(rows);
  const exportPreviewHTML = exportMatch.slice(0, 8).map((r) => {
    const s = STATUS[r.status] || { label: r.status, klass: 'st-working' };
    return `<div class="mini-row" data-open="item" data-id="${r.id}">
        <div>
          <div class="t">${esc(r.title)}</div>
          <div class="m">${r.date ? ('Added ' + r.date + ' · ') : ''}${platText(r.platforms)}</div>
        </div>
        <span class="spacer"></span>
        <span class="status ${s.klass}"><span class="led"></span>${s.label}</span>
      </div>`;
  }).join('') || emptyBlock('No content matches those filters.');

  function doExport() {
    const match = exportMatches(rows);
    if (!match.length) { toast('Nothing to export'); return; }
    const csv = csvFor(match);
    const stamp = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Dr Bob Content - ${stamp}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
    toast(`Exported ${match.length} item${match.length > 1 ? 's' : ''} to CSV`);
  }
  function clearExportDates() { setExpFrom(''); setExpTo(''); }
  function resetExport() { setExpKw(''); setExpFrom(''); setExpTo(''); }

  const createValid = validateForm();
  const filterNoteStage = STAGES.find((s) => s.key === activeFilter);

  return (
    <>
      {/* Reusable logo definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="toothGrad" x1="0" y1="0" x2="1" y2="0.15">
            <stop offset="0" stopColor="#1E5AAE" />
            <stop offset="0.5" stopColor="#3B7BD0" />
            <stop offset="0.62" stopColor="#8B949C" />
            <stop offset="1" stopColor="#C7CDD3" />
          </linearGradient>
        </defs>
      </svg>

      {/* ============ TOP BAR ============ */}
      <header className="topbar">
        <div className="logo" onClick={() => go('home')}>
          <div className="mark">
            <svg className="tooth" width="34" height="34" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <path fill="url(#toothGrad)" d="M32 10 C31 6 28 3 22 3 C11 3 4 10 4 19 C4 27 7 31 9 39 C10.5 45 11 56 15 59 C18 61 20 56 21 50 C22 44 23 40 27 38 C29.5 36.5 34.5 36.5 37 38 C41 40 42 44 43 50 C44 56 46 61 49 59 C53 56 53.5 45 55 39 C57 31 60 27 60 19 C60 10 53 3 42 3 C36 3 33 6 32 10 Z" />
              <text className="b" x="32" y="44" fontSize="34" textAnchor="middle">B</text>
            </svg>
          </div>
          <div className="name">
            <b>Dr Bob&apos;s Content Engine</b>
            <span>Pediatric Dentistry</span>
          </div>
        </div>
        <nav className="topnav">
          <button id="nav-home" className={view === 'home' ? 'active' : ''} onClick={() => go('home')}>New Video</button>
          <button id="nav-library" className={view === 'library' ? 'active' : ''} onClick={() => go('library')}>
            My Content<span className={'navbadge' + (needsReview > 0 ? ' show' : '')}>{needsReview}</span>
          </button>
          <button id="nav-export" className={view === 'export' ? 'active' : ''} onClick={() => go('export')}>Export</button>
        </nav>
      </header>

      <main>
        {/* ============ HOME ============ */}
        <section id="view-home" className={'view' + (view === 'home' ? ' show' : '')}>
          <div className="review-banner" id="reviewBanner" style={{ display: needsReview > 0 ? 'flex' : 'none' }}>
            <div className="rb-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div className="rb-text" id="rbText">
              {needsReview} {needsReview > 1 ? 'scripts are' : 'script is'} ready for your review
              <small>Read it, then Approve, Retry, or Reject — nothing posts without your OK.</small>
            </div>
            <button onClick={reviewNow}>Review now</button>
          </div>

          <div className="hero">
            <div className="eyebrow">Your content, made simple</div>
            <h1>Turn one idea into a finished video.</h1>
            <p>Share a link, name a topic, or paste an outline — the engine researches it, writes a script in Dr. Bob&apos;s friendly voice, and creates a branded video for you to approve. No spreadsheets required.</p>
          </div>

          <div className="section-head" id="formAnchor">
            <h2>Start a new video</h2>
            <span className="hint">Takes about a minute</span>
          </div>

          <div className="panel" id="createPanel" style={{ display: confirmShown ? 'none' : 'block' }}>
            {/* Step 1: Title */}
            <div className="step">
              <div className="step-label"><span className="step-num">1</span><b>Give it a name</b></div>
              <input type="text" id="f-title" placeholder="e.g. Best snacks for kids' teeth" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Step 2: Source type */}
            <div className="step">
              <div className="step-label"><span className="step-num">2</span><b>How do you want to start?</b></div>
              <div className="choices">
                <div className={'choice' + (sourceType === 'url' ? ' sel' : '')} data-src="url" onClick={() => pickSource('url')}>
                  <div className="check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.5.5l2-2A5 5 0 0012.5 4.5l-1 1M14 11a5 5 0 00-7.5-.5l-2 2A5 5 0 0011.5 19.5l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <b>Share a Link</b>
                  <small>An article, news story, or dental tip</small>
                </div>
                <div className={'choice' + (sourceType === 'topic' ? ' sel' : '')} data-src="topic" onClick={() => pickSource('topic')}>
                  <div className="check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.5.4.5.7.5 1.1v.5h6v-.5c0-.4 0-.7.5-1.1A6 6 0 0012 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <b>Name a Topic</b>
                  <small>Just type what it should be about</small>
                </div>
                <div className={'choice' + (sourceType === 'outline' ? ' sel' : '')} data-src="outline" onClick={() => pickSource('outline')}>
                  <div className="check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 6h11M8 12h11M8 18h7M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <b>Write an Outline</b>
                  <small>Paste your own talking points or draft</small>
                </div>
              </div>

              <div className={'conditional' + (sourceType === 'url' ? ' show' : '')} id="cond-url">
                <input type="text" id="f-url" placeholder="Paste the link here — https://…" value={urlVal} onChange={(e) => setUrlVal(e.target.value)} />
              </div>
              <div className={'conditional' + (sourceType === 'topic' ? ' show' : '')} id="cond-topic">
                <input type="text" id="f-topic" placeholder="e.g. Why baby teeth matter more than you think" value={topicVal} onChange={(e) => setTopicVal(e.target.value)} />
              </div>
              <div className={'conditional' + (sourceType === 'outline' ? ' show' : '')} id="cond-outline">
                <textarea id="f-outline" placeholder="Paste your outline or draft script. The AI will polish it into a production-ready video script." value={outlineVal} onChange={(e) => setOutlineVal(e.target.value)}></textarea>
              </div>
            </div>

            {/* Step 3: Platforms */}
            <div className="step">
              <div className="step-label"><span className="step-num">3</span><b>Where should it go?</b><span className="opt">pick one or more</span></div>
              <div className="platforms">
                <div className={'plat ig' + (plats.includes('Instagram') ? ' sel' : '')} data-plat="Instagram" onClick={() => togglePlat('Instagram')}>
                  <span className="dot"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" /></svg></span>
                  Instagram
                  <span className="box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </div>
                <div className={'plat web' + (plats.includes('Website') ? ' sel' : '')} data-plat="Website" onClick={() => togglePlat('Website')}>
                  <span className="dot"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="2" /></svg></span>
                  Website
                  <span className="box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </div>
                <div className={'plat yt' + (plats.includes('YouTube') ? ' sel' : '')} data-plat="YouTube" onClick={() => togglePlat('YouTube')}>
                  <span className="dot"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M10 9l5 3-5 3V9Z" fill="currentColor" /></svg></span>
                  YouTube
                  <span className="box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </div>
              </div>
            </div>

            <div className="form-foot">
              <button className="btn btn-create" id="createBtn" disabled={!createValid} onClick={submitCreate}>
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Create My Video
              </button>
              <button className="btn btn-ghost" onClick={resetCreate}>Clear</button>
              <div className="form-note">The engine writes a draft script for you to review first — nothing is posted without your approval.</div>
            </div>
          </div>

          {/* Success screen */}
          <div className="confirm" id="createConfirm" style={{ display: confirmShown ? 'block' : 'none' }}>
            <div className="big"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <h2>Got it — your video is in the works!</h2>
            <p>The engine is researching your idea and writing a script now. You&apos;ll see it under <b>My Content</b> with a <b>&quot;Ready to review&quot;</b> tag when the draft is done. We&apos;ll never post anything without your OK.</p>
            <div className="cta-row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-create" onClick={() => go('library')}>My Content</button>
              <button className="btn btn-ghost" onClick={resetCreate}>Start another</button>
            </div>
          </div>
        </section>

        {/* ============ MY CONTENT ============ */}
        <section id="view-library" className={'view' + (view === 'library' ? ' show' : '')}>
          <div className="view-toggle">
            <div className="toggle">
              <button className={'tg' + (viewMode === 'review' ? ' active' : '')} id="tg-review" onClick={() => setViewMode('review')}>Review Queue</button>
              <button className={'tg' + (viewMode === 'pipeline' ? ' active' : '')} id="tg-pipeline" onClick={() => setViewMode('pipeline')}>Pipeline</button>
            </div>
          </div>

          <div className="section-head">
            <h2>My Content</h2>
          </div>

          <div className="stagebar" id="stagebar" style={{ display: viewMode === 'review' ? 'flex' : 'none' }}>
            {STAGES.map((st) => {
              const count = rows.filter((r) => st.statuses.includes(r.status)).length;
              return (
                <button
                  key={st.key}
                  className={'stage' + (activeFilter === st.key ? ' active' : '')}
                  style={{ ['--sc' as any]: st.color }}
                  onClick={() => setFilter(st.key)}
                  title={st.label}
                >
                  <div className="stage-top"><span className="stage-count">{count}</span><span className="stage-ic">{st.icon}</span></div>
                  <span className="stage-label">{st.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mc-controls">
            <div className="searchbar">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input type="text" id="searchInput" placeholder="Search by title, topic, or date…" value={searchTerm} onChange={(e) => onSearch(e.target.value)} />
              <button className={'clr' + (searchTerm ? ' show' : '')} id="searchClear" onClick={clearSearch}>✕</button>
            </div>
            <span className="synced" id="syncedLabel">{synced && (<><span className="dot"></span>Last synced {synced}</>)}</span>
          </div>

          <div id="reviewPane" style={{ display: viewMode === 'review' ? 'block' : 'none' }}>
            <div className="filter-note" id="filterNote" style={{ display: activeFilter !== 'all' ? 'flex' : 'none' }}>
              <span>Showing <b>{filterNoteStage ? filterNoteStage.label : ''}</b></span>
              <button onClick={() => setFilter('all')}>Show all {rows.length}</button>
            </div>
            <div className="cards" id="cards" onClick={onLibraryClick} dangerouslySetInnerHTML={{ __html: cardsHTML }} />
          </div>

          <div id="pipelinePane" style={{ display: viewMode === 'review' ? 'none' : 'block' }}>
            <div className="board" id="board" onClick={onLibraryClick} dangerouslySetInnerHTML={{ __html: boardHTML }} />
          </div>
        </section>

        {/* ============ EXPORT ============ */}
        <section id="view-export" className={'view' + (view === 'export' ? ' show' : '')}>
          <div className="section-head">
            <h2>Export</h2>
            <span className="hint">Download your content as a spreadsheet (CSV)</span>
          </div>

          <div className="panel" style={{ maxWidth: 720 }}>
            {/* Keyword */}
            <div className="step">
              <div className="step-label"><span className="step-num">1</span><b>Search by keyword</b><span className="opt">optional</span></div>
              <input type="text" id="exp-kw" placeholder="Title, topic, script, caption…" value={expKw} onChange={(e) => setExpKw(e.target.value)} />
            </div>

            {/* Date range */}
            <div className="step">
              <div className="step-label"><span className="step-num">2</span><b>Filter by date added</b><span className="opt">optional</span></div>
              <div className="daterow">
                <div><label>From</label><input type="date" id="exp-from" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} /></div>
                <div><label>To</label><input type="date" id="exp-to" value={expTo} onChange={(e) => setExpTo(e.target.value)} /></div>
                <button className="chip" onClick={clearExportDates}>Clear dates</button>
              </div>
            </div>

            <div className="export-summary" id="exportSummary">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16M7 5v14m10-14v14M4 19h16M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span><b>{exportMatch.length}</b> of {rows.length} {rows.length === 1 ? 'item' : 'items'} match — 20 detail columns per row.</span>
            </div>

            <div className="form-foot">
              <button className="btn btn-create" id="exportBtn" disabled={exportMatch.length === 0} onClick={doExport}>
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 3v11M8 10l4 4 4-4M5 19h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Export to CSV
              </button>
              <button className="btn btn-ghost" onClick={resetExport}>Reset</button>
              <div className="form-note">Leave both filters empty to export everything. Opens in Excel or Google Sheets.</div>
            </div>
          </div>

          <div className="section-head" style={{ marginTop: 28 }}><h2 style={{ fontSize: 16 }}>Preview</h2><span className="hint" id="previewHint">{exportMatch.length ? `Showing ${Math.min(exportMatch.length, 8)} of ${exportMatch.length}` : ''}</span></div>
          <div className="mini-list" id="exportPreview" onClick={onLibraryClick} dangerouslySetInnerHTML={{ __html: exportPreviewHTML }} />
        </section>
      </main>

      <footer className="foot">Dr Bob&apos;s Content Engine · Built by VectorPath AI · Confidential</footer>

      <div className={'overlay' + (modal ? ' show' : '')} id="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal" id="modal" onClick={onModalClick}>
          {modal && (
            <>
              <div className="modal-head"><h3 dangerouslySetInnerHTML={{ __html: esc(modal.title) }} /><button className="x" onClick={closeModal}>✕</button></div>
              <div className="modal-body" dangerouslySetInnerHTML={{ __html: modal.body }} />
            </>
          )}
        </div>
      </div>

      <div className={'toast' + (toastShow ? ' show' : '')} id="toast">
        <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </>
  );
}
