import type { ContentRow } from './types';

// Seed rows — ported verbatim from the ROWS array in the original
// single-file dashboard. Titles, dates, statuses, platforms, scripts,
// captions, URLs, and error messages are preserved exactly.
export const SEED_ROWS: ContentRow[] = [
  {
    id: 1, date: 'Jul 2, 2026', title: 'Best Snacks for Kids’ Teeth', sourceType: 'topic',
    topic: 'Healthy after-school snacks that protect teeth',
    platforms: ['Instagram', 'Website', 'YouTube'], status: 'needs_review',
    summary: 'A friendly rundown of tooth-healthy snacks parents can pack for kids.',
    script: 'HOOK: Parents — that “healthy” fruit snack might be feeding cavities!\n\nBODY: Hi, I’m Dr. Bob. Sticky snacks like gummies and dried fruit cling to little teeth and feed the bacteria that cause cavities. Instead, reach for crunchy fruits and veggies — apples, carrots, celery — plus cheese and yogurt, which actually help protect enamel. And always follow snack time with a sip of water to rinse things clean.\n\nCTA: Want more simple tips to keep your kiddo’s smile bright? Follow along — and book their next visit with us!',
    captionIG: '🍎 Snack smart, smile bright! Swap the sticky stuff for crunchy fruits, veggies & cheese. #PediatricDentistry #HealthyKids #DrBob',
    videoUrl: '', driveUrl: '',
  },
  {
    id: 2, date: 'Jun 30, 2026', title: 'How to Help Kids Brush Better', sourceType: 'topic',
    topic: 'Making brushing fun and effective for young kids',
    platforms: ['Instagram', 'YouTube'], status: 'video_ready',
    summary: 'Three easy tricks to get kids to brush for the full two minutes.',
    script: 'HOOK: Two minutes feels like forever to a 5-year-old… here’s the fix.',
    videoUrl: 'https://example.com/video/brush-better', driveUrl: 'https://drive.google.com/file/brush-better',
  },
  {
    id: 3, date: 'Jul 3, 2026', title: 'Why Baby Teeth Matter', sourceType: 'url',
    sourceUrl: 'https://www.aapd.org/resources/parent/baby-teeth',
    platforms: ['Website', 'Instagram'], status: 'drafting',
    summary: '', script: '',
  },
  {
    id: 4, date: 'Jun 25, 2026', title: 'Thumb-Sucking: When to Worry', sourceType: 'outline',
    outline: '- Normal up to age 3\n- Effects on teeth alignment\n- Gentle ways to help them stop',
    platforms: ['Instagram', 'Website', 'YouTube'], status: 'posted',
    summary: 'Reassuring guidance for parents on thumb-sucking habits.',
    script: 'HOOK: Is thumb-sucking actually a problem? Let’s clear it up.',
    videoUrl: 'https://example.com/video/thumb', driveUrl: 'https://drive.google.com/file/thumb',
    postUrls: { Instagram: 'https://instagram.com/p/drbob-thumb', Website: 'https://drbobdental.com/blog/thumb-sucking', YouTube: 'https://youtube.com/watch?v=drbob-thumb' },
    postedAt: 'Jun 28, 2026',
  },
  {
    id: 5, date: 'Jul 1, 2026', title: 'First Dental Visit Tips', sourceType: 'topic',
    topic: 'What to expect at your child’s first dental appointment',
    platforms: ['Instagram'], status: 'video_generating',
    summary: 'Calming a nervous parent (and kid) before visit #1.', script: 'HOOK: The first visit sets the tone for life — here’s how to nail it.',
  },
  {
    id: 6, date: 'Jul 4, 2026', title: 'Are Fluoride Treatments Safe for Kids?', sourceType: 'topic',
    topic: 'Explaining fluoride safety to worried parents', platforms: ['Instagram', 'Website'], status: 'needs_review',
    summary: 'A calm, myth-busting explainer on why fluoride is safe and helpful for kids.',
    script: 'HOOK: Worried about fluoride? Let’s clear the air.\n\nBODY: Hi, I’m Dr. Bob. The fluoride we use is safe, gentle, and one of the best tools we have to prevent cavities in little teeth. In the tiny amounts used at your child’s visit, it strengthens enamel and reverses early decay — no needles, no fuss. The internet has scary headlines, but decades of research back this up.\n\nCTA: Have questions? Ask us at your next visit — we love talking teeth!',
    captionIG: '🦷 Fluoride, explained (without the scary headlines). Safe, gentle, cavity-fighting. #PediatricDentistry #DrBob #KidsHealth',
  },
  {
    id: 7, date: 'Jul 3, 2026', title: 'What to Do When Your Child Knocks Out a Tooth', sourceType: 'topic',
    topic: 'Dental emergency: knocked-out tooth first aid', platforms: ['Instagram', 'Website'], status: 'video_ready',
    summary: 'A time-sensitive first-aid guide for a knocked-out tooth.',
    script: 'Your kid takes a tumble and a tooth pops out — here’s exactly what to do. First, breathe. If it’s a baby tooth, do not try to put it back in. If it’s a permanent tooth, this is time-sensitive: pick it up by the crown, never the root, keep it in milk or their saliva, and call us immediately. The first thirty minutes matter most. Save our number in your phone right now so you’re ready if it ever happens.',
    captionIG: 'SAVE THIS before you need it 🦷 What to do when a tooth gets knocked out. #dentalemergency #parentingtips #beprepared',
    captionWeb: 'Knocked-out tooth? The first 30 minutes matter. Here’s your step-by-step.',
    videoUrl: 'https://example.com/video/knocked-out-tooth', driveUrl: 'https://drive.google.com/file/knocked-out-tooth',
  },
  {
    id: 8, date: 'Jul 5, 2026', title: 'Pacifiers and Teeth: What Parents Should Know', sourceType: 'topic',
    topic: 'Pacifier use and dental development', platforms: ['Instagram'], status: 'intake', summary: '',
  },
  {
    id: 9, date: 'Jul 4, 2026', title: 'Handling Your Toddler’s First Cavity', sourceType: 'topic',
    topic: 'Reassuring parents through a first cavity', platforms: ['Instagram', 'Website', 'YouTube'], status: 'voice_ready',
    summary: 'What a first cavity means and how it’s treated — without the panic.', script: 'HOOK: A cavity in a baby tooth? Here’s what it really means.',
  },
  {
    id: 10, date: 'Jul 2, 2026', title: 'Back-to-School Dental Checklist', sourceType: 'outline',
    outline: '- Book the checkup early\n- New toothbrush\n- Pack tooth-friendly lunches\n- Mouthguard for sports', platforms: ['Instagram', 'Website'], status: 'posting_approved',
    summary: 'A quick checklist to get kids’ smiles ready for the school year.', script: 'HOOK: School’s almost back — is your kid’s smile ready?',
    videoUrl: 'https://example.com/video/back-to-school', driveUrl: 'https://drive.google.com/file/back-to-school',
  },
  {
    id: 11, date: 'Jun 30, 2026', title: 'How Often Should Kids Really Floss?', sourceType: 'topic',
    topic: 'Flossing frequency for children', platforms: ['Instagram', 'YouTube'], status: 'posted',
    summary: 'The honest answer on kids and flossing.', script: 'HOOK: Do kids really need to floss? Short answer: yes.',
    videoUrl: 'https://example.com/video/floss', driveUrl: 'https://drive.google.com/file/floss',
    postUrls: { Instagram: 'https://instagram.com/p/drbob-floss', YouTube: 'https://youtube.com/watch?v=drbob-floss' }, postedAt: 'Jul 1, 2026',
  },
  {
    id: 12, date: 'Jul 3, 2026', title: 'Teething 101 for New Parents', sourceType: 'topic',
    topic: 'Soothing a teething baby', platforms: ['Instagram', 'Website'], status: 'failed',
    summary: 'Gentle, safe ways to soothe a teething baby.', script: 'HOOK: Teething tears? Here’s what actually helps.',
    errorMessage: 'Video render timed out — VPA team notified.',
  },
  {
    id: 13, date: 'Jul 5, 2026', title: 'Sports Mouthguards for Kids', sourceType: 'url',
    sourceUrl: 'https://www.aapd.org/resources/parent/mouthguards', platforms: ['Instagram', 'Website', 'YouTube'], status: 'failed',
    summary: '', errorMessage: 'Couldn’t open the link — page may be down or blocked.',
  },
];
