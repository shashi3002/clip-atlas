// ============================================================================
// CLIP ATLAS — PRINCIPAL UI/UX COMPLETE FRONTEND ENGINE
// 1. Animated "Sign in as…" Showcase + 60FPS Studio Microphone Waveform
// 2. Screen 1: Batch Overview (KPIs, Stacked Bars, Distributions, Derived Checks)
// 3. Screen 2: Clip Explorer (Sorting, Numeric Ranges, Multi-Select, 50k Virtualization)
// 4. Screen 3: Listening Workbench (Waveform + FFT Spectrogram, Loop, 3-Way Diff, Shortcuts)
// 5. Screen 4: Admin Console (Gold Scorecard, Speed-vs-Acc Scatter, Annotator Detail,
//              Live Thresholds, Batch Acceptance Gate, Activity Log, JSON/CSV, Merger)
// ============================================================================

const LANG_NAMES = {
  hi: 'Hindi (हिन्दी)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  mr: 'Marathi (मराठी)',
  te: 'Telugu (తెలుగు)',
  or: 'Odia (ଓଡ଼ିଆ)'
};

const SOURCE_COLORS = {
  inhouse_studio: '#D4A055',
  crowd_app: '#3F3F46',
  vendor_a: '#A1A1AA',
  vendor_b: '#E4C99B'
};

const LANG_COLORS = {
  hi: '#D4A055',
  bn: '#3F3F46',
  ta: '#A1A1AA',
  mr: '#E4C99B',
  te: '#71717A',
  or: '#D4D4D8'
};

const SCRIPT_REGEX = {
  hi: /[\u0900-\u097F]/g,
  mr: /[\u0900-\u097F]/g,
  bn: /[\u0980-\u09FF]/g,
  or: /[\u0B00-\u0B7F]/g,
  ta: /[\u0B80-\u0BFF]/g,
  te: /[\u0C00-\u0C7F]/g
};

const DEFAULT_SETTINGS = {
  minSnrDb: 15.0,
  maxCer: 0.15,
  minCps: 4.0,
  maxCps: 25.0,
  goldTargetPct: 80.0,
  maxFlaggedPct: 25.0,
  minReviewSec: 6.0,
  actionGoldPct: 65.0
};

// Monday of the ISO week a date falls in, as YYYY-MM-DD (UTC, so it is stable across time zones)
function weekStartKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function weekLabel(key) {
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const ISSUE_TAGS = [
  'noisy',
  'clipped',
  'wrong_language',
  'truncated',
  'wrong_transcript',
  'other'
];

const SARVAM_SCREEN_TITLES = {
  overview: 'Batch Overview',
  explorer: 'Clip Explorer',
  workbench: 'Listening Workbench',
  admin: 'Admin Console'
};

const SARVAM_SUBSECTIONS = {
  overview: [
    {
      id: 'all',
      title: 'Is this batch healthy?',
      badge: '',
      desc: 'Headline numbers, hours by language and source, quality distributions, annotators and issues. Click any number, bar or row to open those clips in the explorer.'
    }
  ],
  explorer: [
    {
      id: 'all',
      title: 'Filter, Browse & Inspect Clips',
      badge: '',
      desc: 'Slice the batch with filters, scan every clip in one table, and see the speaker and source breakdown for the current selection — all on one page.'
    }
  ],
  workbench: [
    {
      id: 'all',
      title: 'Listen, Compare & Judge',
      badge: '',
      desc: 'Play the clip, check the transcript against the ASR hypothesis, and record your verdict without leaving the page.'
    }
  ],
  admin: [
    {
      id: 'scorecard',
      title: 'Team Quality Scorecard',
      badge: 'vs. Gold',
      desc: 'Annotator performance table benchmarked against expert gold.json verdicts, reviewer agreement, and weekly trends.'
    },
    {
      id: 'scatter_graph',
      title: 'Speed vs. Gold Accuracy',
      badge: 'Scatter Plot',
      desc: 'How fast each annotator reviews, plotted against how often they agree with the expert gold verdicts. Click a point or row to inspect someone.'
    },
    {
      id: 'annotator_deep_dive',
      title: 'Annotator Deep-Dive Inspector',
      badge: 'Disagreements',
      desc: 'Clip-by-clip inspection of an annotator’s missed issue tags, weekly trend, and Gold benchmark disagreements.'
    },
    {
      id: 'thresholds_merger',
      title: 'Thresholds & Conflict Merger',
      badge: 'Live Config',
      desc: 'Live quality threshold settings, JSON/CSV verdict exports, and multi-reviewer conflict resolution.'
    },
    {
      id: 'acceptance_gate',
      title: 'Batch Acceptance Gate Matrix',
      badge: '6×4 Matrix',
      desc: 'Language × Source acceptance gate matrix with automated PASS/FAIL checks, status selectors, and reason notes.'
    },
    {
      id: 'quality_trends',
      title: 'Quality Over Time & Assignments',
      badge: '10 Weeks',
      desc: 'Weekly CER and acceptance trends, queue assignment tracker, batch review summary, and session audit log.'
    },
    {
      id: 'all',
      title: 'All Admin Console Sections',
      badge: 'Full View',
      desc: 'Combined view of all Admin Console scorecards, charts, gates, and settings.'
    }
  ]
};

const state = {
  rawClips: [],
  enrichedClips: [],
  users: [],
  goldMap: new Map(),
  selectedSignInUser: null,
  roleFilter: 'all',
  userSearchQuery: '',
  currentUser: null,
  activeScreen: 'overview',
  activeSubsections: {
    overview: 'all',
    explorer: 'all',
    workbench: 'all',
    admin: 'scorecard'
  },
  theme: 'light',
  settings: { ...DEFAULT_SETTINGS },
  verdictOverrides: {},
  activityLog: [],
  gateDecisions: {},
  assignmentsMap: {},
  importedVerdicts: null,
  distCompareMode: 'histogram', // 'histogram' | 'source' | 'language'
  filters: {
    language: 'all',
    source: 'all',
    speaker: 'all',
    annotator: 'all',
    verdict: 'all',
    flag: 'all',
    search: '',
    minDur: 0,
    maxDur: 30,
    minSnr: 0,
    maxSnr: 45,
    minCer: 0,
    maxCer: 120
  },
  sortField: 'id',
  sortDir: 'asc',
  pageSize: 25,
  currentPage: 1,
  virtual50kMode: false,
  selectedClipIds: new Set(),
  workbenchQueue: [],
  workbenchIndex: 0,
  wbViewMode: 'waveform', // 'waveform' | 'spectrogram'
  wbLoopEnabled: false,
  wbLoopStart: 0.2,
  wbLoopEnd: 0.75,
  selectedAdminAnnotator: 'ann_03',
  activitySearch: ''
};

function showToast(msg) {
  const el = document.getElementById('atlas-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// ----------------------------------------------------------------------------
// 1. INITIALIZATION & STORAGE
// ----------------------------------------------------------------------------
async function initClipAtlas() {
  loadPersistedStorage();
  applyTheme(state.theme);
  initSignInStudioMicAnimation();
  triggerCameraZoomIntro();

  try {
    const [clipsRes, usersRes, goldRes] = await Promise.all([
      fetch('clips.json'),
      fetch('users.json'),
      fetch('gold.json')
    ]);

    state.rawClips = await clipsRes.json();
    state.users = await usersRes.json();
    const goldArr = await goldRes.json();
    goldArr.forEach((g) => state.goldMap.set(g.clip_id, g));

    recomputeEnrichedClips();
    state.workbenchQueue = state.enrichedClips.map((c) => c.id);

    const savedUserId = localStorage.getItem('clip_atlas_current_user_id');
    const rememberedUser = state.users.find((u) => u.id === savedUserId) || null;
    const initialUser =
      rememberedUser ||
      state.users.find((u) => u.role === 'admin') ||
      state.users[0];

    selectUserOnSignInCard(initialUser, false);
    renderSignInUserList();
    populateHeaderUserSwitcher();
    bindSignInEvents();
    bindGlobalHeaderModals();
    bindKeyboardShortcuts();

    const hasUrlParams = readUrlFilters();
    if (hasUrlParams && rememberedUser) {
      completeSignInAndEnterWorkspace(rememberedUser, true);
    } else if (hasUrlParams) {
      // Shared link opened by someone who hasn't picked a user yet:
      // keep the requested view + filters and apply them right after sign-in.
      state.pendingDeepLink = true;
      showToast('Pick who you are to open the shared view.');
    }
  } catch (err) {
    console.error('Error loading starter pack JSON files:', err);
  }
}

function loadPersistedStorage() {
  try {
    const savedVerdicts = localStorage.getItem('clip_atlas_verdicts_v1');
    if (savedVerdicts) state.verdictOverrides = JSON.parse(savedVerdicts);

    const savedLog = localStorage.getItem('clip_atlas_activity_log_v1');
    if (savedLog) state.activityLog = JSON.parse(savedLog);

    const savedSettings = localStorage.getItem('clip_atlas_settings_v1');
    if (savedSettings) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };

    const savedGates = localStorage.getItem('clip_atlas_gates_v1');
    if (savedGates) state.gateDecisions = JSON.parse(savedGates);

    const savedAssign = localStorage.getItem('clip_atlas_assignments_v1');
    if (savedAssign) state.assignmentsMap = JSON.parse(savedAssign);

    const savedTheme = localStorage.getItem('clip_atlas_theme_v1');
    if (savedTheme) state.theme = savedTheme;
  } catch (e) {
    console.warn('Storage read fallback:', e);
  }
}

function savePersistedStorage() {
  localStorage.setItem('clip_atlas_verdicts_v1', JSON.stringify(state.verdictOverrides));
  localStorage.setItem('clip_atlas_activity_log_v1', JSON.stringify(state.activityLog));
  localStorage.setItem('clip_atlas_settings_v1', JSON.stringify(state.settings));
  localStorage.setItem('clip_atlas_gates_v1', JSON.stringify(state.gateDecisions));
  localStorage.setItem('clip_atlas_assignments_v1', JSON.stringify(state.assignmentsMap));
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('clip_atlas_theme_v1', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
}

// ----------------------------------------------------------------------------
// 2. DERIVED CHECKS & ENRICHMENT ENGINE
// ----------------------------------------------------------------------------
function hasScriptMismatch(language, transcript) {
  if (!transcript || !transcript.trim()) return false;
  const lettersOnly = transcript.replace(/[\s\p{P}\p{N}a-zA-Z]/gu, '');
  if (lettersOnly.length === 0) return false;
  const regex = SCRIPT_REGEX[language];
  if (!regex) return false;
  const matches = lettersOnly.match(regex) || [];
  return matches.length / lettersOnly.length < 0.75;
}

function recomputeEnrichedClips() {
  const normTranscriptSpeakers = new Map();
  const normalizeText = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  state.rawClips.forEach((c) => {
    const ov = state.verdictOverrides[c.id];
    const text = ov && ov.edited_transcript !== undefined ? ov.edited_transcript : c.transcript;
    const norm = normalizeText(text);
    if (!norm) return;
    if (!normTranscriptSpeakers.has(norm)) normTranscriptSpeakers.set(norm, new Set());
    normTranscriptSpeakers.get(norm).add(c.speaker_id);
  });

  const duplicateTranscripts = new Set();
  for (const [norm, spkSet] of normTranscriptSpeakers.entries()) {
    if (spkSet.size > 1) duplicateTranscripts.add(norm);
  }

  state.enrichedClips = state.rawClips.map((raw) => {
    const ov = state.verdictOverrides[raw.id] || {};
    const effectiveTranscript =
      ov.edited_transcript !== undefined ? ov.edited_transcript : (raw.transcript ?? '');
    const effectiveVerdict =
      ov.verdict !== undefined ? ov.verdict : (raw.annotator_verdict ?? null);
    const effectiveTags =
      ov.tags !== undefined ? ov.tags : (Array.isArray(raw.annotator_tags) ? [...raw.annotator_tags] : []);
    const effectiveAnnotator =
      state.assignmentsMap[raw.id] !== undefined ? state.assignmentsMap[raw.id] : raw.annotator_id;

    const duration = Math.max(raw.duration_s || 0.1, 0.1);
    const charLen = effectiveTranscript.trim().length;
    const cps = charLen / duration;

    const activeFlags = new Set(Array.isArray(raw.flags) ? raw.flags : []);
    if (raw.snr_db !== null && raw.snr_db !== undefined) {
      if (raw.snr_db < state.settings.minSnrDb) activeFlags.add('low_snr');
      else activeFlags.delete('low_snr');
    }
    if ((raw.clipping_pct || 0) > 1.0) activeFlags.add('clipping');
    if ((raw.silence_ratio || 0) > 0.4) activeFlags.add('long_silence');

    const derivedFlags = [];
    if (charLen === 0 || cps < state.settings.minCps || cps > state.settings.maxCps) {
      derivedFlags.push('rate_anomaly');
    }
    if (hasScriptMismatch(raw.language, effectiveTranscript)) {
      derivedFlags.push('script_mismatch');
    }
    const norm = normalizeText(effectiveTranscript);
    if (norm && duplicateTranscripts.has(norm)) {
      derivedFlags.push('duplicate_transcript');
    }
    if (raw.cer !== null && raw.cer !== undefined && raw.cer > state.settings.maxCer) {
      derivedFlags.push('high_cer');
    }

    const allFlags = Array.from(new Set([...activeFlags, ...derivedFlags]));
    const goldEntry = state.goldMap.get(raw.id) || null;
    const goldDisagrees =
      goldEntry && raw.annotator_verdict && raw.annotator_verdict !== goldEntry.expert_verdict;

    return {
      ...raw,
      annotator_id: effectiveAnnotator,
      transcript: effectiveTranscript,
      original_transcript: raw.transcript ?? '',
      effective_verdict: effectiveVerdict,
      effective_tags: effectiveTags,
      note: ov.note || '',
      updated_by: ov.updated_by || null,
      cps: Number(cps.toFixed(1)),
      pipeline_flags: Array.from(activeFlags),
      derived_flags: derivedFlags,
      all_flags: allFlags,
      gold_entry: goldEntry,
      gold_disagrees: Boolean(goldDisagrees)
    };
  });
}

// ----------------------------------------------------------------------------
// 3. SIGN-IN PAGE & STUDIO MICROPHONE ANIMATION
// ----------------------------------------------------------------------------
let studioAudioEl = null;
let audioCtx = null;
let analyserNode = null;
let isPlayingStudioSample = false;

function triggerCameraZoomIntro() {
  const stage = document.getElementById('signin-stage');
  if (!stage) return;
  stage.classList.add('camera-zoomed-in');
  setTimeout(() => stage.classList.remove('camera-zoomed-in'), 420);
}

function initSignInStudioMicAnimation() {
  const canvas = document.getElementById('mic-wave-canvas');
  const card = document.getElementById('mic-showcase-card');
  const parallaxLayer = document.getElementById('mic-parallax-layer');
  if (!canvas || !card) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = card.clientWidth || 600);
  let height = (canvas.height = card.clientHeight || 670);

  window.addEventListener('resize', () => {
    if (!card.clientWidth) return;
    width = canvas.width = card.clientWidth;
    height = canvas.height = card.clientHeight;
  });

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    if (parallaxLayer) {
      parallaxLayer.style.transform = `scale(1.06) translate(${-nx * 18}px, ${-ny * 14}px)`;
    }
  });

  card.addEventListener('mouseleave', () => {
    if (parallaxLayer) parallaxLayer.style.transform = 'scale(1.03) translate(0px, 0px)';
  });

  const particles = Array.from({ length: 26 }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 1.2 + Math.random() * 2.3,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -0.25 - Math.random() * 0.45,
    alpha: 0.25 + Math.random() * 0.55,
    hue: i % 2 === 0 ? 195 : 230
  }));

  let phase = 0;
  const freqBuffer = new Uint8Array(64);

  function renderStudioWave() {
    ctx.clearRect(0, 0, width, height);
    phase += isPlayingStudioSample ? 0.095 : 0.042;

    let liveEnergy = 0.38;
    if (isPlayingStudioSample && analyserNode) {
      analyserNode.getByteFrequencyData(freqBuffer);
      let sum = 0;
      for (let i = 0; i < freqBuffer.length; i++) sum += freqBuffer[i];
      liveEnergy = Math.max(0.25, (sum / (freqBuffer.length * 255)) * 1.9);
    } else {
      liveEnergy = 0.35 + 0.18 * Math.sin(phase * 0.7);
    }

    const micX = width * 0.51;
    const micY = height * 0.34;
    for (let ring = 0; ring < 3; ring++) {
      const progress = (phase * 0.45 + ring * 0.33) % 1;
      const radius = 38 + progress * 155 * liveEnergy;
      const alpha = (1 - progress) * (isPlayingStudioSample ? 0.42 : 0.22);
      ctx.beginPath();
      ctx.arc(micX, micY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    const waveCenterY = height * 0.78;
    const barsCount = 56;
    const totalWaveWidth = width * 0.84;
    const startX = (width - totalWaveWidth) / 2;
    const barGap = totalWaveWidth / barsCount;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 212, 255, 0.85)';
    ctx.shadowBlur = 14;

    for (let i = 0; i < barsCount; i++) {
      const normIdx = i / barsCount;
      const envelope = Math.sin(normIdx * Math.PI);
      let amp =
        Math.sin(i * 0.32 + phase * 2.1) * 0.45 +
        Math.cos(i * 0.7 - phase * 1.4) * 0.35 +
        Math.sin(i * 1.1 + phase * 3.2) * 0.2;

      if (isPlayingStudioSample && analyserNode) {
        const fVal = freqBuffer[i % freqBuffer.length] / 255;
        amp = amp * 0.35 + fVal * 0.95;
      }

      const barHeight = Math.max(4, Math.abs(amp) * envelope * 90 * (0.65 + liveEnergy));
      const x = startX + i * barGap;

      const grad = ctx.createLinearGradient(x, waveCenterY - barHeight / 2, x, waveCenterY + barHeight / 2);
      grad.addColorStop(0, 'rgba(125, 211, 252, 0.95)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 1)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0.9)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, waveCenterY - barHeight / 2, Math.max(2.5, barGap * 0.52), barHeight, 3);
      ctx.fill();
    }
    ctx.restore();

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy * (isPlayingStudioSample ? 1.8 : 1);
      if (p.y < 0) p.y = height;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 95%, 72%, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(renderStudioWave);
  }

  renderStudioWave();
}

function toggleStudioSamplePlayback() {
  const playIcon = document.getElementById('mic-play-icon');
  const playLabel = document.getElementById('mic-play-label');

  if (isPlayingStudioSample && studioAudioEl) {
    studioAudioEl.pause();
    isPlayingStudioSample = false;
    if (playIcon) playIcon.textContent = '▶';
    if (playLabel) playLabel.textContent = 'Test Studio Sample';
    return;
  }

  const u = state.selectedSignInUser;
  let sampleClip = state.enrichedClips[0];
  if (u && u.languages && u.languages.length > 0) {
    sampleClip = state.enrichedClips.find((c) => u.languages.includes(c.language)) || sampleClip;
  }
  const audioUrl = sampleClip ? sampleClip.audio_url : 'audio/clp_0001.wav';

  if (!studioAudioEl) {
    studioAudioEl = new Audio();
    studioAudioEl.crossOrigin = 'anonymous';
    studioAudioEl.addEventListener('ended', () => {
      isPlayingStudioSample = false;
      if (playIcon) playIcon.textContent = '▶';
      if (playLabel) playLabel.textContent = 'Test Studio Sample';
    });
  }
  studioAudioEl.src = audioUrl;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(studioAudioEl);
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 128;
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}

  studioAudioEl.play().then(() => {
    isPlayingStudioSample = true;
    if (playIcon) playIcon.textContent = '⏸';
    if (playLabel) playLabel.textContent = `Playing ${sampleClip ? sampleClip.id : 'Sample'} (${sampleClip ? sampleClip.language.toUpperCase() : 'WAV'})`;
  }).catch(() => {});
}

function getUserWorkloadStats(user) {
  if (user.role === 'admin' || user.role === 'reviewer') {
    const reviewed = state.enrichedClips.filter((c) => c.effective_verdict !== null).length;
    return {
      assignedCount: state.enrichedClips.length,
      reviewedCount: reviewed,
      pendingCount: state.enrichedClips.length - reviewed
    };
  }
  const assigned = state.enrichedClips.filter((c) => c.annotator_id === user.id);
  const reviewed = assigned.filter((c) => c.effective_verdict !== null);
  return {
    assignedCount: assigned.length,
    reviewedCount: reviewed.length,
    pendingCount: assigned.length - reviewed.length
  };
}

function getInitials(name) {
  return (name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const WB_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// Read what the user has typed in the Workbench so keyboard verdicts never drop an unsaved note/transcript edit
function wbCurrentFields(clip) {
  const editedEl = document.getElementById('wb-transcript-editor');
  const noteEl = document.getElementById('wb-note-input');
  return {
    transcript: editedEl ? editedEl.value : clip.transcript,
    note: noteEl ? noteEl.value : clip.note
  };
}

function getWorkbenchQueueIds() {
  let ids = state.workbenchQueue.length ? state.workbenchQueue : state.enrichedClips.map((c) => c.id);
  const u = state.currentUser;
  if (u && u.role === 'annotator') {
    const mine = new Set(state.enrichedClips.filter((c) => c.annotator_id === u.id).map((c) => c.id));
    ids = ids.filter((id) => mine.has(id));
  }
  return ids;
}

function batchLangCodes() {
  return Array.from(new Set(state.enrichedClips.map((c) => c.language).filter(Boolean))).sort();
}

function selectUserOnSignInCard(user) {
  if (!user) return;
  state.selectedSignInUser = user;
  const stats = getUserWorkloadStats(user);

  const avatarEl = document.getElementById('selected-user-avatar');
  const nameEl = document.getElementById('selected-user-name');
  const idEl = document.getElementById('selected-user-id');
  const rolePillEl = document.getElementById('selected-user-role-pill');
  const langsEl = document.getElementById('selected-user-langs');
  const workloadLabel = document.getElementById('workload-counter-label');
  const permBox = document.getElementById('permissions-matrix-pills');
  const btnText = document.getElementById('signin-btn-text');

  if (avatarEl) {
    avatarEl.textContent = getInitials(user.name);
    avatarEl.className = `user-avatar-badge avatar-${user.role}`;
  }
  if (nameEl) nameEl.textContent = user.name;
  if (idEl) idEl.textContent = user.id;

  if (rolePillEl) {
    rolePillEl.textContent = user.role.toUpperCase();
    rolePillEl.className = `role-pill role-${user.role}`;
  }

  const langText =
    user.languages && user.languages.length > 0
      ? `Assigned Languages: ${user.languages.map((l) => l.toUpperCase()).join(', ')}`
      : `All ${batchLangCodes().length} languages (${batchLangCodes().map((l) => l.toUpperCase()).join(', ')})`;

  if (langsEl) {
    langsEl.textContent = `${langText} • ${stats.assignedCount} clips (${stats.reviewedCount} reviewed)`;
  }

  if (workloadLabel) {
    workloadLabel.textContent =
      user.role === 'annotator'
        ? `${stats.assignedCount} Assigned (${stats.pendingCount} Pending)`
        : `All ${stats.assignedCount} Batch Clips`;
  }

  if (permBox) {
    const canOverview = user.role === 'admin' || user.role === 'reviewer';
    const canAdmin = user.role === 'admin';
    const explorerText =
      user.role === 'annotator'
        ? `✓ Explorer (Own ${stats.assignedCount} Clips)`
        : `✓ Explorer (all ${state.enrichedClips.length} clips)`;

    permBox.innerHTML = `
      <span class="perm-chip ${canOverview ? 'perm-allowed' : 'perm-blocked'}">
        ${canOverview ? '✓' : '✕'} Overview
      </span>
      <span class="perm-chip perm-allowed">${explorerText}</span>
      <span class="perm-chip perm-allowed">✓ Workbench</span>
      <span class="perm-chip ${canAdmin ? 'perm-allowed' : 'perm-blocked'}">
        ${canAdmin ? '✓' : '✕'} Admin Console
      </span>
    `;
  }

  if (btnText) btnText.textContent = `Sign in as ${user.name} (${user.role.toUpperCase()})`;
}

function populateStep2RoleUsers(role) {
  const roleSelect = document.getElementById('login-role-dropdown');
  const userSelect = document.getElementById('login-user-dropdown');
  const headingEl = document.getElementById('step2-portal-heading');
  const subEl = document.getElementById('step2-portal-sub');

  if (roleSelect && roleSelect.value !== role) {
    roleSelect.value = role;
  }

  const roleTitles = {
    admin: 'Admin Portal Sign In',
    reviewer: 'Reviewer QA Portal Sign In',
    annotator: 'Annotator Workbench Sign In'
  };
  const roleSubs = {
    admin: 'Choose which Admin profile to sign in as to unlock team scorecards, Gold benchmarks & batch gates.',
    reviewer: `Choose which Reviewer profile to sign in as to inspect the full ${state.enrichedClips.length}-clip batch & re-judge clips.`,
    annotator: 'Choose your Annotator profile to load your personal assigned language queue & waveform workbench.'
  };

  if (headingEl) headingEl.textContent = roleTitles[role] || 'Portal Sign In';
  if (subEl) subEl.textContent = roleSubs[role] || '';

  const matchingUsers = state.users.filter((u) => u.role === role);

  if (userSelect) {
    userSelect.innerHTML = matchingUsers
      .map((u) => {
        const stats = getUserWorkloadStats(u);
        const langInfo =
          u.languages && u.languages.length > 0
            ? ` • Langs: ${u.languages.map((l) => l.toUpperCase()).join(', ')} (${stats.assignedCount} clips)`
            : ` • All ${batchLangCodes().length} languages (${state.enrichedClips.length} clips)`;
        return `<option value="${u.id}">${u.name} (${u.id})${langInfo}</option>`;
      })
      .join('');
  }

  if (matchingUsers.length > 0) {
    selectUserOnSignInCard(matchingUsers[0]);
  }
}

function openStep2ForRole(role) {
  const step1 = document.getElementById('role-columns-section');
  const step2 = document.getElementById('step2-credentials-section');
  if (step1) step1.classList.add('hidden');
  if (step2) step2.classList.remove('hidden');
  populateStep2RoleUsers(role);
}

function returnToStep1RoleColumns() {
  const step1 = document.getElementById('role-columns-section');
  const step2 = document.getElementById('step2-credentials-section');
  if (step2) step2.classList.add('hidden');
  if (step1) step1.classList.remove('hidden');
}

function renderSignInUserList() {
  populateStep2RoleUsers(state.selectedSignInUser ? state.selectedSignInUser.role : 'admin');
}

function bindSignInEvents() {
  // Step 1 Role Column Cards -> Open Step 2 for that role
  document.querySelectorAll('[data-choose-role]').forEach((card) => {
    card.addEventListener('click', () => {
      openStep2ForRole(card.dataset.chooseRole);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openStep2ForRole(card.dataset.chooseRole);
      }
    });
  });

  const heroLoginBtn = document.getElementById('hero-open-login-btn');
  if (heroLoginBtn) {
    heroLoginBtn.addEventListener('click', () => openStep2ForRole('admin'));
  }

  const heroChooseRoleBtn = document.getElementById('hero-choose-role-btn');
  if (heroChooseRoleBtn) {
    heroChooseRoleBtn.addEventListener('click', () => {
      returnToStep1RoleColumns();
      const s1 = document.getElementById('role-columns-section');
      if (s1) s1.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const backBtn = document.getElementById('back-to-roles-btn');
  if (backBtn) {
    backBtn.addEventListener('click', returnToStep1RoleColumns);
  }

  const navRolesLink = document.getElementById('ms-nav-roles-link');
  if (navRolesLink) {
    navRolesLink.addEventListener('click', (e) => {
      e.preventDefault();
      returnToStep1RoleColumns();
    });
  }

  // Step 2 Role Dropdown change
  const roleDropdown = document.getElementById('login-role-dropdown');
  if (roleDropdown) {
    roleDropdown.addEventListener('change', (e) => {
      populateStep2RoleUsers(e.target.value);
    });
  }

  // Step 2 Specific Team Member Dropdown change
  const userDropdown = document.getElementById('login-user-dropdown');
  if (userDropdown) {
    userDropdown.addEventListener('change', (e) => {
      const uid = e.target.value;
      const u = state.users.find((x) => x.id === uid);
      if (u) selectUserOnSignInCard(u);
    });
  }

  const quickDemoAdminBtn = document.getElementById('quick-demo-admin-btn');
  if (quickDemoAdminBtn) {
    quickDemoAdminBtn.addEventListener('click', () => {
      openStep2ForRole('admin');
    });
  }

  const confirmBtn = document.getElementById('confirm-signin-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (state.selectedSignInUser) completeSignInAndEnterWorkspace(state.selectedSignInUser);
    });
  }

  const clearBtn = document.getElementById('clear-storage-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('clip_atlas_current_user_id');
      localStorage.removeItem('clip_atlas_verdicts_v1');
      localStorage.removeItem('clip_atlas_activity_log_v1');
      localStorage.removeItem('clip_atlas_settings_v1');
      localStorage.removeItem('clip_atlas_gates_v1');
      localStorage.removeItem('clip_atlas_assignments_v1');
      state.verdictOverrides = {};
      state.activityLog = [];
      state.gateDecisions = {};
      state.assignmentsMap = {};
      state.settings = { ...DEFAULT_SETTINGS };
      recomputeEnrichedClips();
      if (state.selectedSignInUser) selectUserOnSignInCard(state.selectedSignInUser);
      showToast('Browser storage reset to clean starter pack defaults.');
    });
  }

  const openSignInBtn = document.getElementById('open-signin-screen-btn');
  const brandHome = document.getElementById('ws-brand-home');
  [openSignInBtn, brandHome].forEach((el) => {
    if (el) {
      el.addEventListener('click', () => {
        document.getElementById('workspace-shell').classList.add('hidden');
        document.getElementById('signin-screen').classList.remove('hidden');
        returnToStep1RoleColumns();
      });
    }
  });

  document.querySelectorAll('#ws-nav-links .ws-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => navigateToScreen(btn.dataset.screen));
  });

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      if (state.currentUser) navigateToScreen(state.activeScreen);
    });
  }
}

// ----------------------------------------------------------------------------
// 4. ROLE-GATED ROUTING & URL SYNC
// ----------------------------------------------------------------------------
function populateHeaderUserSwitcher() {
  const select = document.getElementById('header-user-switcher');
  if (!select) return;
  const allUsersWithViewer = [...state.users];
  select.innerHTML = allUsersWithViewer
    .map((u) => `<option value="${u.id}">${u.name} (${u.role.toUpperCase()})</option>`)
    .join('');

  select.addEventListener('change', (e) => {
    const newUser = allUsersWithViewer.find((u) => u.id === e.target.value);
    if (newUser) {
      selectUserOnSignInCard(newUser);
      completeSignInAndEnterWorkspace(newUser, true);
      showToast(`Switched active user to ${newUser.name} (${newUser.role.toUpperCase()})`);
    }
  });
}

function completeSignInAndEnterWorkspace(user, stayOnCurrentScreen = false) {
  if (state.pendingDeepLink) {
    stayOnCurrentScreen = true;
    state.pendingDeepLink = false;
  }
  if (isPlayingStudioSample && studioAudioEl) {
    studioAudioEl.pause();
    isPlayingStudioSample = false;
  }

  if (state.currentUser && state.currentUser.id !== user.id) {
    state.workbenchIndex = 0;
    // drop the "only my clips" filter that was forced on the previous annotator
    if (state.currentUser.role === 'annotator' && state.filters.annotator === state.currentUser.id) {
      state.filters.annotator = 'all';
    }
  }
  state.currentUser = user;
  localStorage.setItem('clip_atlas_current_user_id', user.id);

  const select = document.getElementById('header-user-switcher');
  const badge = document.getElementById('header-role-badge');
  if (select) select.value = user.id;
  if (badge) {
    badge.textContent = user.role.toUpperCase();
    badge.className = `role-pill role-${user.role}`;
  }

  const navOverview = document.getElementById('nav-btn-overview');
  const navAdmin = document.getElementById('nav-btn-admin');
  if (navOverview) navOverview.classList.toggle('hidden', user.role === 'annotator');
  if (navAdmin) navAdmin.classList.toggle('hidden', user.role !== 'admin');

  document.getElementById('signin-screen').classList.add('hidden');
  document.getElementById('workspace-shell').classList.remove('hidden');

  if (user.role === 'annotator') {
    state.filters.annotator = user.id;
    const targetScreen =
      stayOnCurrentScreen && (state.activeScreen === 'workbench' || state.activeScreen === 'admin' || state.activeScreen === 'overview')
        ? state.activeScreen
        : 'explorer';
    navigateToScreen(targetScreen);
  } else {
    if (state.filters.annotator && state.users.some((u) => u.id === state.filters.annotator && u.role === 'annotator') && !stayOnCurrentScreen) {
      state.filters.annotator = 'all';
    }
    const targetScreen = stayOnCurrentScreen ? state.activeScreen : 'overview';
    navigateToScreen(targetScreen);
  }
}

function switchSarvamSubsection(screenName, subId) {
  if (!state.activeSubsections) {
    state.activeSubsections = {
      overview: 'all',
      explorer: 'all',
      workbench: 'all',
      admin: 'scorecard'
    };
  }
  state.activeSubsections[screenName] = subId;
  if (state.activeScreen !== screenName) {
    navigateToScreen(screenName);
  } else {
    renderSarvamDocsNavigation();
  }
}

function renderSarvamDocsNavigation() {
  const sidebarEl = document.getElementById('sarvam-docs-sidebar');
  const headerEl = document.getElementById('sarvam-subnav-header');
  const footerEl = document.getElementById('sarvam-subnav-footer');
  const mainContainer = document.getElementById('ws-main-container');
  if (!sidebarEl || !headerEl || !footerEl || !mainContainer) return;

  const currentRole = state.currentUser ? state.currentUser.role : 'admin';
  const activeScreen = state.activeScreen || 'overview';
  const screenSubs = SARVAM_SUBSECTIONS[activeScreen] || [];
  const requestedSubId = state.activeSubsections && state.activeSubsections[activeScreen];
  const activeSubId = screenSubs.some((sb) => sb.id === requestedSubId)
    ? requestedSubId
    : (screenSubs[0] ? screenSubs[0].id : 'all');

  // 1. Render Left Hierarchical Sidebar (Sarvam AI Docs Reference Style)
  const screensOrder = ['overview', 'explorer', 'workbench', 'admin'].filter((scr) => {
    if (scr === 'overview' && currentRole === 'annotator') return false;
    if (scr === 'admin' && currentRole !== 'admin') return false;
    return true;
  });

  sidebarEl.innerHTML = `
    <div class="mora-side-search" aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <span>Search</span>
      <kbd>⌘K</kbd>
    </div>
    <div class="sarvam-sidebar-eyebrow">Workspace</div>
    ${screensOrder
      .map((scr) => {
        const isCurrentScreen = scr === activeScreen;
        const subs = SARVAM_SUBSECTIONS[scr] || [];
        const curSubForScr = (state.activeSubsections && state.activeSubsections[scr]) || subs[0].id;
        if (subs.length === 1) {
          const singleIcon = scr === 'workbench'
            ? '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>'
            : '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>';
          return `
          <div class="sarvam-nav-group mora-single-group">
            <button type="button" class="sarvam-subitem-btn mora-single-btn ${isCurrentScreen ? 'active' : ''}" data-sarvam-jump-screen="${scr}" data-sarvam-jump-sub="${subs[0].id}">
              <span class="mora-sub-label">
                <svg class="mora-sub-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${singleIcon}</svg>
                <span>${SARVAM_SCREEN_TITLES[scr]}</span>
              </span>
            </button>
          </div>`;
        }
        return `
          <div class="sarvam-nav-group">
            <button type="button" class="sarvam-group-header ${isCurrentScreen ? 'active-group' : ''}" data-sarvam-screen="${scr}">
              <span class="mora-group-label">
                <svg class="mora-chev ${isCurrentScreen ? 'open' : ''}" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                ${SARVAM_SCREEN_TITLES[scr]}
              </span>
            </button>
            <div class="sarvam-sublist">
              ${subs
                .map((sub) => {
                  const isSubActive = isCurrentScreen && curSubForScr === sub.id;
                  return `
                    <button
                      type="button"
                      class="sarvam-subitem-btn ${isSubActive ? 'active' : ''}"
                      data-sarvam-jump-screen="${scr}"
                      data-sarvam-jump-sub="${sub.id}"
                    >
                      <span class="mora-sub-label">
                        <svg class="mora-sub-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${sub.id === 'all' ? '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' : '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'}</svg>
                        <span>${sub.title}</span>
                      </span>
                      <span class="sarvam-subitem-badge">${sub.badge}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('')}
  `;

  // 2. Render Top Breadcrumb Header (All sections/subsections live in the sidebar)
  const currentSubObj = screenSubs.find((s) => s.id === activeSubId) || screenSubs[0];
  headerEl.innerHTML = `
    <div class="sarvam-breadcrumb-line mora-hero-line">
      <h1 class="mora-headline">
        <span class="mora-headline-muted">${SARVAM_SCREEN_TITLES[activeScreen]}</span><br />
        <span>${currentSubObj ? currentSubObj.title : ''}</span>
      </h1>
      <div class="mora-hero-right">
        <p class="mora-hero-desc">${currentSubObj ? currentSubObj.desc : ''}</p>
      </div>
    </div>
  `;

  // 3. Apply Subsection Visibility in #ws-main-container (Instant 0ms DOM Toggle)
  const docSections = mainContainer.querySelectorAll('.sarvam-doc-section');
  docSections.forEach((sec) => {
    const sid = sec.getAttribute('data-sub-id');
    if (activeSubId === 'all' || sid === activeSubId) {
      sec.classList.remove('hidden-subsection');
    } else {
      sec.classList.add('hidden-subsection');
    }
  });

  // Adjust Workbench layout columns when viewing a focused subsection vs Split Workbench ('all')

  // If on Workbench and audio_visualizer or all is visible, redraw canvas so width is accurate
  if (activeScreen === 'workbench' && (activeSubId === 'audio_visualizer' || activeSubId === 'all')) {
    const waveCanvas = document.getElementById('wb-wave-canvas');
    const queueIds = getWorkbenchQueueIds();
    const clip = state.enrichedClips.find((c) => c.id === queueIds[state.workbenchIndex]);
    if (waveCanvas && clip) {
      const ratio = wbAudioEl && wbAudioEl.duration ? wbAudioEl.currentTime / wbAudioEl.duration : 0;
      requestAnimationFrame(() => drawClipVisualizer(clip, waveCanvas, ratio));
    }
  }

  // 4. Render Bottom Sarvam Docs-Style Previous / Next Subsection Cards
  const curIdx = screenSubs.findIndex((s) => s.id === activeSubId);
  const prevSub = curIdx > 0 ? screenSubs[curIdx - 1] : null;
  const nextSub = curIdx >= 0 && curIdx < screenSubs.length - 1 ? screenSubs[curIdx + 1] : null;

  footerEl.style.display = prevSub || nextSub ? '' : 'none';
  footerEl.innerHTML = `
    <div>
      ${
        prevSub
          ? `
        <button type="button" class="sarvam-page-nav-card" style="width:100%;" data-sarvam-jump-screen="${activeScreen}" data-sarvam-jump-sub="${prevSub.id}">
          <span class="sarvam-page-nav-dir">← Previous Subsection</span>
          <span class="sarvam-page-nav-title">${prevSub.title}</span>
        </button>
      `
          : '<div></div>'
      }
    </div>
    <div>
      ${
        nextSub
          ? `
        <button type="button" class="sarvam-page-nav-card align-right" style="width:100%;" data-sarvam-jump-screen="${activeScreen}" data-sarvam-jump-sub="${nextSub.id}">
          <span class="sarvam-page-nav-dir">Next Subsection →</span>
          <span class="sarvam-page-nav-title">${nextSub.title}</span>
        </button>
      `
          : '<div></div>'
      }
    </div>
  `;

  // Bind clicks on Sidebar, Header Pills, and Footer Cards
  document.querySelectorAll('[data-sarvam-screen]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetScr = btn.getAttribute('data-sarvam-screen');
      navigateToScreen(targetScr);
    });
  });

  document.querySelectorAll('[data-sarvam-jump-sub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetScr = btn.getAttribute('data-sarvam-jump-screen');
      const targetSub = btn.getAttribute('data-sarvam-jump-sub');
      switchSarvamSubsection(targetScr, targetSub);
    });
  });
}

function navigateToScreen(screenName) {
  state.activeScreen = screenName;
  syncUrlFilters();

  document.querySelectorAll('#ws-nav-links .ws-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === screenName);
  });

  const filtered = getFilteredClips();
  const expCountEl = document.getElementById('nav-explorer-count');
  const qCountEl = document.getElementById('nav-queue-count');
  if (expCountEl) expCountEl.textContent = filtered.length;
  if (qCountEl) qCountEl.textContent = state.workbenchQueue.length;

  renderGlobalFilterBreadcrumb();

  const container = document.getElementById('ws-main-container');
  if (!container || !state.currentUser) return;

  // Polite Access Denied Guards (Required by Role Matrix)
  if (screenName === 'admin' && state.currentUser.role !== 'admin') {
    container.innerHTML = `
      <div class="panel-card" style="text-align:center; padding: 64px 28px; max-width: 600px; margin: 40px auto;">
        <span class="role-pill role-admin" style="margin-bottom:14px; display:inline-block;">ADMIN ACCESS REQUIRED</span>
        <h2 style="font-size:1.65rem; margin-bottom:10px;">You need admin access to view the Admin Console</h2>
        <p style="color:var(--text-muted); margin-bottom:24px; line-height:1.6;">
          You are currently signed in as <strong>${state.currentUser.name}</strong> (<code>${state.currentUser.role}</code>).
          Team scorecards, Gold accuracy benchmarks, threshold settings, and batch acceptance gates are restricted to Admin accounts.
        </p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button type="button" class="emplo-login-btn" id="polite-back-btn">
            Return to Allowed Workspace
          </button>
          <button type="button" class="ws-switch-screen-btn" id="polite-switch-admin-btn">
            Switch to Kiran M. (Admin) →
          </button>
        </div>
      </div>
    `;
    document.getElementById('polite-back-btn').addEventListener('click', () => {
      navigateToScreen(state.currentUser.role === 'annotator' ? 'explorer' : 'overview');
    });
    document.getElementById('polite-switch-admin-btn').addEventListener('click', () => {
      const adm = state.users.find((u) => u.role === 'admin');
      if (adm) completeSignInAndEnterWorkspace(adm, true);
    });
    renderSarvamDocsNavigation();
    return;
  }

  if (screenName === 'overview' && state.currentUser.role === 'annotator') {
    container.innerHTML = `
      <div class="panel-card" style="text-align:center; padding: 56px 24px; max-width: 580px; margin: 40px auto;">
        <span class="role-pill role-reviewer" style="margin-bottom:12px; display:inline-block;">REVIEWER / ADMIN VIEW</span>
        <h2 style="font-size:1.5rem; margin-bottom:10px;">Batch Overview is restricted for Annotator accounts</h2>
        <p style="color:var(--text-muted); margin-bottom:22px;">
          As an annotator (<strong>${state.currentUser.name}</strong>), your workspace is scoped to your assigned clips in Clip Explorer and the Listening Workbench.
        </p>
        <button type="button" class="emplo-login-btn" id="annotator-go-explorer-btn">
          Open My Assigned Clips in Explorer →
        </button>
      </div>
    `;
    document.getElementById('annotator-go-explorer-btn').addEventListener('click', () => navigateToScreen('explorer'));
    renderSarvamDocsNavigation();
    return;
  }

  if (screenName === 'overview') renderScreenOverview(container);
  else if (screenName === 'explorer') renderScreenExplorer(container);
  else if (screenName === 'workbench') renderScreenWorkbench(container);
  else if (screenName === 'admin') renderScreenAdmin(container);
}

function renderGlobalFilterBreadcrumb() {
  const strip = document.getElementById('global-filter-strip');
  if (!strip) return;
  const activeChips = [];
  const f = state.filters;
  if (f.language !== 'all') activeChips.push(`Lang: ${f.language.toUpperCase()}`);
  if (f.source !== 'all') activeChips.push(`Source: ${f.source}`);
  if (f.speaker !== 'all') activeChips.push(`Speaker: ${f.speaker}`);
  if (f.annotator !== 'all') activeChips.push(`Annotator: ${f.annotator}`);
  if (f.verdict !== 'all') activeChips.push(`Status: ${f.verdict}`);
  if (f.flag !== 'all') activeChips.push(`Issue: ${f.flag}`);
  if (f.search.trim()) activeChips.push(`Search: "${f.search.trim()}"`);
  if (f.minDur > 0 || f.maxDur < 30) activeChips.push(`Dur: ${f.minDur}–${f.maxDur}s`);
  if (f.minSnr > 0 || f.maxSnr < 45) activeChips.push(`SNR: ${f.minSnr}–${f.maxSnr}dB`);
  if (f.minCer > 0 || f.maxCer < 120) activeChips.push(`CER: ${f.minCer}–${f.maxCer}%`);

  if (activeChips.length === 0) {
    strip.classList.add('hidden');
    return;
  }

  const matchedCount = getFilteredClips().length;
  strip.classList.remove('hidden');
  strip.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      <strong>Active Slice (${matchedCount} of ${state.enrichedClips.length} clips):</strong>
      ${activeChips.map((c) => `<span class="filter-chip-pill">${c}</span>`).join('')}
    </div>
    <div style="display:flex; gap:8px;">
      <button type="button" class="ws-utility-btn" id="strip-copy-url-btn">🔗 Copy Shareable URL</button>
      <button type="button" class="ws-utility-btn" id="strip-clear-filters-btn">✕ Clear All Filters</button>
    </div>
  `;

  document.getElementById('strip-copy-url-btn').addEventListener('click', copyShareableUrl);
  document.getElementById('strip-clear-filters-btn').addEventListener('click', () => {
    resetFilters();
    syncUrlFilters();
    navigateToScreen(state.activeScreen);
  });
}

function copyShareableUrl() {
  syncUrlFilters();
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('Shareable filtered URL copied to clipboard! Paste into Slack or FINDINGS.md.');
  }).catch(() => {
    showToast(`Shareable URL ready in address bar: ${window.location.search}`);
  });
}

// ----------------------------------------------------------------------------
// 5. SCREEN 1: BATCH OVERVIEW DASHBOARD (WITH DISTRIBUTIONS & DERIVED CHECKS)
// ----------------------------------------------------------------------------
function buildHistogramHtml(values, bins, unit, color, filterKey) {
  const counts = bins.map((b) => values.filter((v) => v >= b.min && v < b.max).length);
  const maxCnt = Math.max(...counts, 1);

  const barsHtml = bins
    .map((b, i) => {
      const cnt = counts[i];
      const hPct = Math.max(6, Math.round((cnt / maxCnt) * 100));
      const barColor = b.warn ? '#D9534F' : color;
      return `
        <div class="hist-col" data-hist-key="${filterKey}" data-hist-min="${b.min}" data-hist-max="${b.max}" title="${b.label}${unit}: ${cnt} clips (Click to filter Explorer)">
          <span class="hist-count">${cnt}</span>
          <div class="hist-bar" style="height:${hPct}%; background:${barColor}; border-radius:6px 6px 0 0;"></div>
        </div>
      `;
    })
    .join('');

  const labelsHtml = bins
    .map((b) => `<span class="hist-x-lbl">${b.label}</span>`)
    .join('');

  return `
    <div class="histogram-bars">${barsHtml}</div>
    <div class="hist-x-labels">${labelsHtml}</div>
  `;
}

function buildGroupCompareHtml(clips, groupBy, metricGetter, maxScale, unit, colorMap) {
  const groups =
    groupBy === 'source'
      ? ['inhouse_studio', 'crowd_app', 'vendor_a', 'vendor_b']
      : Object.keys(LANG_NAMES);

  return `
    <div class="group-comp-list">
      ${groups
        .map((g) => {
          const slice = clips
            .filter((c) => (groupBy === 'source' ? c.source === g : c.language === g))
            .map(metricGetter)
            .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
            .sort((a, b) => a - b);

          if (!slice.length) return '';
          const q25 = slice[Math.floor(slice.length * 0.25)];
          const med = slice[Math.floor(slice.length * 0.5)];
          const q75 = slice[Math.floor(slice.length * 0.75)];

          const leftPct = Math.min(95, Math.max(0, (q25 / maxScale) * 100));
          const widthPct = Math.max(4, Math.min(100 - leftPct, ((q75 - q25) / maxScale) * 100));
          const medPct = Math.min(98, Math.max(2, (med / maxScale) * 100));
          const col = colorMap[g] || '#18181B';
          const attr = groupBy === 'source' ? `data-filter-source="${g}"` : `data-filter-lang="${g}"`;

          return `
            <div class="group-comp-row" ${attr} title="Click to filter ${g.toUpperCase()} • IQR: ${q25.toFixed(1)}–${q75.toFixed(1)}${unit}, Median: ${med.toFixed(1)}${unit}">
              <span style="font-weight:700; font-size:0.72rem;">${groupBy === 'language' ? g.toUpperCase() : g.replace('_', ' ')}</span>
              <div class="group-iqr-track">
                <div class="group-iqr-box" style="left:${leftPct}%; width:${widthPct}%; background:${col};"></div>
                <div class="group-median-dot" style="left:${medPct}%;"></div>
              </div>
              <span style="font-family:var(--font-mono); font-size:0.69rem; text-align:right;">Med ${med.toFixed(1)}${unit}</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderScreenOverview(container) {
  const clips = state.enrichedClips;
  const totalClips = clips.length;
  const totalSeconds = clips.reduce((acc, c) => acc + (c.duration_s || 0), 0);
  const totalMinutes = (totalSeconds / 60).toFixed(1);
  const totalHours = (totalSeconds / 3600).toFixed(2);
  const languages = new Set(clips.map((c) => c.language));
  const speakers = new Set(clips.map((c) => c.speaker_id));
  const reviewedCount = clips.filter((c) => c.effective_verdict !== null).length;
  const flaggedCount = clips.filter((c) => c.all_flags.length > 0).length;

  const sources = Object.keys(SOURCE_COLORS);
  const langSecMap = {};
  Object.keys(LANG_NAMES).forEach((l) => {
    langSecMap[l] = clips.filter((c) => c.language === l).reduce((s, c) => s + (c.duration_s || 0), 0);
  });
  const maxLangSec = Math.max(1, ...Object.values(langSecMap));
  const sourceCounts = sources.map((src) => ({
    src,
    count: clips.filter((c) => c.source === src).length,
    sec: clips.filter((c) => c.source === src).reduce((s, c) => s + (c.duration_s || 0), 0)
  }));

  const langRowsHtml = Object.keys(LANG_NAMES)
    .map((lang) => {
      const langClips = clips.filter((c) => c.language === lang);
      const langSec = langClips.reduce((s, c) => s + (c.duration_s || 0), 0);
      const segs = sources
        .map((src) => {
          const srcClips = langClips.filter((c) => c.source === src);
          const srcSec = srcClips.reduce((s, c) => s + (c.duration_s || 0), 0);
          const pct = (srcSec / maxLangSec) * 100;
          if (srcClips.length === 0) return '';
          return `<div class="bar-seg" data-filter-lang="${lang}" data-filter-source="${src}" style="width:${Math.min(100, pct)}%; background:${SOURCE_COLORS[src]}" title="${LANG_NAMES[lang]} • ${src}: ${(srcSec / 60).toFixed(1)}m (${srcClips.length} clips) — Click to filter"></div>`;
        })
        .join('');

      return `
        <div class="bar-row" data-filter-lang="${lang}">
          <span class="bar-label">${LANG_NAMES[lang].split(' ')[0]} (${lang.toUpperCase()})</span>
          <div class="bar-track">${segs}</div>
          <span class="bar-val">${(langSec / 3600).toFixed(2)}h / ${(langSec / 60).toFixed(1)}m (${langClips.length})</span>
        </div>
      `;
    })
    .join('');

  // Distributions (Duration, SNR, CER)
  const durValues = clips.map((c) => c.duration_s || 0);
  const snrValues = clips.map((c) => c.snr_db).filter((v) => v !== null && v !== undefined);
  const cerValues = clips.map((c) => (c.cer !== null && c.cer !== undefined ? c.cer * 100 : null)).filter((v) => v !== null);

  const durBins = [
    { label: '<2.5s', min: 0, max: 2.5, warn: true },
    { label: '2.5-6s', min: 2.5, max: 6, warn: false },
    { label: '6-10s', min: 6, max: 10, warn: false },
    { label: '10-14s', min: 10, max: 14, warn: false },
    { label: '14-18s', min: 14, max: 18, warn: false },
    { label: '18s+', min: 18, max: 99, warn: false }
  ];
  const snrBins = [
    { label: `<${state.settings.minSnrDb}`, min: 0, max: state.settings.minSnrDb, warn: true },
    { label: '15-20', min: state.settings.minSnrDb, max: 20, warn: false },
    { label: '20-25', min: 20, max: 25, warn: false },
    { label: '25-30', min: 25, max: 30, warn: false },
    { label: '30dB+', min: 30, max: 99, warn: false }
  ];
  const cerMaxPct = Math.round(state.settings.maxCer * 100);
  const cerBins = [
    { label: '0-3%', min: 0, max: 3, warn: false },
    { label: '3-6%', min: 3, max: 6, warn: false },
    { label: `6-${cerMaxPct}%`, min: 6, max: cerMaxPct, warn: false },
    { label: `${cerMaxPct}-50%`, min: cerMaxPct, max: 50, warn: true },
    { label: '50%+', min: 50, max: 200, warn: true }
  ];

  const colorMap = state.distCompareMode === 'source' ? SOURCE_COLORS : LANG_COLORS;

  const durBodyHtml =
    state.distCompareMode === 'histogram'
      ? buildHistogramHtml(durValues, durBins, 's', '#D4A055', 'dur')
      : buildGroupCompareHtml(clips, state.distCompareMode, (c) => c.duration_s, 22, 's', colorMap);

  const snrBodyHtml =
    state.distCompareMode === 'histogram'
      ? buildHistogramHtml(snrValues, snrBins, ' dB', '#3F3F46', 'snr')
      : buildGroupCompareHtml(clips, state.distCompareMode, (c) => c.snr_db, 38, 'dB', colorMap);

  const cerBodyHtml =
    state.distCompareMode === 'histogram'
      ? buildHistogramHtml(cerValues, cerBins, '%', '#A1A1AA', 'cer')
      : buildGroupCompareHtml(clips, state.distCompareMode, (c) => (c.cer !== null ? c.cer * 100 : null), 100, '%', colorMap);

  // Issue Breakdown (Simple & Clean Single-Column Table / List)
  const flagDefs = [
    {
      key: 'low_snr',
      label: 'low_snr',
      type: 'Pipeline Flag',
      desc: 'Background noise is high relative to speech.',
      rule: `snr_db < ${state.settings.minSnrDb} dB`
    },
    {
      key: 'clipping',
      label: 'clipping',
      type: 'Pipeline Flag',
      desc: 'Audio peaks are saturated (the recording level was too hot).',
      rule: 'clipping_pct > 1.0% of samples'
    },
    {
      key: 'long_silence',
      label: 'long_silence',
      type: 'Pipeline Flag',
      desc: 'A large share of the clip is silence.',
      rule: 'silence_ratio > 0.40 (40%)'
    },
    {
      key: 'rate_anomaly',
      label: 'rate_anomaly',
      type: 'Derived Check',
      desc: 'Transcript length does not fit the audio duration (truncated audio, empty or padded transcript).',
      rule: `chars/sec ∉ [${state.settings.minCps}, ${state.settings.maxCps}] or len == 0`
    },
    {
      key: 'script_mismatch',
      label: 'script_mismatch',
      type: 'Derived Check',
      desc: 'Transcript is written in a different script than the language tag expects.',
      rule: '<75% of letters match language Unicode block'
    },
    {
      key: 'duplicate_transcript',
      label: 'duplicate_transcript',
      type: 'Derived Check',
      desc: 'The same sentence was recorded by more than one speaker (risk of train/test leakage).',
      rule: 'normalized text shared across >1 speaker_id'
    }
  ];

  const issueRowsHtml = flagDefs
    .map((f) => {
      const matched = clips.filter((c) => c.all_flags.includes(f.key));
      return `
        <tr class="clean-issue-row" data-filter-flag="${f.key}" style="cursor:pointer;" title="Click to inspect these ${matched.length} clips in Clip Explorer">
          <td>
            <span class="clean-status-dot" style="background:${f.type === 'Derived Check' ? '#D4A055' : '#3F3F46'};"></span>
            <strong>${f.label}</strong>
          </td>
          <td><span style="color:var(--text-muted); font-size:0.78rem;">${f.type}</span></td>
          <td><code style="font-size:0.78rem; color:var(--text-body);">${f.rule}</code></td>
          <td style="color:var(--text-muted); font-size:0.82rem;">${f.desc}</td>
          <td style="font-weight:700; font-size:0.9rem;">${matched.length} clips</td>
          <td style="text-align:right;">
            <button type="button" class="clean-pill-action-btn">Filter Clips →</button>
          </td>
        </tr>
      `;
    })
    .join('');

  // Annotator Mini-Panel
  const annotators = state.users.filter((u) => u.role === 'annotator');
  const annotatorRowsHtml = annotators
    .map((ann) => {
      const assigned = clips.filter((c) => c.annotator_id === ann.id);
      const revClips = assigned.filter((c) => c.effective_verdict !== null);
      const times = revClips.map((c) => c.review_seconds || 0).filter((t) => t > 0).sort((a, b) => a - b);
      const medianTime = times.length ? times[Math.floor(times.length / 2)].toFixed(1) : '—';
      const keepCount = revClips.filter((c) => c.effective_verdict === 'keep').length;
      const keepRate = revClips.length ? Math.round((keepCount / revClips.length) * 100) : 0;

      const goldClips = revClips.filter((c) => state.goldMap.has(c.id));
      const goldMatches = goldClips.filter((c) => c.annotator_verdict === state.goldMap.get(c.id).expert_verdict);
      const goldAcc = goldClips.length ? Math.round((goldMatches.length / goldClips.length) * 100) : 100;

      const hasGold = goldClips.length > 0;
      const isSpeedOutlier = medianTime !== '—' && parseFloat(medianTime) < state.settings.minReviewSec;
      const isAccOutlier = hasGold && goldAcc < state.settings.goldTargetPct;

      let badgeHtml = '<span class="status-chip chip-good">Normal</span>';
      if (isSpeedOutlier) badgeHtml = `<span class="status-chip chip-action" title="Median review time is below the ${state.settings.minReviewSec}s threshold in Settings">Rushed (${medianTime}s median)</span>`;
      else if (isAccOutlier) badgeHtml = `<span class="status-chip chip-watch" title="Gold accuracy is below the ${state.settings.goldTargetPct}% target in Settings">Below gold target</span>`;
      else if (!revClips.length) badgeHtml = '<span class="status-chip chip-watch">Not started</span>';

      return `
        <tr class="${isSpeedOutlier || isAccOutlier ? 'outlier-row' : ''}" data-filter-annotator="${ann.id}" style="cursor:pointer;" title="Click to filter ${ann.name}'s clips in Explorer">
          <td>
            <strong>${ann.name}</strong> <span class="selected-user-id">(${ann.id})</span>
            <div style="font-size:0.68rem; color:var(--text-muted);">${ann.languages.map((l) => l.toUpperCase()).join(', ')}</div>
          </td>
          <td>${revClips.length} / ${assigned.length}</td>
          <td><strong class="${isSpeedOutlier ? 'ov-bad' : ''}">${medianTime === '—' ? '—' : `${medianTime}s`}</strong></td>
          <td><strong>${revClips.length ? `${keepRate}%` : '—'}</strong></td>
          <td><strong class="${isAccOutlier ? 'ov-bad' : ''}">${hasGold ? `${goldAcc}%` : '—'}</strong> <span class="ov-muted">${hasGold ? `(${goldMatches.length}/${goldClips.length})` : ''}</span></td>
          <td>${badgeHtml}</td>
        </tr>
      `;
    })
    .join('');

  const reviewedPct = totalClips ? Math.round((reviewedCount / totalClips) * 100) : 0;
  const flaggedPct = totalClips ? Math.round((flaggedCount / totalClips) * 100) : 0;
  const flagOk = flaggedPct <= state.settings.maxFlaggedPct;
  const pendingCount = totalClips - reviewedCount;
  const hoursLabel = totalSeconds >= 3600 ? `${(totalSeconds / 3600).toFixed(1)} h` : `${totalHours} h`;
  const langCodes = Array.from(languages).filter(Boolean).sort();
  const fmtSrc = (src) => src.replace(/_/g, ' ');

  container.innerHTML = `
    <div class="sarvam-doc-section" data-sub-id="headline">
      <div class="ov-kpi-grid">
        <button type="button" class="ov-kpi" data-reset-explorer="true" title="Open all clips">
          <span class="ov-kpi-label">Total clips</span>
          <span class="ov-kpi-value">${totalClips.toLocaleString()}</span>
          <span class="ov-kpi-sub">${sources.length} recording sources</span>
        </button>
        <div class="ov-kpi">
          <span class="ov-kpi-label">Total audio</span>
          <span class="ov-kpi-value">${hoursLabel}</span>
          <span class="ov-kpi-sub">${totalMinutes} minutes</span>
        </div>
        <button type="button" class="ov-kpi" data-scroll-to="hours" title="See hours by language">
          <span class="ov-kpi-label">Languages</span>
          <span class="ov-kpi-value">${langCodes.length}</span>
          <span class="ov-kpi-sub">${langCodes.map((l) => l.toUpperCase()).join(' · ')}</span>
        </button>
        <div class="ov-kpi">
          <span class="ov-kpi-label">Speakers</span>
          <span class="ov-kpi-value">${speakers.size}</span>
          <span class="ov-kpi-sub">${(totalClips / Math.max(1, speakers.size)).toFixed(1)} clips per speaker</span>
        </div>
        <button type="button" class="ov-kpi" data-filter-verdict="unreviewed" title="Open the ${pendingCount} unreviewed clips">
          <span class="ov-kpi-label">Reviewed</span>
          <span class="ov-kpi-value">${reviewedPct}%</span>
          <span class="ov-kpi-bar"><i style="width:${reviewedPct}%;"></i></span>
          <span class="ov-kpi-sub">${reviewedCount} done · ${pendingCount} pending</span>
        </button>
        <button type="button" class="ov-kpi" data-filter-flag="any_flag" title="Open the ${flaggedCount} flagged clips">
          <span class="ov-kpi-label">Flagged</span>
          <span class="ov-kpi-value ${flagOk ? '' : 'ov-bad'}">${flaggedPct}%</span>
          <span class="ov-kpi-sub">${flaggedCount} clips · target ≤ ${state.settings.maxFlaggedPct}%
            <span class="status-chip ${flagOk ? 'chip-good' : 'chip-action'}">${flagOk ? 'Within target' : 'Over target'}</span>
          </span>
        </button>
      </div>
    </div>

    <div class="sarvam-doc-section" data-sub-id="hours_language" id="ov-hours">
      <div class="panel-card" style="margin-bottom:16px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">Hours by language, split by source</div>
            <div class="panel-subtitle">Click a segment to open that language × source slice, or a source below to filter by source.</div>
          </div>
          <div class="ov-legend">
            ${sourceCounts
              .map(
                (sc) => `<button type="button" class="ov-legend-item" data-filter-source="${sc.src}" title="${(sc.sec / 60).toFixed(1)} min">
                  <i style="background:${SOURCE_COLORS[sc.src]};"></i>${fmtSrc(sc.src)} <span class="ov-muted">${sc.count}</span>
                </button>`
              )
              .join('')}
          </div>
        </div>
        <div>${langRowsHtml}</div>
      </div>
    </div>

    <!-- SUBSECTION 2: ANNOTATOR PANEL -->
    <div class="sarvam-doc-section" data-sub-id="annotator_panel">
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">Annotators</div>
            <div class="panel-subtitle">Rushed = median review under ${state.settings.minReviewSec}s · Below target = gold accuracy under ${state.settings.goldTargetPct}% (both set in Admin → Settings). Click a row to see their clips.</div>
          </div>
          ${
            state.currentUser && state.currentUser.role === 'admin'
              ? `<button type="button" class="ws-utility-btn" id="overview-open-admin-btn">Full Scorecard →</button>`
              : ''
          }
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Annotator</th>
                <th>Done</th>
                <th>Median Time</th>
                <th>Keep %</th>
                <th>Gold accuracy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${annotatorRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 3: DISTRIBUTIONS OF DURATION, SNR, AND CER -->
    <div class="sarvam-doc-section" data-sub-id="distributions">
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">Distributions of Duration, SNR &amp; CER</div>
            <div class="panel-subtitle">Compare distributions across the batch, by recording source, or by language. Click any bar/slice to filter.</div>
          </div>
          <div class="seg-control" id="dist-mode-control">
            <button type="button" class="seg-btn ${state.distCompareMode === 'histogram' ? 'active' : ''}" data-dist-mode="histogram">Batch Histograms</button>
            <button type="button" class="seg-btn ${state.distCompareMode === 'source' ? 'active' : ''}" data-dist-mode="source">Compare by Source</button>
            <button type="button" class="seg-btn ${state.distCompareMode === 'language' ? 'active' : ''}" data-dist-mode="language">Compare by Language</button>
          </div>
        </div>

        <div class="dashboard-grid-3col" style="margin-bottom:0;">
          <div class="dist-chart-card">
            <div class="dist-header">
              <span class="dist-title">1. Clip Duration (seconds)</span>
              <span class="dist-badge">${clips.filter((c) => (c.duration_s || 0) < 2.5).length} clips &lt; 2.5s</span>
            </div>
            ${durBodyHtml}
          </div>

          <div class="dist-chart-card">
            <div class="dist-header">
              <span class="dist-title">2. Signal-to-Noise Ratio (dB)</span>
              <span class="dist-badge">Min Target: ${state.settings.minSnrDb} dB</span>
            </div>
            ${snrBodyHtml}
          </div>

          <div class="dist-chart-card">
            <div class="dist-header">
              <span class="dist-title">3. Character Error Rate (CER %)</span>
              <span class="dist-badge">Max Target: ${Math.round(state.settings.maxCer * 100)}%</span>
            </div>
            ${cerBodyHtml}
          </div>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 4: ISSUE BREAKDOWN (SIMPLE & CLEAN COLUMN TABLE) -->
    <div class="sarvam-doc-section" data-sub-id="issue_breakdown">
      <div class="panel-card" style="margin-bottom:0;">
        <div class="panel-header">
          <div>
            <div class="panel-title">Issue Breakdown (Pipeline Flags &amp; Browser-Derived Checks)</div>
            <div class="panel-subtitle">Computed dynamically in the browser against live thresholds. Click any row to open matching clips.</div>
          </div>
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table clean-issue-table">
            <thead>
              <tr>
                <th>Status / Check</th>
                <th>Category</th>
                <th>Threshold Rule</th>
                <th>Details</th>
                <th>Clips</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>${issueRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Distribution compare toggle
  container.querySelectorAll('[data-dist-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.distCompareMode = btn.dataset.distMode;
      renderScreenOverview(container);
    });
  });

  // Histogram bin clicks
  container.querySelectorAll('[data-hist-key]').forEach((col) => {
    col.addEventListener('click', () => {
      resetFilters();
      const key = col.dataset.histKey;
      const min = parseFloat(col.dataset.histMin);
      const max = parseFloat(col.dataset.histMax);
      if (key === 'dur') {
        state.filters.minDur = min;
        state.filters.maxDur = Math.min(30, max);
      } else if (key === 'snr') {
        state.filters.minSnr = min;
        state.filters.maxSnr = Math.min(45, max);
      } else if (key === 'cer') {
        state.filters.minCer = min;
        state.filters.maxCer = Math.min(120, max);
      }
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  // Language & source bar clicks
  container.querySelectorAll('[data-filter-lang]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      resetFilters();
      state.filters.language = el.dataset.filterLang;
      if (el.dataset.filterSource) state.filters.source = el.dataset.filterSource;
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  container.querySelectorAll('[data-filter-source]').forEach((el) => {
    if (el.hasAttribute('data-filter-lang')) return;
    el.addEventListener('click', () => {
      resetFilters();
      state.filters.source = el.dataset.filterSource;
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  container.querySelectorAll('[data-filter-flag]').forEach((el) => {
    el.addEventListener('click', () => {
      resetFilters();
      state.filters.flag = el.dataset.filterFlag;
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  container.querySelectorAll('[data-filter-verdict]').forEach((el) => {
    el.addEventListener('click', () => {
      resetFilters();
      state.filters.verdict = el.dataset.filterVerdict;
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  container.querySelectorAll('[data-filter-annotator]').forEach((el) => {
    el.addEventListener('click', () => {
      resetFilters();
      state.filters.annotator = el.dataset.filterAnnotator;
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  container.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = document.getElementById(`ov-${el.dataset.scrollTo}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  container.querySelectorAll('[data-reset-explorer]').forEach((el) => {
    el.addEventListener('click', () => {
      resetFilters();
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  const openWbBtn = document.getElementById('extej-open-wb-btn');
  if (openWbBtn) openWbBtn.addEventListener('click', () => navigateToScreen('workbench'));

  const jumpDistBtn = document.getElementById('extej-jump-dist-btn');
  if (jumpDistBtn) jumpDistBtn.addEventListener('click', () => navigateToScreen('overview'));

  const jumpIssuesBtn = document.getElementById('extej-jump-issues-btn');
  if (jumpIssuesBtn) jumpIssuesBtn.addEventListener('click', () => navigateToScreen('overview'));

  const openAdminBtn = document.getElementById('overview-open-admin-btn');
  if (openAdminBtn) openAdminBtn.addEventListener('click', () => navigateToScreen('admin'));

  renderSarvamDocsNavigation();
}

// ----------------------------------------------------------------------------
// 6. SCREEN 2: CLIP EXPLORER (SORTING, RANGES, MULTI-SELECT, 50K VIRTUALIZATION)
// ----------------------------------------------------------------------------
function resetFilters() {
  state.filters = {
    language: 'all',
    source: 'all',
    speaker: 'all',
    annotator: state.currentUser && state.currentUser.role === 'annotator' ? state.currentUser.id : 'all',
    verdict: 'all',
    flag: 'all',
    search: '',
    minDur: 0,
    maxDur: 30,
    minSnr: 0,
    maxSnr: 45,
    minCer: 0,
    maxCer: 120
  };
  state.currentPage = 1;
}

function syncUrlFilters() {
  const params = new URLSearchParams();
  if (state.activeScreen && state.activeScreen !== 'overview') {
    params.set('screen', state.activeScreen);
  }
  const f = state.filters;
  if (f.language !== 'all') params.set('language', f.language);
  if (f.source !== 'all') params.set('source', f.source);
  if (f.speaker !== 'all') params.set('speaker', f.speaker);
  if (f.annotator !== 'all') params.set('annotator', f.annotator);
  if (f.verdict !== 'all') params.set('verdict', f.verdict);
  if (f.flag !== 'all') params.set('flag', f.flag);
  if (f.search.trim()) params.set('search', f.search.trim());
  if (f.minDur > 0) params.set('minDur', f.minDur);
  if (f.maxDur < 30) params.set('maxDur', f.maxDur);
  if (f.minSnr > 0) params.set('minSnr', f.minSnr);
  if (f.maxSnr < 45) params.set('maxSnr', f.maxSnr);
  if (f.minCer > 0) params.set('minCer', f.minCer);
  if (f.maxCer < 120) params.set('maxCer', f.maxCer);
  if (state.sortField && (state.sortField !== 'id' || state.sortDir !== 'asc')) {
    params.set('sort', `${state.sortField}:${state.sortDir}`);
  }

  const qs = params.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function readUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  let hasAny = false;
  if (params.has('screen')) {
    state.activeScreen = params.get('screen');
    hasAny = true;
  }
  ['language', 'source', 'speaker', 'annotator', 'verdict', 'flag', 'search'].forEach((k) => {
    if (params.has(k)) {
      state.filters[k] = params.get(k);
      hasAny = true;
    }
  });
  ['minDur', 'maxDur', 'minSnr', 'maxSnr', 'minCer', 'maxCer'].forEach((k) => {
    if (params.has(k)) {
      state.filters[k] = parseFloat(params.get(k));
      hasAny = true;
    }
  });
  if (params.has('sort')) {
    const [field, dir] = params.get('sort').split(':');
    if (field) {
      state.sortField = field;
      state.sortDir = dir === 'desc' ? 'desc' : 'asc';
      hasAny = true;
    }
  }
  return hasAny;
}

function getFilteredClips() {
  const f = state.filters;
  const filtered = state.enrichedClips.filter((c) => {
    if (state.currentUser && state.currentUser.role === 'annotator' && c.annotator_id !== state.currentUser.id) {
      return false;
    }
    if (f.language !== 'all' && c.language !== f.language) return false;
    if (f.source !== 'all' && c.source !== f.source) return false;
    if (f.speaker !== 'all' && c.speaker_id !== f.speaker) return false;
    if (f.annotator !== 'all') {
      if (f.annotator === 'unassigned' && c.annotator_id !== null) return false;
      if (f.annotator !== 'unassigned' && c.annotator_id !== f.annotator) return false;
    }
    if (f.verdict !== 'all') {
      if (f.verdict === 'unreviewed' && c.effective_verdict !== null) return false;
      if (f.verdict === 'reviewed' && c.effective_verdict === null) return false;
      if (f.verdict === 'gold_disagree' && !c.gold_disagrees) return false;
      if (['keep', 'fix', 'drop'].includes(f.verdict) && c.effective_verdict !== f.verdict) return false;
    }
    if (f.flag !== 'all') {
      if (f.flag === 'any_flag' && c.all_flags.length === 0) return false;
      if (f.flag === 'clean' && c.all_flags.length > 0) return false;
      if (!['any_flag', 'clean'].includes(f.flag) && !c.all_flags.includes(f.flag)) return false;
    }
    if ((c.duration_s || 0) < f.minDur || (c.duration_s || 0) > f.maxDur) return false;
    if (c.snr_db !== null && (c.snr_db < f.minSnr || c.snr_db > f.maxSnr)) return false;
    if (c.cer !== null && (c.cer * 100 < f.minCer || c.cer * 100 > f.maxCer)) return false;

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchTr = (c.transcript || '').toLowerCase().includes(q);
      const matchAsr = (c.asr_hypothesis || '').toLowerCase().includes(q);
      const matchSpk = (c.speaker_id || '').toLowerCase().includes(q);
      if (!matchId && !matchTr && !matchAsr && !matchSpk) return false;
    }
    return true;
  });

  // Sort
  const dir = state.sortDir === 'asc' ? 1 : -1;
  const field = state.sortField;
  filtered.sort((a, b) => {
    const va = a[field] ?? -999;
    const vb = b[field] ?? -999;
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
    return (va - vb) * dir;
  });

  return filtered;
}

let inlineRowAudio = null;
let inlinePlayingUrl = null;

function renderClipRowHtml(c) {
  const isChecked = state.selectedClipIds.has(c.id);
  const flagsHtml = c.all_flags.length
    ? c.all_flags
        .map((f) => {
          const isDerived = ['rate_anomaly', 'script_mismatch', 'duplicate_transcript', 'high_cer'].includes(f);
          return `<span class="issue-tag-name ${isDerived ? 'issue-tag-derived' : ''}" style="margin:1px 3px 1px 0; font-size:0.65rem;">${f}</span>`;
        })
        .join('')
    : '<span style="color:#94a3b8; font-size:0.74rem;">Clean</span>';

  const verdictHtml = c.effective_verdict
    ? `<span class="status-chip ${c.effective_verdict === 'keep' ? 'chip-good' : c.effective_verdict === 'fix' ? 'chip-watch' : 'chip-action'}">${c.effective_verdict.toUpperCase()}</span>`
    : '<span style="color:#94a3b8; font-size:0.74rem;">Pending</span>';

  const isPlaying = inlinePlayingUrl === c.audio_url && inlineRowAudio && !inlineRowAudio.paused;

  return `
    <tr class="${isChecked ? 'selected-table-row' : ''}" data-row-id="${c.id}">
      <td style="width:34px; text-align:center;">
        <input type="checkbox" class="row-select-cb" data-select-id="${c.id}" ${isChecked ? 'checked' : ''} aria-label="Select ${c.id}" />
      </td>
      <td style="width:42px;">
        <button type="button" class="inline-play-btn ${isPlaying ? 'playing' : ''}" data-play-url="${c.audio_url}" title="Play ${c.id} inline" aria-label="Play ${c.id}">${isPlaying ? '⏸' : '▶'}</button>
      </td>
      <td style="width:128px;">
        <div style="display:flex; align-items:center; gap:5px;">
          <strong>${c.virtual_id || c.id}</strong>
          <span class="lang-mini-chip">${c.language}</span>
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted);">${c.source}</div>
      </td>
      <td style="width:105px;">
        <button type="button" class="speaker-link-btn" data-speaker-id="${c.speaker_id}" title="View Speaker Profile">${c.speaker_id}</button>
        <div style="font-size:0.7rem; color:var(--text-muted);">${c.annotator_id || 'unassigned'}</div>
      </td>
      <td style="width:74px;">
        <div><strong>${c.duration_s}s</strong></div>
        <div style="font-size:0.7rem; color:var(--text-muted);">${c.cps} c/s</div>
      </td>
      <td style="width:72px; color:${c.snr_db !== null && c.snr_db < state.settings.minSnrDb ? '#C0533A' : 'inherit'}; font-weight:${c.snr_db !== null && c.snr_db < state.settings.minSnrDb ? '700' : '400'};">
        ${c.snr_db !== null ? `${c.snr_db} dB` : '—'}
      </td>
      <td style="width:68px; color:${c.cer !== null && c.cer > state.settings.maxCer ? '#C0533A' : 'inherit'}; font-weight:${c.cer !== null && c.cer > state.settings.maxCer ? '700' : '400'};">
        ${c.cer !== null ? `${(c.cer * 100).toFixed(1)}%` : '—'}
      </td>
      <td class="transcript-compact-cell" title="${(c.transcript || '').replace(/"/g, '&quot;')}">
        ${c.transcript || '<em style="color:#C0533A; font-weight:700;">[Empty Transcript]</em>'}
      </td>
      <td style="width:140px; white-space:normal;">${flagsHtml}</td>
      <td style="width:86px;">${verdictHtml}</td>
      <td style="width:94px; text-align:right;">
        <button type="button" class="clean-pill-action-btn" data-open-wb="${c.id}">Inspect →</button>
      </td>
    </tr>
  `;
}

function renderScreenExplorer(container) {
  const filtered = getFilteredClips();
  const isAnnotatorLocked = state.currentUser && state.currentUser.role === 'annotator';
  const ff = state.filters;
  const fxActiveCount = [
    ff.language !== 'all',
    ff.source !== 'all',
    ff.speaker !== 'all',
    ff.annotator !== 'all' && !isAnnotatorLocked,
    ff.verdict !== 'all',
    ff.flag !== 'all',
    !!ff.search.trim(),
    ff.minDur > 0 || ff.maxDur < 30,
    ff.minSnr > 0 || ff.maxSnr < 45,
    ff.minCer > 0 || ff.maxCer < 120
  ].filter(Boolean).length;
  const allSpeakers = Array.from(new Set(state.enrichedClips.map((c) => c.speaker_id))).sort();

  // Virtual 50k dataset synthesis if enabled
  let activeDataset = filtered;
  if (state.virtual50kMode && filtered.length > 0) {
    activeDataset = Array.from({ length: 50000 }, (_, idx) => {
      const base = filtered[idx % filtered.length];
      return {
        ...base,
        virtual_id: `clp_${String(idx + 1).padStart(5, '0')}`
      };
    });
  }

  const totalRows = activeDataset.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const pageSlice = state.virtual50kMode
    ? activeDataset.slice(0, 40)
    : activeDataset.slice((state.currentPage - 1) * state.pageSize, state.currentPage * state.pageSize);

  const sortArrow = (col) => (state.sortField === col ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const selectedCount = state.selectedClipIds.size;

  // Build Speaker & Source Summary rows for Subsection 3 ('speaker_summary')
  const speakerGroups = Array.from(new Set(filtered.map((c) => c.speaker_id))).sort();
  const speakerSummaryRowsHtml = speakerGroups
    .map((spkId) => {
      const spkClips = filtered.filter((c) => c.speaker_id === spkId);
      const spkLangs = Array.from(new Set(spkClips.map((c) => c.language.toUpperCase()))).join(', ');
      const spkSources = Array.from(new Set(spkClips.map((c) => c.source))).join(', ');
      const snrVals = spkClips.map((c) => c.snr_db).filter((v) => v !== null);
      const meanSnr = snrVals.length ? (snrVals.reduce((a, b) => a + b, 0) / snrVals.length).toFixed(1) : '—';
      const flaggedCnt = spkClips.filter((c) => c.all_flags.length > 0).length;
      return `
        <tr>
          <td><button type="button" class="speaker-link-btn" data-speaker-id="${spkId}">${spkId}</button></td>
          <td><strong>${spkLangs}</strong></td>
          <td>${spkSources}</td>
          <td><strong>${spkClips.length} clips</strong></td>
          <td>${meanSnr} dB</td>
          <td>${flaggedCnt > 0 ? `<span class="status-chip chip-action">${flaggedCnt} flagged</span>` : '<span class="status-chip chip-good">Clean</span>'}</td>
          <td style="text-align:right;">
            <button type="button" class="clean-pill-action-btn" data-filter-spk-jump="${spkId}">Filter Speaker →</button>
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <!-- SUBSECTION 1: MULTI-FACET FILTER & SEARCH STUDIO -->
    <div class="sarvam-doc-section" data-sub-id="filter_studio">
      <div class="fx-panel">
        <div class="fx-head">
          <label class="fx-search ${state.filters.search.trim() ? 'is-set' : ''}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="text" id="flt-search" value="${state.filters.search.replace(/"/g, '&quot;')}" placeholder="Search transcripts, ASR text, clip or speaker ID…" aria-label="Search clips" />
          </label>
          <div class="fx-actions">
            <button type="button" class="fx-count" id="open-clip-table-sub-btn" title="Jump to the table">
              <strong>${filtered.length}</strong> of ${state.enrichedClips.length} clips
              ${fxActiveCount ? `<span class="fx-active-pill">${fxActiveCount} filter${fxActiveCount === 1 ? '' : 's'}</span>` : ''}
            </button>
            <button type="button" class="fx-btn" id="exp-copy-url-btn" title="Copy a link to this exact view">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
              Share
            </button>
            <button type="button" class="fx-btn" id="exp-reset-btn" ${fxActiveCount ? '' : 'disabled'}>Reset</button>
            <button type="button" class="fx-btn fx-btn-primary" id="send-filtered-queue-btn">Review ${filtered.length} in Workbench →</button>
          </div>
        </div>

        <div class="fx-grid">
          <label class="fx-field ${state.filters.language !== 'all' ? 'is-set' : ''}">
            <span class="fx-label">Language</span>
            <select id="flt-lang">
              <option value="all">All languages</option>
              ${Object.keys(LANG_NAMES).map((l) => `<option value="${l}" ${state.filters.language === l ? 'selected' : ''}>${LANG_NAMES[l].split(' ')[0]} (${l.toUpperCase()})</option>`).join('')}
            </select>
          </label>
          <label class="fx-field ${state.filters.source !== 'all' ? 'is-set' : ''}">
            <span class="fx-label">Source</span>
            <select id="flt-source">
              <option value="all">All sources</option>
              ${Object.keys(SOURCE_COLORS).map((src) => `<option value="${src}" ${state.filters.source === src ? 'selected' : ''}>${src.replace(/_/g, ' ')}</option>`).join('')}
            </select>
          </label>
          <label class="fx-field ${state.filters.speaker !== 'all' ? 'is-set' : ''}">
            <span class="fx-label">Speaker <em>${allSpeakers.length}</em></span>
            <select id="flt-speaker">
              <option value="all">All speakers</option>
              ${allSpeakers.map((s) => `<option value="${s}" ${state.filters.speaker === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
          <label class="fx-field ${state.filters.annotator !== 'all' && !isAnnotatorLocked ? 'is-set' : ''} ${isAnnotatorLocked ? 'is-locked' : ''}">
            <span class="fx-label">Annotator ${isAnnotatorLocked ? '<em>you</em>' : ''}</span>
            <select id="flt-annotator" ${isAnnotatorLocked ? 'disabled' : ''}>
              <option value="all">All annotators</option>
              <option value="unassigned" ${state.filters.annotator === 'unassigned' ? 'selected' : ''}>Unassigned (${state.enrichedClips.filter((c) => !c.annotator_id).length})</option>
              ${state.users.filter((u) => u.role === 'annotator').map((u) => `<option value="${u.id}" ${state.filters.annotator === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
          </label>
          <label class="fx-field ${state.filters.verdict !== 'all' ? 'is-set' : ''}">
            <span class="fx-label">Status</span>
            <select id="flt-verdict">
              <option value="all">Any status</option>
              <option value="reviewed" ${state.filters.verdict === 'reviewed' ? 'selected' : ''}>Reviewed</option>
              <option value="unreviewed" ${state.filters.verdict === 'unreviewed' ? 'selected' : ''}>Unreviewed</option>
              <option value="keep" ${state.filters.verdict === 'keep' ? 'selected' : ''}>Keep</option>
              <option value="fix" ${state.filters.verdict === 'fix' ? 'selected' : ''}>Fix transcript</option>
              <option value="drop" ${state.filters.verdict === 'drop' ? 'selected' : ''}>Drop</option>
              <option value="gold_disagree" ${state.filters.verdict === 'gold_disagree' ? 'selected' : ''}>Disagrees with gold</option>
            </select>
          </label>
          <label class="fx-field ${state.filters.flag !== 'all' ? 'is-set' : ''}">
            <span class="fx-label">Flag / check</span>
            <select id="flt-flag">
              <option value="all">Any flag</option>
              <option value="any_flag" ${state.filters.flag === 'any_flag' ? 'selected' : ''}>Flagged (any issue)</option>
              <option value="clean" ${state.filters.flag === 'clean' ? 'selected' : ''}>Clean only</option>
              <optgroup label="Pipeline flags">
                <option value="low_snr" ${state.filters.flag === 'low_snr' ? 'selected' : ''}>low_snr</option>
                <option value="clipping" ${state.filters.flag === 'clipping' ? 'selected' : ''}>clipping</option>
                <option value="long_silence" ${state.filters.flag === 'long_silence' ? 'selected' : ''}>long_silence</option>
              </optgroup>
              <optgroup label="Derived checks">
                <option value="rate_anomaly" ${state.filters.flag === 'rate_anomaly' ? 'selected' : ''}>rate_anomaly</option>
                <option value="script_mismatch" ${state.filters.flag === 'script_mismatch' ? 'selected' : ''}>script_mismatch</option>
                <option value="duplicate_transcript" ${state.filters.flag === 'duplicate_transcript' ? 'selected' : ''}>duplicate_transcript</option>
                <option value="high_cer" ${state.filters.flag === 'high_cer' ? 'selected' : ''}>high_cer (&gt; ${Math.round(state.settings.maxCer * 100)}%)</option>
              </optgroup>
            </select>
          </label>
        </div>

        <div class="fx-ranges">
          <div class="fx-range ${state.filters.minDur > 0 || state.filters.maxDur < 30 ? 'is-set' : ''}">
            <span class="fx-label">Duration</span>
            <div class="fx-range-box">
              <input type="number" step="0.5" min="0" max="30" id="flt-min-dur" value="${state.filters.minDur}" aria-label="Minimum duration in seconds" />
              <span class="fx-dash">–</span>
              <input type="number" step="0.5" min="0" max="30" id="flt-max-dur" value="${state.filters.maxDur}" aria-label="Maximum duration in seconds" />
              <span class="fx-unit">s</span>
            </div>
          </div>
          <div class="fx-range ${state.filters.minSnr > 0 || state.filters.maxSnr < 45 ? 'is-set' : ''}">
            <span class="fx-label">SNR</span>
            <div class="fx-range-box">
              <input type="number" step="1" min="0" max="45" id="flt-min-snr" value="${state.filters.minSnr}" aria-label="Minimum SNR in dB" />
              <span class="fx-dash">–</span>
              <input type="number" step="1" min="0" max="45" id="flt-max-snr" value="${state.filters.maxSnr}" aria-label="Maximum SNR in dB" />
              <span class="fx-unit">dB</span>
            </div>
          </div>
          <div class="fx-range ${state.filters.minCer > 0 || state.filters.maxCer < 120 ? 'is-set' : ''}">
            <span class="fx-label">CER</span>
            <div class="fx-range-box">
              <input type="number" step="1" min="0" max="120" id="flt-min-cer" value="${state.filters.minCer}" aria-label="Minimum CER in percent" />
              <span class="fx-dash">–</span>
              <input type="number" step="1" min="0" max="120" id="flt-max-cer" value="${state.filters.maxCer}" aria-label="Maximum CER in percent" />
              <span class="fx-unit">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 2: CLIP SELECTION TABLE -->
    <div class="sarvam-doc-section" data-sub-id="clip_table">
      <!-- Batch Selection Action Bar -->
      ${
        selectedCount > 0
          ? `
        <div class="batch-selection-bar">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="role-pill role-reviewer">${selectedCount} CLIPS SELECTED</span>
            <span style="font-size:0.8rem;">Send custom slice to Listening Workbench or assign to a team member:</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button type="button" class="emplo-login-btn" style="padding:7px 14px; min-width:auto; font-size:0.76rem;" id="review-selected-btn">
              ▶ Review Selected (${selectedCount}) in Workbench
            </button>
            <select id="batch-assign-select" style="padding:6px 10px; border-radius:8px; font-size:0.76rem; background:#1e293b; color:#fff; border:1px solid #475569;">
              <option value="">Assign ${selectedCount} clips to…</option>
              ${state.users.filter((u) => u.role === 'annotator').map((u) => `<option value="${u.id}">${u.name} (${u.id})</option>`).join('')}
            </select>
            <button type="button" class="ws-utility-btn" id="clear-selection-btn" style="background:#1e293b; color:#fff; border-color:#475569;">Clear Selection</button>
          </div>
        </div>
      `
          : ''
      }

      <div class="panel-card" style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span style="font-size:0.86rem; font-weight:700;">
              Showing ${state.virtual50kMode ? '50,000 (Virtualized Window)' : `${pageSlice.length} of ${filtered.length}`} clips
            </span>
            <button type="button" class="ws-utility-btn" id="open-filter-studio-sub-btn">Edit filters ↑</button>
            <button type="button" class="ws-utility-btn" id="select-all-filtered-btn">☑ Select All ${filtered.length} Filtered</button>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <button type="button" class="ws-utility-btn ${state.virtual50kMode ? 'active' : ''}" id="toggle-50k-btn" style="${state.virtual50kMode ? 'background:#18181B; color:#fff;' : ''}">
              ⚡ ${state.virtual50kMode ? '50,000-Row Virtual Scroll Active' : 'Simulate 50,000-Row Scale'}
            </button>
            <label style="font-size:0.74rem; color:var(--text-muted);">Rows/Page:</label>
            <select id="exp-page-size" style="padding:4px 8px; border-radius:7px; border:1px solid var(--border-strong); background:var(--bg-subtle); color:var(--text-dark); font-size:0.75rem;">
              <option value="25" ${state.pageSize === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100</option>
            </select>
          </div>
        </div>

        <div class="data-table-wrap explorer-no-scroll-wrap ${state.virtual50kMode ? 'virtual-scroll-viewport' : ''}" id="explorer-table-viewport">
          <table class="atlas-table explorer-fixed-table">
            <thead>
              <tr>
                <th style="width:34px; text-align:center;"><input type="checkbox" id="master-select-cb" ${filtered.length > 0 && filtered.every((c) => state.selectedClipIds.has(c.id)) ? 'checked' : ''} /></th>
                <th style="width:42px;">Play</th>
                <th style="width:128px;" class="sortable-th" data-sort="id">Clip / Source${sortArrow('id')}</th>
                <th style="width:105px;" class="sortable-th" data-sort="speaker_id">Speaker / Ann${sortArrow('speaker_id')}</th>
                <th style="width:74px;" class="sortable-th" data-sort="duration_s">Dur / Rate${sortArrow('duration_s')}</th>
                <th style="width:72px;" class="sortable-th" data-sort="snr_db">SNR${sortArrow('snr_db')}</th>
                <th style="width:68px;" class="sortable-th" data-sort="cer">CER${sortArrow('cer')}</th>
                <th>Human Transcript</th>
                <th style="width:140px;">Flags &amp; Checks</th>
                <th style="width:86px;" class="sortable-th" data-sort="effective_verdict">Verdict${sortArrow('effective_verdict')}</th>
                <th style="width:94px; text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody id="explorer-tbody">${pageSlice.map(renderClipRowHtml).join('')}</tbody>
          </table>
        </div>

        ${
          !state.virtual50kMode
            ? `
          <div class="explorer-footer-bar">
            <span>Page <strong>${state.currentPage}</strong> of <strong>${totalPages}</strong> (${filtered.length} matching clips)</span>
            <div style="display:flex; gap:6px;">
              <button type="button" class="ws-utility-btn" id="page-prev-btn" ${state.currentPage <= 1 ? 'disabled' : ''}>← Prev Page</button>
              <button type="button" class="ws-utility-btn" id="page-next-btn" ${state.currentPage >= totalPages ? 'disabled' : ''}>Next Page →</button>
            </div>
          </div>
        `
            : `
          <div class="explorer-footer-bar">
            <span>⚡ <strong>Virtual Viewport Engine Active:</strong> Scroll the table above to stream 50,000 rows at 60 FPS with constant DOM node count.</span>
          </div>
        `
        }
      </div>
    </div>

    <!-- SUBSECTION 3: SPEAKER & RECORDING SOURCE BREAKDOWN -->
    <div class="sarvam-doc-section" data-sub-id="speaker_summary">
      <div class="panel-card" style="margin-bottom:0;">
        <div class="panel-header">
          <div>
            <div class="panel-title">Speaker &amp; Recording Source Breakdown (${speakerGroups.length} Speakers in Current Slice)</div>
            <div class="panel-subtitle">Click any Speaker ID to open their full Speaker Profile modal, or filter the Clip Selection Table to that speaker.</div>
          </div>
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table clean-issue-table">
            <thead>
              <tr>
                <th>Speaker ID</th>
                <th>Languages</th>
                <th>Recording Sources</th>
                <th>Clips</th>
                <th>Mean SNR</th>
                <th>Quality Status</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>${speakerSummaryRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Virtual 50k scroll handler
  if (state.virtual50kMode) {
    const vp = document.getElementById('explorer-table-viewport');
    const tbody = document.getElementById('explorer-tbody');
    if (vp && tbody) {
      vp.addEventListener('scroll', () => {
        const startIdx = Math.min(49960, Math.floor((vp.scrollTop / 1200) * 1000));
        const slice = activeDataset.slice(startIdx, startIdx + 40);
        tbody.innerHTML = slice.map(renderClipRowHtml).join('');
        bindExplorerRowInteractions(container, filtered);
      });
    }
  }

  // Bind Filter Controls
  const bindFilter = (id, key, isNum = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      state.filters[key] = isNum ? parseFloat(e.target.value) || 0 : e.target.value;
      state.currentPage = 1;
      syncUrlFilters();
      renderGlobalFilterBreadcrumb();
      renderScreenExplorer(container);
    });
  };
  bindFilter('flt-lang', 'language');
  bindFilter('flt-source', 'source');
  bindFilter('flt-speaker', 'speaker');
  bindFilter('flt-annotator', 'annotator');
  bindFilter('flt-verdict', 'verdict');
  bindFilter('flt-flag', 'flag');
  bindFilter('flt-min-dur', 'minDur', true);
  bindFilter('flt-max-dur', 'maxDur', true);
  bindFilter('flt-min-snr', 'minSnr', true);
  bindFilter('flt-max-snr', 'maxSnr', true);
  bindFilter('flt-min-cer', 'minCer', true);
  bindFilter('flt-max-cer', 'maxCer', true);

  const searchEl = document.getElementById('flt-search');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      state.currentPage = 1;
      syncUrlFilters();
      renderGlobalFilterBreadcrumb();
      renderScreenExplorer(container);
      const nextInput = document.getElementById('flt-search');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });
  }

  // Column Sorting
  container.querySelectorAll('.sortable-th').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (state.sortField === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else {
        state.sortField = col;
        state.sortDir = 'asc';
      }
      syncUrlFilters();
      renderScreenExplorer(container);
    });
  });

  // Page Size & Pagination
  const pageSizeEl = document.getElementById('exp-page-size');
  if (pageSizeEl) {
    pageSizeEl.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.currentPage = 1;
      renderScreenExplorer(container);
    });
  }
  const prevBtn = document.getElementById('page-prev-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderScreenExplorer(container);
      }
    });
  }
  const nextBtn = document.getElementById('page-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderScreenExplorer(container);
      }
    });
  }

  const toggle50kBtn = document.getElementById('toggle-50k-btn');
  if (toggle50kBtn) {
    toggle50kBtn.addEventListener('click', () => {
      state.virtual50kMode = !state.virtual50kMode;
      renderScreenExplorer(container);
    });
  }

  // Share URL & Reset
  document.getElementById('exp-copy-url-btn').addEventListener('click', copyShareableUrl);
  document.getElementById('exp-reset-btn').addEventListener('click', () => {
    resetFilters();
    syncUrlFilters();
    renderGlobalFilterBreadcrumb();
    renderScreenExplorer(container);
  });

  // Master select & Select All Filtered
  const masterCb = document.getElementById('master-select-cb');
  if (masterCb) {
    masterCb.addEventListener('change', (e) => {
      filtered.forEach((c) => {
        if (e.target.checked) state.selectedClipIds.add(c.id);
        else state.selectedClipIds.delete(c.id);
      });
      renderScreenExplorer(container);
    });
  }

  const selectAllBtn = document.getElementById('select-all-filtered-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      filtered.forEach((c) => state.selectedClipIds.add(c.id));
      renderScreenExplorer(container);
    });
  }

  const reviewSelectedBtn = document.getElementById('review-selected-btn');
  if (reviewSelectedBtn) {
    reviewSelectedBtn.addEventListener('click', () => {
      state.workbenchQueue = Array.from(state.selectedClipIds);
      state.workbenchIndex = 0;
      navigateToScreen('workbench');
    });
  }

  const clearSelBtn = document.getElementById('clear-selection-btn');
  if (clearSelBtn) {
    clearSelBtn.addEventListener('click', () => {
      state.selectedClipIds.clear();
      renderScreenExplorer(container);
    });
  }

  const batchAssignSel = document.getElementById('batch-assign-select');
  if (batchAssignSel) {
    batchAssignSel.addEventListener('change', (e) => {
      const targetAnn = e.target.value;
      if (!targetAnn) return;
      state.selectedClipIds.forEach((id) => {
        state.assignmentsMap[id] = targetAnn;
      });
      savePersistedStorage();
      recomputeEnrichedClips();
      showToast(`Assigned ${state.selectedClipIds.size} clips to ${targetAnn}!`);
      state.selectedClipIds.clear();
      renderScreenExplorer(container);
    });
  }

  const sendQueueBtn = document.getElementById('send-filtered-queue-btn');
  if (sendQueueBtn) {
    sendQueueBtn.addEventListener('click', () => {
      state.workbenchQueue = filtered.map((c) => c.id);
      state.workbenchIndex = 0;
      navigateToScreen('workbench');
    });
  }

  const openTableSubBtn = document.getElementById('open-clip-table-sub-btn');
  if (openTableSubBtn) {
    openTableSubBtn.addEventListener('click', () => {
      document.querySelector('[data-sub-id="clip_table"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const openFilterStudioBtn = document.getElementById('open-filter-studio-sub-btn');
  if (openFilterStudioBtn) {
    openFilterStudioBtn.addEventListener('click', () => {
      document.querySelector('[data-sub-id="filter_studio"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  container.querySelectorAll('[data-filter-spk-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filters.speaker = btn.getAttribute('data-filter-spk-jump');
      state.currentPage = 1;
      state.activeSubsections.explorer = 'all';
      syncUrlFilters();
      renderGlobalFilterBreadcrumb();
      renderScreenExplorer(container);
    });
  });

  bindExplorerRowInteractions(container, filtered);
  renderSarvamDocsNavigation();
}

function bindExplorerRowInteractions(container, filtered) {
  container.querySelectorAll('.row-select-cb').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = cb.dataset.selectId;
      if (e.target.checked) state.selectedClipIds.add(id);
      else state.selectedClipIds.delete(id);
      renderScreenExplorer(container);
    });
  });

  container.querySelectorAll('[data-play-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.playUrl;
      if (inlineRowAudio && !inlineRowAudio.paused && inlinePlayingUrl === url) {
        inlineRowAudio.pause();
        inlinePlayingUrl = null;
        btn.textContent = '▶';
        btn.classList.remove('playing');
        return;
      }
      if (inlineRowAudio) inlineRowAudio.pause();
      document.querySelectorAll('.inline-play-btn').forEach((b) => {
        b.textContent = '▶';
        b.classList.remove('playing');
      });
      inlineRowAudio = new Audio(url);
      inlinePlayingUrl = url;
      btn.textContent = '⏸';
      btn.classList.add('playing');
      inlineRowAudio.play();
      inlineRowAudio.onended = () => {
        btn.textContent = '▶';
        btn.classList.remove('playing');
        inlinePlayingUrl = null;
      };
    });
  });

  container.querySelectorAll('[data-open-wb]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const clipId = btn.dataset.openWb;
      state.workbenchQueue = filtered.map((c) => c.id);
      state.workbenchIndex = Math.max(0, state.workbenchQueue.indexOf(clipId));
      navigateToScreen('workbench');
    });
  });

  container.querySelectorAll('[data-speaker-id]').forEach((btn) => {
    btn.addEventListener('click', () => openSpeakerProfileModal(btn.dataset.speakerId));
  });
}

// ----------------------------------------------------------------------------
// 7. SCREEN 3: LISTENING WORKBENCH (WAVEFORM, SPECTROGRAM, LOOP, 3-WAY DIFF)
// ----------------------------------------------------------------------------
let wbAudioEl = null;

function computeWordDiffHtml(humanStr, asrStr) {
  const hWords = (humanStr || '').trim().split(/\s+/).filter(Boolean);
  const aWords = (asrStr || '').trim().split(/\s+/).filter(Boolean);

  if (hWords.length === 0) {
    return {
      humanHtml: '<em style="color:#dc2626; font-weight:700;">[Empty Human Transcript — Use Fix Verdict]</em>',
      asrHtml: aWords.map((w) => `<span class="diff-ins">${w}</span>`).join(' ') || '<em>[No ASR]</em>',
      stats: { match: 0, sub: 0, del: 0, ins: aWords.length }
    };
  }
  if (aWords.length === 0) {
    return {
      humanHtml: hWords.join(' '),
      asrHtml: '<em style="color:#94a3b8;">[ASR Hypothesis Null]</em>',
      stats: { match: 0, sub: 0, del: hWords.length, ins: 0 }
    };
  }

  // Edit distance DP supporting Match, Substitution, Insertion, Deletion
  const m = hWords.length;
  const n = aWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  const normW = (w) => w.replace(/[\p{P}]/gu, '').toLowerCase();

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normW(hWords[i - 1]) === normW(aWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const humanOut = [];
  const asrOut = [];
  const stats = { match: 0, sub: 0, del: 0, ins: 0 };

  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normW(hWords[i - 1]) === normW(aWords[j - 1])) {
      humanOut.unshift(hWords[i - 1]);
      asrOut.unshift(aWords[j - 1]);
      stats.match++;
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      humanOut.unshift(`<span class="diff-sub" title="Substitution (ASR: ${aWords[j - 1]})">${hWords[i - 1]}</span>`);
      asrOut.unshift(`<span class="diff-sub" title="Substitution (Human: ${hWords[i - 1]})">${aWords[j - 1]}</span>`);
      stats.sub++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      asrOut.unshift(`<span class="diff-ins" title="Insertion in ASR">${aWords[j - 1]}</span>`);
      stats.ins++;
      j--;
    } else {
      humanOut.unshift(`<span class="diff-del" title="Deletion (Missing in ASR)">${hWords[i - 1]}</span>`);
      stats.del++;
      i--;
    }
  }

  return {
    humanHtml: humanOut.join(' '),
    asrHtml: asrOut.join(' '),
    stats
  };
}

async function drawClipVisualizer(clip, canvasEl, playheadRatio = 0) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  const w = (canvasEl.width = canvasEl.clientWidth || 720);
  const h = (canvasEl.height = 68);

  let peaks = clip._cachedPeaks;
  if (!peaks) {
    if (clip.peaks_url) {
      try {
        const res = await fetch(clip.peaks_url);
        const data = await res.json();
        peaks = data.peaks;
      } catch (e) {}
    }
    if (!peaks) {
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const res = await fetch(clip.audio_url);
        const buf = await res.arrayBuffer();
        const audioBuf = await actx.decodeAudioData(buf);
        const ch = audioBuf.getChannelData(0);
        const step = Math.max(1, Math.floor(ch.length / 200));
        peaks = [];
        for (let i = 0; i < ch.length; i += step) {
          let max = 0;
          for (let j = i; j < i + step && j < ch.length; j++) {
            const a = Math.abs(ch[j]);
            if (a > max) max = a;
          }
          peaks.push(max);
        }
      } catch (e) {
        peaks = Array.from({ length: 140 }, (_, idx) => 0.2 + 0.5 * Math.abs(Math.sin(idx * 0.2)));
      }
    }
    clip._cachedPeaks = peaks;
  }

  ctx.clearRect(0, 0, w, h);

  if (state.wbViewMode === 'spectrogram') {
    const cols = Math.min(peaks.length, 160);
    const bands = 20;
    const cellW = w / cols;
    const cellH = h / bands;
    const noiseFloor = clip.snr_db !== null && clip.snr_db < 15 ? 0.32 : 0.08;

    for (let c = 0; c < cols; c++) {
      const p = peaks[Math.floor((c / cols) * peaks.length)] || 0.05;
      for (let b = 0; b < bands; b++) {
        const freqNorm = 1 - b / bands;
        const harmonic = Math.sin(c * 0.4 + b * 0.55) * 0.25 + 0.75;
        const energy = Math.min(1, p * (1.15 - freqNorm * 0.65) * harmonic + noiseFloor * (0.5 + 0.5 * Math.sin(c * b)));
        const hue = 215 - energy * 175;
        const light = 92 - energy * 48;
        ctx.fillStyle = `hsl(${hue}, 82%, ${light}%)`;
        ctx.fillRect(c * cellW, b * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  } else {
    // Voice-Note Bubble Waveform (White background, sky-blue played bars, light-gray unplayed bars)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const midY = h / 2;
    const barCount = 54;
    const step = peaks.length / barCount;
    const padX = 6;
    const usableW = w - padX * 2;
    const slotW = usableW / barCount;
    const pillW = Math.max(2.6, Math.min(4.2, slotW * 0.36));

    for (let i = 0; i < barCount; i++) {
      const p = peaks[Math.floor(i * step)] || 0.08;
      const barH = Math.max(8, Math.min(h * 0.84, (0.14 + p * 0.86) * (h * 0.84)));
      const x = padX + i * slotW + (slotW - pillW) / 2;
      const y = midY - barH / 2;
      const normX = i / Math.max(1, barCount - 1);
      const isPlayed = normX <= playheadRatio;

      ctx.save();
      ctx.fillStyle = isPlayed ? '#D4A055' : '#E4E4E7';

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, pillW, barH, pillW / 2);
      } else {
        ctx.rect(x, y, pillW, barH);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw Loop Region Overlay if enabled
  if (state.wbLoopEnabled) {
    const lx1 = state.wbLoopStart * w;
    const lx2 = state.wbLoopEnd * w;
    ctx.fillStyle = 'rgba(212, 160, 85, 0.16)';
    ctx.fillRect(lx1, 0, lx2 - lx1, h);
    ctx.fillStyle = '#18181B';
    ctx.fillRect(lx1, 0, 2, h);
    ctx.fillRect(lx2 - 2, 0, 2, h);
    ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
    ctx.fillText('LOOP', lx1 + 5, 12);
  }
}

function renderScreenWorkbench(container) {
  const queueIds = getWorkbenchQueueIds();
  if (state.workbenchIndex >= queueIds.length) state.workbenchIndex = 0;
  const clipId = queueIds[state.workbenchIndex] || queueIds[0];
  const clip = clipId ? state.enrichedClips.find((c) => c.id === clipId) : null;
  if (!clip) {
    container.innerHTML = `
      <div class="panel-card" style="text-align:center; padding:56px 24px; max-width:560px; margin:24px auto;">
        <div class="panel-title" style="justify-content:center; margin-bottom:8px;">Your review queue is empty</div>
        <p style="color:var(--text-muted); margin-bottom:18px;">There are no clips in this queue that you are allowed to review. Pick clips in the explorer and send them here.</p>
        <button type="button" class="emplo-login-btn" id="wb-empty-explorer-btn">Open Clip Explorer</button>
      </div>`;
    document.getElementById('wb-empty-explorer-btn').addEventListener('click', () => navigateToScreen('explorer'));
    renderSarvamDocsNavigation();
    return;
  }

  const diff = computeWordDiffHtml(clip.transcript, clip.asr_hypothesis);
  const gold = clip.gold_entry;

  const queueStripHtml = queueIds
    .slice(Math.max(0, state.workbenchIndex - 4), Math.min(queueIds.length, state.workbenchIndex + 9))
    .map((id) => {
      const idx = queueIds.indexOf(id);
      const item = state.enrichedClips.find((c) => c.id === id);
      const vCls = item && item.effective_verdict ? `v-${item.effective_verdict}` : 'v-none';
      return `<button type="button" class="wb-queue-pill ${id === clip.id ? 'active' : ''}" data-jump-idx="${idx}"><i class="wb2-qdot ${vCls}"></i>${id}</button>`;
    })
    .join('');

  const verdictLabel = clip.effective_verdict ? clip.effective_verdict.toUpperCase() : 'Pending';
  const snrBad = clip.snr_db !== null && clip.snr_db < state.settings.minSnrDb;
  const cerBad = clip.cer !== null && clip.cer > state.settings.maxCer;
  const metricRows = [
    ['Duration', `${clip.duration_s}s`, false],
    ['SNR', clip.snr_db !== null ? `${clip.snr_db} dB` : '—', snrBad],
    ['CER', clip.cer !== null ? `${(clip.cer * 100).toFixed(1)}%` : '—', cerBad],
    ['Clipping', `${clip.clipping_pct}%`, clip.clipping_pct > 1],
    ['Silence', clip.silence_ratio !== null ? `${Math.round(clip.silence_ratio * 100)}%` : '—', false],
    ['Speaking rate', `${clip.cps} chars/s`, clip.derived_flags.includes('rate_anomaly')],
    ['Annotator', `${clip.annotator_id || 'Unassigned'}${clip.review_seconds ? ` · ${clip.review_seconds}s` : ''}`, false],
    ['Recorded', clip.recorded_at || '—', false]
  ];

  container.innerHTML = `
    <div class="wb2-topbar">
      <div class="wb2-clip-id">
        <span class="wb2-clip-name">${clip.id}</span>
        <span class="wb2-meta">${LANG_NAMES[clip.language]}</span>
        <span class="wb2-sep">·</span>
        <span class="wb2-meta">${clip.source}</span>
        <span class="wb2-sep">·</span>
        <button type="button" class="speaker-link-btn wb2-speaker" id="wb-speaker-btn">${clip.speaker_id} (${clip.gender || 'unknown'})</button>
      </div>
      <div class="wb2-nav">
        <span class="wb2-pos"><strong>${state.workbenchIndex + 1}</strong> / ${queueIds.length}</span>
        <button type="button" class="wb-btn" id="wb-prev-btn" title="Previous clip [J]">← Prev</button>
        <button type="button" class="wb-btn" id="wb-next-btn" title="Next clip [N]">Next →</button>
        <button type="button" class="wb-btn wb2-icon-btn" id="wb-help-btn" title="Keyboard shortcuts [?]" aria-label="Show keyboard shortcuts">?</button>
      </div>
    </div>

    <div class="wb-queue-strip wb2-queue">${queueStripHtml}</div>

    <div class="workbench-layout wb2-layout">
      <div class="wb2-main">
        <section class="panel-card wb2-card">
          <div class="wb2-card-head">
            <div class="panel-title">Audio</div>
            <span class="wb2-hint">${clip.peaks_url ? 'Precomputed peaks' : 'Decoded in browser'} · drag on the wave to loop a region</span>
          </div>
          <div class="voice-note-bubble wb2-player">
            <button type="button" class="voice-note-play-circle" id="wb-play-btn" title="Play / Pause [Space]" aria-label="Play or pause">▶</button>
            <div class="voice-note-wave-col">
              <div class="wb-canvas-wrap">
                <canvas id="wb-wave-canvas" class="wb-canvas" role="img" aria-label="Waveform of ${clip.id}. Click to seek, drag to loop a region." title="Click to seek • Drag horizontally to select a Loop Region"></canvas>
              </div>
              <div class="voice-note-timestamps">
                <span id="wb-time-readout">00:00</span>
                <span>${clip.duration_s}s</span>
              </div>
            </div>
          </div>
          <div class="wb-controls-row wb2-controls">
            <div class="wb2-control-group">
              <button type="button" class="wb-btn" id="wb-back2-btn" title="Back 2 seconds [←]">−2s</button>
              <button type="button" class="wb-btn" id="wb-fwd2-btn" title="Forward 2 seconds [→]">+2s</button>
              <select id="wb-speed-select" class="wb-btn" aria-label="Playback speed" title="Playback speed ( [ and ] )">
                ${WB_SPEEDS.map((sp) => `<option value="${sp}" ${(state.wbSpeed || 1) === sp ? 'selected' : ''}>${sp}×</option>`).join('')}
              </select>
            </div>
            <div class="wb2-control-group">
              <button type="button" class="wb-btn ${state.wbLoopEnabled ? 'active' : ''}" id="wb-loop-btn" title="Loop selected region [L]">
                Loop ${state.wbLoopEnabled ? `(${Math.round(state.wbLoopStart * 100)}%–${Math.round(state.wbLoopEnd * 100)}%)` : 'off'}
              </button>
              <button type="button" class="wb-btn ${state.wbViewMode === 'spectrogram' ? 'active' : ''}" id="wb-spec-btn" title="Toggle Waveform / Spectrogram [S]">
                ${state.wbViewMode === 'spectrogram' ? 'Spectrogram' : 'Waveform'}
              </button>
            </div>
          </div>
        </section>

        <section class="panel-card wb2-card">
          <div class="wb2-card-head">
            <div class="panel-title">Transcript vs. ASR</div>
            <div class="wb2-diff-stats">
              <span class="wb2-stat"><i class="wb2-dot" style="background:var(--text-muted);"></i>${diff.stats.match} matched</span>
              <span class="wb2-stat"><i class="wb2-dot" style="background:#D4A055;"></i>${diff.stats.sub} substituted</span>
              <span class="wb2-stat"><i class="wb2-dot" style="background:#D9534F;"></i>${diff.stats.del} deleted</span>
              <span class="wb2-stat"><i class="wb2-dot" style="background:#2F9E6A;"></i>${diff.stats.ins} inserted</span>
            </div>
          </div>
          <div class="diff-grid wb2-diff">
            <div class="diff-box">
              <div class="wb2-diff-label"><span>Human transcript</span><span>${clip.transcript.length} chars</span></div>
              <div>${diff.humanHtml}</div>
            </div>
            <div class="diff-box">
              <div class="wb2-diff-label"><span>ASR hypothesis</span><span>CER ${clip.cer !== null ? `${(clip.cer * 100).toFixed(1)}%` : '—'}</span></div>
              <div>${diff.asrHtml}</div>
            </div>
          </div>
        </section>

        <section class="panel-card wb2-card">
          <div class="wb2-card-head">
            <div class="panel-title">Clip details</div>
            ${
              gold && state.currentUser && state.currentUser.role !== 'annotator'
                ? `<span class="wb2-hint">Gold verdict: <strong style="color:var(--text-dark);">${gold.expert_verdict.toUpperCase()}</strong>${gold.expert_tags.length ? ` · ${gold.expert_tags.join(', ')}` : ''}</span>`
                : ''
            }
          </div>
          <div class="wb2-metrics">
            ${metricRows
              .map(
                ([k, v, bad]) => `
              <div class="wb2-metric">
                <span class="wb2-metric-k">${k}</span>
                <span class="wb2-metric-v ${bad ? 'is-bad' : ''}">${v}</span>
              </div>`
              )
              .join('')}
          </div>
          <div class="wb2-checks">
            <span class="wb2-metric-k">Checks</span>
            ${
              clip.all_flags.length
                ? clip.all_flags.map((f) => `<span class="issue-tag-name">${f}</span>`).join('')
                : '<span class="status-chip chip-good">All checks passed</span>'
            }
          </div>
        </section>
      </div>

      <aside class="wb2-side">
        <section class="panel-card wb2-card wb2-verdict-card">
          <div class="wb2-card-head">
            <div class="panel-title">Verdict</div>
            <span class="wb2-hint">Current: <strong style="color:var(--text-dark);">${verdictLabel}</strong></span>
          </div>

          <div class="verdict-btn-group">
            <button type="button" class="verdict-btn v-keep ${clip.effective_verdict === 'keep' ? 'active' : ''}" data-verdict="keep">Keep <kbd>K</kbd></button>
            <button type="button" class="verdict-btn v-fix ${clip.effective_verdict === 'fix' ? 'active' : ''}" data-verdict="fix">Fix <kbd>F</kbd></button>
            <button type="button" class="verdict-btn v-drop ${clip.effective_verdict === 'drop' ? 'active' : ''}" data-verdict="drop">Drop <kbd>D</kbd></button>
          </div>

          <div id="fix-transcript-wrap" class="${clip.effective_verdict === 'fix' ? '' : 'hidden'}" style="margin-bottom:14px;">
            <div class="wb2-field-head">
              <label class="wb2-label" for="wb-transcript-editor">Corrected transcript</label>
              ${
                clip.asr_hypothesis
                  ? `<button type="button" class="ws-utility-btn wb2-mini-btn" id="copy-asr-to-tr-btn">Copy ASR</button>`
                  : ''
              }
            </div>
            <textarea id="wb-transcript-editor" class="wb2-input" rows="3">${clip.transcript}</textarea>
          </div>

          <label class="wb2-label">Issue tags <span class="wb2-label-hint">keys 1–6</span></label>
          <div class="tag-toggle-grid">
            ${ISSUE_TAGS.map(
              (tag, i) => `
              <button type="button" class="tag-toggle-btn ${clip.effective_tags.includes(tag) ? 'active' : ''}" data-tag="${tag}">
                <kbd>${i + 1}</kbd> ${tag.replace(/_/g, ' ')}
              </button>`
            ).join('')}
          </div>

          <label class="wb2-label" for="wb-note-input">Note</label>
          <input type="text" id="wb-note-input" class="wb2-input" value="${(clip.note || '').replace(/"/g, '&quot;')}" placeholder="Optional note or timestamp…" style="margin-bottom:14px;" />

          <button type="button" class="emplo-login-btn" style="width:100%; min-width:0;" id="wb-save-next-btn">
            Save &amp; next clip <kbd class="wb2-kbd-dark">Enter</kbd>
          </button>
        </section>
      </aside>
    </div>
  `;

  const waveCanvas = document.getElementById('wb-wave-canvas');
  drawClipVisualizer(clip, waveCanvas, 0);

  if (wbAudioEl) wbAudioEl.pause();
  wbAudioEl = new Audio(clip.audio_url);
  wbAudioEl.playbackRate = state.wbSpeed || 1;

  const playBtnEl = document.getElementById('wb-play-btn');
  wbAudioEl.addEventListener('play', () => {
    if (playBtnEl) playBtnEl.textContent = '❚❚';
  });
  wbAudioEl.addEventListener('pause', () => {
    if (playBtnEl) playBtnEl.textContent = '▶';
  });
  wbAudioEl.addEventListener('ended', () => {
    if (playBtnEl) playBtnEl.textContent = '▶';
  });

  wbAudioEl.addEventListener('timeupdate', () => {
    if (!wbAudioEl.duration) return;
    if (state.wbLoopEnabled) {
      const loopStartSec = state.wbLoopStart * wbAudioEl.duration;
      const loopEndSec = state.wbLoopEnd * wbAudioEl.duration;
      if (wbAudioEl.currentTime >= loopEndSec) {
        wbAudioEl.currentTime = loopStartSec;
      }
    }
    const ratio = wbAudioEl.currentTime / wbAudioEl.duration;
    const readout = document.getElementById('wb-time-readout');
    if (readout) {
      const curSec = Math.floor(wbAudioEl.currentTime);
      const mins = String(Math.floor(curSec / 60)).padStart(2, '0');
      const secs = String(curSec % 60).padStart(2, '0');
      readout.textContent = `${mins}:${secs}`;
    }
    drawClipVisualizer(clip, waveCanvas, ratio);
  });

  // Click to seek OR drag to create a Loop Region
  if (waveCanvas) {
    let isDraggingLoop = false;
    let dragStartRatio = 0;

    waveCanvas.addEventListener('mousedown', (e) => {
      const rect = waveCanvas.getBoundingClientRect();
      dragStartRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      isDraggingLoop = true;
    });

    waveCanvas.addEventListener('mousemove', (e) => {
      if (!isDraggingLoop) return;
      const rect = waveCanvas.getBoundingClientRect();
      const curRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (Math.abs(curRatio - dragStartRatio) > 0.03) {
        state.wbLoopEnabled = true;
        state.wbLoopStart = Math.min(dragStartRatio, curRatio);
        state.wbLoopEnd = Math.max(dragStartRatio, curRatio);
        const ratio = wbAudioEl.duration ? wbAudioEl.currentTime / wbAudioEl.duration : 0;
        drawClipVisualizer(clip, waveCanvas, ratio);
      }
    });

    window.addEventListener(
      'mouseup',
      (e) => {
        if (!isDraggingLoop) return;
        isDraggingLoop = false;
        const rect = waveCanvas.getBoundingClientRect();
        const endRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (Math.abs(endRatio - dragStartRatio) <= 0.03) {
          if (wbAudioEl.duration) wbAudioEl.currentTime = endRatio * wbAudioEl.duration;
          drawClipVisualizer(clip, waveCanvas, endRatio);
        } else {
          const loopBtn = document.getElementById('wb-loop-btn');
          if (loopBtn) {
            loopBtn.classList.add('active');
            loopBtn.textContent = `Loop (${Math.round(state.wbLoopStart * 100)}%–${Math.round(state.wbLoopEnd * 100)}%)`;
          }
        }
      },
      { once: true }
    );
  }

  // Queue strip jump
  container.querySelectorAll('[data-jump-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.workbenchIndex = parseInt(btn.dataset.jumpIdx, 10);
      renderScreenWorkbench(container);
    });
  });

  document.getElementById('wb-speaker-btn').addEventListener('click', () => openSpeakerProfileModal(clip.speaker_id));

  document.getElementById('wb-play-btn').addEventListener('click', () => {
    if (wbAudioEl.paused) wbAudioEl.play();
    else wbAudioEl.pause();
  });
  document.getElementById('wb-back2-btn').addEventListener('click', () => {
    wbAudioEl.currentTime = Math.max(0, wbAudioEl.currentTime - 2);
  });
  document.getElementById('wb-fwd2-btn').addEventListener('click', () => {
    wbAudioEl.currentTime = Math.min(wbAudioEl.duration || 10, wbAudioEl.currentTime + 2);
  });
  document.getElementById('wb-speed-select').addEventListener('change', (e) => {
    state.wbSpeed = parseFloat(e.target.value);
    wbAudioEl.playbackRate = state.wbSpeed;
  });
  document.getElementById('wb-loop-btn').addEventListener('click', () => {
    state.wbLoopEnabled = !state.wbLoopEnabled;
    renderScreenWorkbench(container);
  });
  document.getElementById('wb-spec-btn').addEventListener('click', () => {
    state.wbViewMode = state.wbViewMode === 'waveform' ? 'spectrogram' : 'waveform';
    renderScreenWorkbench(container);
  });
  document.getElementById('wb-prev-btn').addEventListener('click', () => {
    state.workbenchIndex = (state.workbenchIndex - 1 + queueIds.length) % queueIds.length;
    renderScreenWorkbench(container);
  });
  document.getElementById('wb-next-btn').addEventListener('click', () => {
    state.workbenchIndex = (state.workbenchIndex + 1) % queueIds.length;
    renderScreenWorkbench(container);
  });
  document.getElementById('wb-help-btn').addEventListener('click', () => {
    document.getElementById('shortcuts-modal').classList.remove('hidden');
  });

  const copyAsrBtn = document.getElementById('copy-asr-to-tr-btn');
  if (copyAsrBtn) {
    copyAsrBtn.addEventListener('click', () => {
      const ed = document.getElementById('wb-transcript-editor');
      if (ed) ed.value = clip.asr_hypothesis || '';
    });
  }

  container.querySelectorAll('[data-verdict]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.verdict;
      const editedEl = document.getElementById('wb-transcript-editor');
      const noteEl = document.getElementById('wb-note-input');
      saveClipVerdict(clip, v, null, editedEl ? editedEl.value : clip.transcript, noteEl ? noteEl.value : clip.note);
      renderScreenWorkbench(container);
      if (v === 'fix') {
        const nextEd = document.getElementById('wb-transcript-editor');
        if (nextEd) nextEd.focus();
      }
    });
  });

  container.querySelectorAll('[data-tag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      const nextTags = clip.effective_tags.includes(tag)
        ? clip.effective_tags.filter((t) => t !== tag)
        : [...clip.effective_tags, tag];
      const editedEl = document.getElementById('wb-transcript-editor');
      const noteEl = document.getElementById('wb-note-input');
      saveClipVerdict(clip, clip.effective_verdict, nextTags, editedEl ? editedEl.value : clip.transcript, noteEl ? noteEl.value : clip.note);
      renderScreenWorkbench(container);
    });
  });

  document.getElementById('wb-save-next-btn').addEventListener('click', () => {
    if (!clip.effective_verdict) {
      showToast('Pick Keep (K), Fix (F) or Drop (D) before saving this clip.');
      return;
    }
    const editedEl = document.getElementById('wb-transcript-editor');
    const noteEl = document.getElementById('wb-note-input');
    saveClipVerdict(
      clip,
      clip.effective_verdict,
      clip.effective_tags,
      editedEl ? editedEl.value : clip.transcript,
      noteEl ? noteEl.value : ''
    );
    showToast(`Saved ${clip.effective_verdict.toUpperCase()} for ${clip.id}`);
    state.workbenchIndex = (state.workbenchIndex + 1) % queueIds.length;
    renderScreenWorkbench(container);
  });

  renderSarvamDocsNavigation();
}

function saveClipVerdict(clip, newVerdict, newTags, editedTranscript, note) {
  const oldVerdict = clip.effective_verdict;
  state.verdictOverrides[clip.id] = {
    verdict: newVerdict,
    tags: newTags !== null && newTags !== undefined ? newTags : clip.effective_tags,
    edited_transcript: editedTranscript !== undefined ? editedTranscript : clip.transcript,
    note: note !== undefined ? note : clip.note,
    updated_by: state.currentUser ? state.currentUser.id : 'adm_01',
    updated_at: new Date().toISOString()
  };

  if (newVerdict && newVerdict !== oldVerdict) state.activityLog.unshift({
    timestamp: new Date().toISOString(),
    user_id: state.currentUser ? state.currentUser.id : 'adm_01',
    user_name: state.currentUser ? state.currentUser.name : 'Admin',
    clip_id: clip.id,
    old_verdict: oldVerdict || 'unreviewed',
    new_verdict: newVerdict
  });

  savePersistedStorage();
  recomputeEnrichedClips();
}

function bindKeyboardShortcuts() {
  const closeBtn = document.getElementById('close-shortcuts-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('shortcuts-modal').classList.add('hidden');
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key === '?') {
      document.getElementById('shortcuts-modal').classList.toggle('hidden');
      return;
    }
    if (e.key === 'Escape') {
      document.getElementById('shortcuts-modal').classList.add('hidden');
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (state.activeScreen !== 'workbench') return;

    const container = document.getElementById('ws-main-container');
    const queueIds = getWorkbenchQueueIds();
    const clip = state.enrichedClips.find((c) => c.id === queueIds[state.workbenchIndex]);
    if (!clip) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (wbAudioEl) {
        if (wbAudioEl.paused) wbAudioEl.play();
        else wbAudioEl.pause();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (wbAudioEl) wbAudioEl.currentTime = Math.max(0, wbAudioEl.currentTime - 2);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (wbAudioEl) wbAudioEl.currentTime = Math.min(wbAudioEl.duration || 10, wbAudioEl.currentTime + 2);
    } else if (e.key === '[' || e.key === ']') {
      const cur = WB_SPEEDS.indexOf(state.wbSpeed || 1);
      const next = Math.max(0, Math.min(WB_SPEEDS.length - 1, (cur < 0 ? 1 : cur) + (e.key === ']' ? 1 : -1)));
      state.wbSpeed = WB_SPEEDS[next];
      if (wbAudioEl) wbAudioEl.playbackRate = state.wbSpeed;
      const sel = document.getElementById('wb-speed-select');
      if (sel) sel.value = String(state.wbSpeed);
      showToast(`Playback speed ${state.wbSpeed}×`);
    } else if (e.key.toLowerCase() === 'k') {
      const fields = wbCurrentFields(clip);
      saveClipVerdict(clip, 'keep', null, fields.transcript, fields.note);
      renderScreenWorkbench(container);
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const fields = wbCurrentFields(clip);
      saveClipVerdict(clip, 'fix', null, fields.transcript, fields.note);
      renderScreenWorkbench(container);
      const ed = document.getElementById('wb-transcript-editor');
      if (ed) ed.focus();
    } else if (e.key.toLowerCase() === 'd') {
      const fields = wbCurrentFields(clip);
      saveClipVerdict(clip, 'drop', null, fields.transcript, fields.note);
      renderScreenWorkbench(container);
    } else if (e.key.toLowerCase() === 'l') {
      state.wbLoopEnabled = !state.wbLoopEnabled;
      renderScreenWorkbench(container);
    } else if (e.key.toLowerCase() === 's') {
      state.wbViewMode = state.wbViewMode === 'waveform' ? 'spectrogram' : 'waveform';
      renderScreenWorkbench(container);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const saveBtn = document.getElementById('wb-save-next-btn');
      if (saveBtn) saveBtn.click();
    } else if (e.key.toLowerCase() === 'n') {
      state.workbenchIndex = (state.workbenchIndex + 1) % queueIds.length;
      renderScreenWorkbench(container);
    } else if (e.key.toLowerCase() === 'j') {
      state.workbenchIndex = (state.workbenchIndex - 1 + queueIds.length) % queueIds.length;
      renderScreenWorkbench(container);
    } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const tag = ISSUE_TAGS[idx];
      if (tag) {
        const nextTags = clip.effective_tags.includes(tag)
          ? clip.effective_tags.filter((t) => t !== tag)
          : [...clip.effective_tags, tag];
        const fields = wbCurrentFields(clip);
        saveClipVerdict(clip, clip.effective_verdict, nextTags, fields.transcript, fields.note);
        renderScreenWorkbench(container);
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 8. SCREEN 4: ADMIN CONSOLE (SCORECARD, SCATTER, DETAIL, GATE, MERGER)
// ----------------------------------------------------------------------------
function computeAnnotatorMetrics(ann) {
  const assigned = state.enrichedClips.filter((c) => c.annotator_id === ann.id);
  const reviewed = assigned.filter((c) => c.annotator_verdict !== null);
  const times = reviewed.map((c) => c.review_seconds || 0).filter((t) => t > 0).sort((a, b) => a - b);
  const medianTime = times.length ? times[Math.floor(times.length / 2)] : 0;

  const goldClips = reviewed.filter((c) => state.goldMap.has(c.id));
  const goldMatches = goldClips.filter((c) => c.annotator_verdict === state.goldMap.get(c.id).expert_verdict);
  const goldAcc = goldClips.length ? Math.round((goldMatches.length / goldClips.length) * 100) : 100;

  // Reviewer agreement: % of this annotator's verdicts that a reviewer/admin confirmed when re-judging in the app.
  // Re-judgements by annotators (incl. the annotator themselves) do not count. null = nothing re-judged yet.
  const judgeRoleOf = (uid) => (state.users.find((u) => u.id === uid) || {}).role;
  const rejudged = reviewed.filter((c) => {
    const ov = state.verdictOverrides[c.id];
    return ov && ov.verdict && ['reviewer', 'admin'].includes(judgeRoleOf(ov.updated_by));
  });
  const revAgreePct = rejudged.length
    ? Math.round((rejudged.filter((c) => c.annotator_verdict === state.verdictOverrides[c.id].verdict).length / rejudged.length) * 100)
    : null;
  const hasGold = goldClips.length > 0;

  // Weekly gold accuracy, grouped by the calendar week of reviewed_at
  const weekMap = new Map();
  goldClips.forEach((c) => {
    const key = weekStartKey(c.reviewed_at);
    if (!key) return;
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key).push(c);
  });
  const weekKeys = Array.from(weekMap.keys()).sort();
  const weeklyPts = weekKeys.map((k) => {
    const slice = weekMap.get(k);
    const m = slice.filter((c) => c.annotator_verdict === state.goldMap.get(c.id).expert_verdict).length;
    return Math.round((m / slice.length) * 100);
  });
  const weeklyLabels = weekKeys.map((k) => `${weekLabel(k)} (${weekMap.get(k).length})`);

  const keepCnt = reviewed.filter((c) => c.annotator_verdict === 'keep').length;
  const fixCnt = reviewed.filter((c) => c.annotator_verdict === 'fix').length;
  const dropCnt = reviewed.filter((c) => c.annotator_verdict === 'drop').length;

  let status = 'Good';
  let statusClass = 'chip-good';
  if ((hasGold && goldAcc < state.settings.actionGoldPct) || (times.length && medianTime < state.settings.minReviewSec)) {
    status = 'Action Needed';
    statusClass = 'chip-action';
  } else if (hasGold && goldAcc < state.settings.goldTargetPct) {
    status = 'Watch';
    statusClass = 'chip-watch';
  }

  // Disagreements with gold
  const disagreements = goldClips.filter((c) => c.annotator_verdict !== state.goldMap.get(c.id).expert_verdict);

  // Missed issue tags compared with gold
  const missedTagsCount = {};
  goldClips.forEach((c) => {
    const expTags = state.goldMap.get(c.id).expert_tags || [];
    const annTags = c.annotator_tags || [];
    expTags.forEach((t) => {
      if (!annTags.includes(t)) missedTagsCount[t] = (missedTagsCount[t] || 0) + 1;
    });
  });

  return {
    ann,
    assigned,
    reviewed,
    medianTime,
    goldClips,
    goldMatches,
    goldAcc,
    revAgreePct,
    rejudgedCount: rejudged.length,
    hasGold,
    weeklyPts,
    weeklyLabels,
    keepCnt,
    fixCnt,
    dropCnt,
    status,
    statusClass,
    disagreements,
    missedTagsCount
  };
}

function renderSparklineSvg(pts, color = '#18181B', labels = []) {
  if (!pts.length) return '<span style="color:var(--text-muted);">—</span>';
  const w = 76;
  const h = 24;
  const coords = pts
    .map((v, i) => {
      const x = 4 + (i / Math.max(1, pts.length - 1)) * (w - 8);
      const y = h - 4 - ((v - 20) / 80) * (h - 8);
      return `${x.toFixed(1)},${Math.max(3, Math.min(h - 3, y)).toFixed(1)}`;
    })
    .join(' ');

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline fill="none" stroke="${color}" stroke-width="2" points="${coords}" />
      ${pts
        .map((v, i) => {
          const x = 4 + (i / Math.max(1, pts.length - 1)) * (w - 8);
          const y = Math.max(3, Math.min(h - 3, h - 4 - ((v - 20) / 80) * (h - 8)));
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${color}" />`;
        })
        .join('')}
    </svg>
  `;
}

function renderScreenAdmin(container) {
  const annotators = state.users.filter((u) => u.role === 'annotator');
  const metricsList = annotators.map(computeAnnotatorMetrics);

  const selectedMetrics =
    metricsList.find((m) => m.ann.id === state.selectedAdminAnnotator) || metricsList[0];

  const scorecardRowsHtml = metricsList
    .map((m) => {
      const totalRev = Math.max(1, m.reviewed.length);
      const kPct = (m.keepCnt / totalRev) * 100;
      const fPct = (m.fixCnt / totalRev) * 100;
      const dPct = (m.dropCnt / totalRev) * 100;
      const isSelected = m.ann.id === selectedMetrics.ann.id;
      const sparkColor = m.status === 'Action Needed' ? '#D9534F' : m.status === 'Watch' ? '#D4A055' : '#2F9E6A';

      return `
        <tr class="${isSelected ? 'selected-table-row' : ''}" data-admin-ann="${m.ann.id}" style="cursor:pointer;" title="Click to inspect ${m.ann.name} in detail">
          <td>
            <strong>${m.ann.name}</strong> <span class="selected-user-id">(${m.ann.id})</span>
            <div style="font-size:0.68rem; color:var(--text-muted);">${m.ann.languages.map((l) => l.toUpperCase()).join(', ')}</div>
          </td>
          <td>${m.reviewed.length} / ${m.assigned.length}</td>
          <td><strong style="color:${m.medianTime && m.medianTime < state.settings.minReviewSec ? '#D9534F' : 'inherit'};">${m.medianTime ? `${m.medianTime.toFixed(1)}s` : '—'}</strong></td>
          <td>
            <div style="font-size:0.73rem; font-family:var(--font-mono);">${m.keepCnt}K / ${m.fixCnt}F / ${m.dropCnt}D</div>
            <div class="kfd-mini-bar">
              <div style="width:${kPct}%; background:#2F9E6A;"></div>
              <div style="width:${fPct}%; background:#D4A055;"></div>
              <div style="width:${dPct}%; background:#D9534F;"></div>
            </div>
          </td>
          <td>${m.hasGold ? `<strong>${m.goldAcc}%</strong> <span style="font-size:0.7rem; color:var(--text-muted);">(${m.goldMatches.length}/${m.goldClips.length})</span>` : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td title="${m.rejudgedCount ? `${m.rejudgedCount} of their clips re-judged by a reviewer or admin in this browser` : 'No reviewer or admin has re-judged their clips yet'}">${m.revAgreePct === null ? '<span style="color:var(--text-muted);">—</span>' : `<strong>${m.revAgreePct}%</strong> <span style="font-size:0.7rem; color:var(--text-muted);">(${m.rejudgedCount})</span>`}</td>
          <td title="${m.weeklyLabels.map((l, i) => `${l}: ${m.weeklyPts[i]}%`).join(' · ')}">${renderSparklineSvg(m.weeklyPts, sparkColor)}</td>
          <td><span class="status-chip ${m.statusClass}">${m.status}</span></td>
        </tr>
      `;
    })
    .join('');

  // Speed vs. Gold Accuracy — clean scatter + paired bar chart
  const sgTarget = state.settings.goldTargetPct;
  const sgFast = state.settings.minReviewSec;
  const sgSpeedMax = Math.max(10, Math.ceil(Math.max(...metricsList.map((m) => m.medianTime), 1) / 5) * 5);
  const sgW = 520;
  const sgH = 290;
  const sgPad = { l: 40, r: 18, t: 14, b: 38 };
  const sgPlotW = sgW - sgPad.l - sgPad.r;
  const sgPlotH = sgH - sgPad.t - sgPad.b;
  const sgX = (v) => sgPad.l + (Math.min(v, sgSpeedMax) / sgSpeedMax) * sgPlotW;
  const sgMinAcc = Math.min(...metricsList.map((m) => m.goldAcc), sgTarget);
  const sgYMin = Math.max(0, Math.floor((sgMinAcc - 8) / 20) * 20);
  const sgY = (v) => sgPad.t + (1 - (Math.max(sgYMin, Math.min(100, v)) - sgYMin) / (100 - sgYMin)) * sgPlotH;
  const sgPointColor = (m) => (m.status === 'Action Needed' ? '#D9534F' : m.status === 'Watch' ? '#D4A055' : '#2F9E6A');

  const sgYTicks = Array.from({ length: (100 - sgYMin) / 20 + 1 }, (_, i) => sgYMin + i * 20)
    .map(
      (v) => `
        <line x1="${sgPad.l}" x2="${sgW - sgPad.r}" y1="${sgY(v)}" y2="${sgY(v)}" class="sg-grid" />
        <text x="${sgPad.l - 8}" y="${sgY(v) + 3.5}" text-anchor="end" class="sg-tick">${v}%</text>`
    )
    .join('');
  const sgXTicks = Array.from({ length: sgSpeedMax / 5 + 1 }, (_, i) => i * 5)
    .map(
      (v) => `
        <line x1="${sgX(v)}" x2="${sgX(v)}" y1="${sgPad.t}" y2="${sgPad.t + sgPlotH}" class="sg-grid" />
        <text x="${sgX(v)}" y="${sgPad.t + sgPlotH + 16}" text-anchor="middle" class="sg-tick">${v}s</text>`
    )
    .join('');

  const sgInitials = (name) =>
    name
      .replace(/\./g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .join('')
      .slice(0, 2);

  const sgPoints = metricsList
    .map((m) => {
      const isSel = m.ann.id === selectedMetrics.ann.id;
      const cx = sgX(m.medianTime);
      const cy = sgY(m.goldAcc);
      return `
        <g class="sg-point ${isSel ? 'is-selected' : ''}" data-admin-ann="${m.ann.id}">
          <title>${m.ann.name}: ${m.goldAcc}% gold accuracy, ${m.medianTime.toFixed(1)}s median review</title>
          ${isSel ? `<circle cx="${cx}" cy="${cy}" r="13.5" class="sg-halo" />` : ''}
          <circle cx="${cx}" cy="${cy}" r="9.5" fill="${sgPointColor(m)}" class="sg-dot" />
          <text x="${cx}" y="${cy + 3.2}" text-anchor="middle" class="sg-initials">${sgInitials(m.ann.name)}</text>
        </g>`;
    })
    .join('');

  const sgScatterSvg = `
    <svg viewBox="0 0 ${sgW} ${sgH}" class="sg-svg" role="img" aria-label="Median review time versus gold accuracy per annotator">
      <rect x="${sgPad.l}" y="${sgPad.t}" width="${sgX(sgFast) - sgPad.l}" height="${sgPlotH}" class="sg-zone-fast" />
      <rect x="${sgX(sgFast)}" y="${sgPad.t}" width="${sgW - sgPad.r - sgX(sgFast)}" height="${sgY(sgTarget) - sgPad.t}" class="sg-zone-good" />
      ${sgYTicks}
      ${sgXTicks}
      <line x1="${sgPad.l}" x2="${sgW - sgPad.r}" y1="${sgY(sgTarget)}" y2="${sgY(sgTarget)}" class="sg-target" />
      <text x="${sgPad.l + 6}" y="${sgY(sgTarget) - 6}" class="sg-ref-label">Target ${sgTarget}%</text>
      <line x1="${sgX(sgFast)}" x2="${sgX(sgFast)}" y1="${sgPad.t}" y2="${sgPad.t + sgPlotH}" class="sg-target" />
      <text x="${sgPad.l + 6}" y="${sgPad.t + sgPlotH - 8}" class="sg-ref-label sg-ref-red">Rushed &lt; ${sgFast}s</text>
      ${sgPoints}
      <text x="${sgPad.l + sgPlotW / 2}" y="${sgH - 4}" text-anchor="middle" class="sg-axis">Median review time per clip</text>
    </svg>`;

  const sgBarRows = metricsList
    .map((m) => {
      const isSel = m.ann.id === selectedMetrics.ann.id;
      const accLow = m.goldAcc < sgTarget;
      const tooFast = m.medianTime < sgFast;
      const speedPct = Math.min(100, (m.medianTime / sgSpeedMax) * 100);
      return `
        <div class="sg-row ${isSel ? 'is-selected' : ''}" data-admin-ann="${m.ann.id}" title="Inspect ${m.ann.name}" role="button" tabindex="0" aria-label="Inspect ${m.ann.name}: ${m.goldAcc}% gold accuracy, ${m.medianTime.toFixed(1)} seconds median review">
          <div class="sg-name">
            <i class="sg-avatar" style="background:${sgPointColor(m)};">${sgInitials(m.ann.name)}</i>
            <span>${m.ann.name}</span>
          </div>
          <div class="sg-bar-cell">
            <div class="sg-track">
              <div class="sg-fill ${accLow ? 'is-bad' : ''}" style="width:${Math.max(2, m.goldAcc)}%;"></div>
              <span class="sg-tick-mark" style="left:${sgTarget}%;"></span>
            </div>
            <span class="sg-val ${accLow ? 'is-bad' : ''}">${m.goldAcc}%</span>
          </div>
          <div class="sg-bar-cell">
            <div class="sg-track">
              <div class="sg-fill sg-fill-speed ${tooFast ? 'is-bad' : ''}" style="width:${Math.max(2, speedPct)}%;"></div>
              <span class="sg-tick-mark" style="left:${(sgFast / sgSpeedMax) * 100}%;"></span>
            </div>
            <span class="sg-val ${tooFast ? 'is-bad' : ''}">${m.medianTime.toFixed(1)}s</span>
          </div>
        </div>`;
    })
    .join('');

  const userGraphColumnsHtml = `
    <div class="sg-wrap">
      <div class="sg-chart-card">
        <div class="sg-card-title">Speed vs. accuracy</div>
        ${sgScatterSvg}
      </div>
      <div class="sg-chart-card">
        <div class="sg-bars-head">
          <span>Annotator</span>
          <span>Gold accuracy</span>
          <span>Median review time</span>
        </div>
        ${sgBarRows}
        <div class="sg-legend">
          <span><i class="sg-status" style="background:#2F9E6A;"></i>Good</span>
          <span><i class="sg-status" style="background:#D4A055;"></i>Watch</span>
          <span><i class="sg-status" style="background:#D9534F;"></i>Action needed</span>
          <span class="sg-legend-note">Tick marks: ${sgTarget}% target · ${sgFast}s rushed threshold</span>
        </div>
      </div>
    </div>`;

  const userConfigRowsHtml = metricsList
    .map((m) => {
      const otherAnnotators = annotators.filter((a) => a.id !== m.ann.id);
      return `
        <tr>
          <td>
            <strong>${m.ann.name}</strong> <span class="selected-user-id">(${m.ann.id})</span>
          </td>
          <td>${m.ann.languages.map((l) => `<span class="lang-mini-chip" style="margin-right:3px;">${l.toUpperCase()}</span>`).join('')}</td>
          <td><strong>${m.assigned.length} clips</strong> (${m.reviewed.length} done)</td>
          <td><strong>${m.medianTime.toFixed(1)}s</strong> / clip</td>
          <td><strong>${m.goldAcc}%</strong> (${m.goldMatches.length}/${m.goldClips.length} Gold)</td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <select class="user-reassign-select" data-source-ann="${m.ann.id}" style="padding:4px 8px; border:1px solid var(--border-strong); border-radius:4px; background:var(--bg-subtle); font-size:0.76rem;">
                <option value="">Transfer clips to user…</option>
                ${otherAnnotators.map((oa) => `<option value="${oa.id}">→ ${oa.name} (${oa.id})</option>`).join('')}
              </select>
            </div>
          </td>
          <td style="text-align:right;">
            <button type="button" class="clean-pill-action-btn" data-config-inspect-ann="${m.ann.id}">Inspect User →</button>
          </td>
        </tr>
      `;
    })
    .join('');

  // Annotator Detail Disagreement Rows
  const disagreeRowsHtml = selectedMetrics.disagreements.length
    ? selectedMetrics.disagreements
        .map((c) => {
          const g = state.goldMap.get(c.id);
          return `
            <tr>
              <td><button type="button" class="inline-play-btn" data-play-url="${c.audio_url}" aria-label="Play ${c.id}" title="Play ${c.id}">▶</button></td>
              <td style="font-family:var(--font-mono); font-weight:700;">${c.id}</td>
              <td><span class="lang-mini-chip">${c.language}</span></td>
              <td>${c.duration_s}s</td>
              <td>${c.review_seconds}s</td>
              <td><span class="status-chip chip-watch">${c.annotator_verdict.toUpperCase()}</span></td>
              <td><span class="status-chip chip-action">${g.expert_verdict.toUpperCase()} (${g.expert_tags.join(', ') || 'clean'})</span></td>
              <td><button type="button" class="clean-pill-action-btn" data-open-wb="${c.id}">Open in Workbench →</button></td>
            </tr>
          `;
        })
        .join('')
    : `<tr><td colspan="8" style="text-align:center; color:#2F9E6A; font-weight:600;">✓ 100% Gold Agreement — No disagreements found for ${selectedMetrics.ann.name}!</td></tr>`;

  // Clean Standard Table for Batch Acceptance Gate Matrix (Language x Source)
  const sources = ['inhouse_studio', 'crowd_app', 'vendor_a', 'vendor_b'];
  const gateTableRowsList = [];
  Object.keys(LANG_NAMES).forEach((lang) => {
    sources.forEach((src) => {
      const slice = state.enrichedClips.filter((c) => c.language === lang && c.source === src);
      if (!slice.length) return;
      const flaggedPct = Math.round((slice.filter((c) => c.all_flags.length > 0).length / slice.length) * 100);
      const snrList = slice.map((c) => c.snr_db).filter((v) => v !== null);
      const meanSnr = snrList.length ? (snrList.reduce((a, b) => a + b, 0) / snrList.length).toFixed(1) : '—';
      const passes = flaggedPct <= state.settings.maxFlaggedPct && (meanSnr === '—' || parseFloat(meanSnr) >= state.settings.minSnrDb);
      const key = `${lang}__${src}`;
      const rawGate = state.gateDecisions[key];
      const savedDec = typeof rawGate === 'object' && rawGate !== null ? rawGate.status : (rawGate || (passes ? 'Accepted' : 'On Hold'));
      const savedReason = typeof rawGate === 'object' && rawGate !== null ? (rawGate.reason || '') : (lang === 'ta' && src === 'vendor_b' ? '100% clipped / low SNR' : '');

      gateTableRowsList.push(`
        <tr class="clean-issue-row">
          <td><strong>${LANG_NAMES[lang].split(' ')[0]} (${lang.toUpperCase()})</strong></td>
          <td><code>${src}</code></td>
          <td><strong>${slice.length} clips</strong></td>
          <td>${flaggedPct}%</td>
          <td>${meanSnr} dB</td>
          <td>
            <span class="clean-status-dot" style="background:${passes ? '#2F9E6A' : '#D9534F'}; margin-right:5px;"></span>
            <strong>${passes ? 'PASS' : 'FAIL'}</strong>
          </td>
          <td>
            <select class="gate-decision-select" data-gate-key="${key}" style="font-size:0.78rem; padding:4px 8px; border-radius:3px; border:1px solid var(--border-strong); background:var(--bg-subtle); color:var(--text-dark); font-weight:700;">
              <option value="Accepted" ${savedDec === 'Accepted' ? 'selected' : ''}>✓ Accepted</option>
              <option value="On Hold" ${savedDec === 'On Hold' ? 'selected' : ''}>⏸ On Hold</option>
              <option value="Rejected" ${savedDec === 'Rejected' ? 'selected' : ''}>✕ Rejected</option>
            </select>
          </td>
          <td>
            <input type="text" class="gate-reason-input" data-gate-reason-key="${key}" value="${savedReason.replace(/"/g, '&quot;')}" placeholder="Add gate note..." style="font-size:0.78rem; padding:4px 8px; border-radius:3px; border:1px solid var(--border-strong); width:100%; background:var(--bg-subtle); color:var(--text-dark);" />
          </td>
          <td style="text-align:right;">
            <button type="button" class="clean-pill-action-btn" data-gate-filter-lang="${lang}" data-gate-filter-src="${src}">Filter Slice →</button>
          </td>
        </tr>
      `);
    });
  });
  const gateRowsHtml = gateTableRowsList.join('');

  // Quality over time: calendar weeks of recorded_at, for the whole batch or one language
  const qotLang = state.qotLang || 'all';
  const qotClips = state.enrichedClips.filter((c) => qotLang === 'all' || c.language === qotLang);
  const qotWeekMap = new Map();
  qotClips.forEach((c) => {
    const key = weekStartKey(c.recorded_at) || 'undated';
    if (!qotWeekMap.has(key)) qotWeekMap.set(key, []);
    qotWeekMap.get(key).push(c);
  });
  const weekBuckets = Array.from(qotWeekMap.keys())
    .sort((x, y) => (x === 'undated' ? 1 : y === 'undated' ? -1 : x.localeCompare(y)))
    .map((k) => ({ label: k === 'undated' ? 'No recording date' : `Week of ${weekLabel(k)}`, clips: qotWeekMap.get(k) }));
  const qotLangPills = ['all', ...batchLangCodes()]
    .map((l) => `<button type="button" class="extej-pill-btn ${qotLang === l ? 'active' : ''}" data-qot-lang="${l}">${l === 'all' ? 'All' : l.toUpperCase()}</button>`)
    .join('');

  const qualityOverTimeRowsHtml = weekBuckets
    .map((wb) => {
      const cList = wb.clips;
      const cerList = cList.map((c) => c.cer).filter((v) => v !== null && v !== undefined);
      const meanCerPct = cerList.length ? ((cerList.reduce((a, b) => a + b, 0) / cerList.length) * 100).toFixed(1) : null;
      const flaggedPct = cList.length ? Math.round((cList.filter((c) => c.all_flags.length > 0).length / cList.length) * 100) : 0;
      const revList = cList.filter((c) => c.effective_verdict !== null);
      const acceptPct = revList.length ? Math.round((revList.filter((c) => c.effective_verdict !== 'drop').length / revList.length) * 100) : null;
      const langBreakdown = Object.keys(LANG_NAMES)
        .map((l) => {
          const cnt = cList.filter((c) => c.language === l).length;
          return cnt > 0 ? `<span class="lang-mini-chip" style="margin-right:3px;">${l.toUpperCase()}:${cnt}</span>` : '';
        })
        .join('');

      return `
        <tr>
          <td style="font-weight:600;">${wb.label} <span style="color:var(--text-muted); font-weight:400;">· ${cList.length} ${cList.length === 1 ? 'clip' : 'clips'}</span></td>
          <td>${langBreakdown}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:80px; height:8px; background:var(--bg-subtle); border-radius:99px; overflow:hidden;">
                <div style="width:${meanCerPct === null ? 0 : Math.min(100, parseFloat(meanCerPct) * 2.5)}%; height:100%; background:${meanCerPct !== null && parseFloat(meanCerPct) > state.settings.maxCer * 100 ? '#D9534F' : '#71717A'};"></div>
              </div>
              <strong style="font-family:var(--font-mono);">${meanCerPct === null ? '—' : `${meanCerPct}%`}</strong>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:80px; height:8px; background:var(--bg-subtle); border-radius:99px; overflow:hidden;">
                <div style="width:${flaggedPct}%; height:100%; background:#D4A055;"></div>
              </div>
              <strong style="font-family:var(--font-mono);">${flaggedPct}%</strong>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:80px; height:8px; background:var(--bg-subtle); border-radius:99px; overflow:hidden;">
                <div style="width:${acceptPct || 0}%; height:100%; background:#2F9E6A;"></div>
              </div>
              <strong style="font-family:var(--font-mono);">${acceptPct === null ? '—' : `${acceptPct}%`}</strong>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // Review Summary (Aggregate Verdict & Issue Tag Counts across batch)
  const totalKeep = state.enrichedClips.filter((c) => c.effective_verdict === 'keep').length;
  const totalFix = state.enrichedClips.filter((c) => c.effective_verdict === 'fix').length;
  const totalDrop = state.enrichedClips.filter((c) => c.effective_verdict === 'drop').length;
  const totalUnrev = state.enrichedClips.filter((c) => c.effective_verdict === null).length;

  const tagCountsHtml = ISSUE_TAGS.map((t) => {
    const cnt = state.enrichedClips.filter((c) => (c.effective_tags || []).includes(t)).length;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-radius:8px; background:var(--bg-subtle); border:1px solid var(--border-subtle); font-size:0.76rem;">
        <span class="issue-tag-name">${t}</span>
        <strong style="font-family:var(--font-mono);">${cnt} clips</strong>
      </div>
    `;
  }).join('');

  // Queue & Assignments Progress Tracker
  const unassignedClips = state.enrichedClips.filter((c) => !c.annotator_id);
  const queueProgressRowsHtml = metricsList
    .map((m) => {
      const pct = m.assigned.length ? Math.round((m.reviewed.length / m.assigned.length) * 100) : 0;
      const pending = m.assigned.length - m.reviewed.length;
      return `
        <tr>
          <td><strong>${m.ann.name}</strong> <span class="selected-user-id">(${m.ann.id})</span></td>
          <td>${m.ann.languages.map((l) => `<span class="lang-mini-chip" style="margin-right:3px;">${l}</span>`).join('')}</td>
          <td style="width:180px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; height:8px; background:var(--bg-subtle); border-radius:99px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:#D4A055;"></div>
              </div>
              <span style="font-family:var(--font-mono); font-size:0.72rem; font-weight:700;">${pct}%</span>
            </div>
          </td>
          <td style="font-family:var(--font-mono);">${m.reviewed.length} done / ${pending} pending</td>
          <td style="text-align:right;">
            <button type="button" class="clean-pill-action-btn" data-assign-unassigned="${m.ann.id}" ${unassignedClips.length === 0 ? 'disabled' : ''}>
              + Assign ${unassignedClips.length} Unassigned to ${m.ann.name.split(' ')[0]}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  // Top ASR Disagreement Clips
  const topCerClips = [...state.enrichedClips]
    .filter((c) => c.cer !== null)
    .sort((a, b) => b.cer - a.cer)
    .slice(0, 5);

  const isDiff = (key) => state.settings[key] !== DEFAULT_SETTINGS[key];

  const annotatorPillsHtml = metricsList
    .map(
      (m) => `
      <button
        type="button"
        class="sarvam-subpill-btn ${m.ann.id === selectedMetrics.ann.id ? 'active' : ''}"
        data-admin-ann="${m.ann.id}"
      >
        ${m.ann.name} (${m.goldAcc}% Gold)
      </button>
    `
    )
    .join('');

  container.innerHTML = `
    <!-- SUBSECTION 1: TEAM QUALITY SCORECARD -->
    <div class="sarvam-doc-section" data-sub-id="scorecard">
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">1. Team Quality Scorecard (vs. gold.json)</div>
            <div class="panel-subtitle">Click any annotator row to select them, or jump to their Deep-Dive Disagreement Inspector</div>
          </div>
          <button type="button" class="clean-pill-action-btn" id="admin-jump-deepdive-btn">
            Inspect ${selectedMetrics.ann.name} Deep-Dive →
          </button>
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Annotator</th>
                <th>Done</th>
                <th>Median Time</th>
                <th>K / F / D Split</th>
                <th>Gold Acc</th>
                <th>Rev Agree</th>
                <th>Weekly Trend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${scorecardRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 2: CLEAN 5-USER SPEED VS. GOLD ACCURACY GRAPH & USER WORKLOAD CONFIGURATOR -->
    <div class="sarvam-doc-section" data-sub-id="scatter_graph">
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">Speed vs. Gold Accuracy</div>
            <div class="panel-subtitle">How fast each annotator reviews a clip, and how often they agree with the expert gold verdicts</div>
          </div>
          <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
            <button type="button" class="clean-pill-action-btn" id="scatter-jump-deepdive-btn">
              Inspect ${selectedMetrics.ann.name} Deep-Dive →
            </button>
          </div>
        </div>

        ${userGraphColumnsHtml}

        <div style="border-top:1px solid var(--border-subtle); padding-top:16px;">
          <div class="panel-title" style="margin-bottom:4px; font-size:0.94rem;">Configure &amp; Reassign Data Among Users</div>
          <div class="panel-subtitle" style="margin-bottom:12px;">Directly transfer or balance assigned clips between annotators or open a user's queue</div>
          <div class="data-table-wrap">
            <table class="atlas-table clean-issue-table">
              <thead>
                <tr>
                  <th>Annotator</th>
                  <th>Languages</th>
                  <th>Current Workload</th>
                  <th>Median Speed</th>
                  <th>Gold Accuracy</th>
                  <th>Transfer / Reassign Clips</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>${userConfigRowsHtml}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 3: ANNOTATOR DEEP-DIVE DETAIL INSPECTOR -->
    <div class="sarvam-doc-section" data-sub-id="annotator_deep_dive">
      <div class="panel-card" style="margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Select Annotator:</span>
          ${annotatorPillsHtml}
        </div>
        <div class="panel-header">
          <div>
            <div class="panel-title">
              2. Annotator Deep-Dive: ${selectedMetrics.ann.name} (${selectedMetrics.ann.id})
              <span class="status-chip ${selectedMetrics.statusClass}">${selectedMetrics.status}</span>
            </div>
            <div class="panel-subtitle">
              Languages covered: <strong>${selectedMetrics.ann.languages.map((l) => LANG_NAMES[l]).join(' • ')}</strong> |
              Gold Accuracy: <strong>${selectedMetrics.goldAcc}% (${selectedMetrics.goldMatches.length}/${selectedMetrics.goldClips.length})</strong> |
              Missed Issue Tags vs Gold:
              ${
                Object.keys(selectedMetrics.missedTagsCount).length
                  ? Object.entries(selectedMetrics.missedTagsCount)
                      .map(([t, cnt]) => `<span class="issue-tag-name" style="margin-left:4px;">${t}: ${cnt} missed</span>`)
                      .join('')
                  : '<span class="status-chip chip-good">0 tags missed</span>'
              }
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:10px; background:var(--bg-subtle); border:1px solid var(--border-subtle); font-size:0.73rem;">
              <span style="font-weight:700; color:var(--text-muted);">Gold accuracy by week (gold clips):</span>
              ${selectedMetrics.weeklyPts.length
                ? selectedMetrics.weeklyPts
                    .map(
                      (pt, idx) =>
                        `<span class="status-chip ${pt >= state.settings.goldTargetPct ? 'chip-good' : pt >= state.settings.actionGoldPct ? 'chip-watch' : 'chip-action'}" style="padding:2px 7px; font-size:0.68rem;">${selectedMetrics.weeklyLabels[idx]}: ${pt}%</span>`
                    )
                    .join('')
                : '<span style="color:var(--text-muted);">No dated gold clips</span>'}
            </div>
            <button type="button" class="clean-pill-action-btn" id="detail-filter-explorer-btn">
              Open All ${selectedMetrics.assigned.length} Assigned Clips in Explorer →
            </button>
          </div>
        </div>

        <div class="data-table-wrap">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Play</th>
                <th>Clip ID</th>
                <th>Lang</th>
                <th>Clip Dur</th>
                <th>Review Time</th>
                <th>${selectedMetrics.ann.name}'s Verdict</th>
                <th>Expert Gold Verdict &amp; Tags</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${disagreeRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 4: SETTINGS THRESHOLDS + EXPORT / CONFLICT MERGER -->
    <div class="sarvam-doc-section" data-sub-id="thresholds_merger">
      <div class="dashboard-grid-2col" style="margin-bottom:18px;">
        <div class="panel-card" style="margin-bottom:0;">
          <div class="panel-header">
            <div>
              <div class="panel-title">3. Quality Threshold Settings (Live Recompute)</div>
              <div class="panel-subtitle">Changing any value immediately updates flags, status chips &amp; batch gates across the app</div>
            </div>
            <button type="button" class="ws-utility-btn" id="reset-thresholds-btn">↺ Reset to Defaults</button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="filter-control">
              <label>
                <span>Min SNR (dB)</span>
                ${isDiff('minSnrDb') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.minSnrDb}</span>` : ''}
              </label>
              <input type="number" step="0.5" id="set-snr" value="${state.settings.minSnrDb}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Max CER (%)</span>
                ${isDiff('maxCer') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.maxCer * 100}%</span>` : ''}
              </label>
              <input type="number" step="1" id="set-cer" value="${Math.round(state.settings.maxCer * 100)}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Min Rate (chars/s)</span>
                ${isDiff('minCps') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.minCps}</span>` : ''}
              </label>
              <input type="number" step="0.5" id="set-min-cps" value="${state.settings.minCps}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Max Rate (chars/s)</span>
                ${isDiff('maxCps') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.maxCps}</span>` : ''}
              </label>
              <input type="number" step="0.5" id="set-max-cps" value="${state.settings.maxCps}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Gold Target (%)</span>
                ${isDiff('goldTargetPct') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.goldTargetPct}%</span>` : ''}
              </label>
              <input type="number" step="1" id="set-gold" value="${state.settings.goldTargetPct}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Max Flagged (%)</span>
                ${isDiff('maxFlaggedPct') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.maxFlaggedPct}%</span>` : ''}
              </label>
              <input type="number" step="1" id="set-flagged" value="${state.settings.maxFlaggedPct}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Action needed below gold (%)</span>
                ${isDiff('actionGoldPct') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.actionGoldPct}%</span>` : ''}
              </label>
              <input type="number" step="1" id="set-action-gold" value="${state.settings.actionGoldPct}" />
            </div>
            <div class="filter-control">
              <label>
                <span>Rushed review under (s)</span>
                ${isDiff('minReviewSec') ? `<span class="threshold-modified-pill">Def: ${DEFAULT_SETTINGS.minReviewSec}s</span>` : ''}
              </label>
              <input type="number" step="0.5" id="set-min-review" value="${state.settings.minReviewSec}" />
            </div>
          </div>
          <p style="font-size:0.74rem; color:var(--text-muted); margin-top:10px; line-height:1.5;">
            Status chips: <strong>Action needed</strong> if gold accuracy is below the action level or the median review time is under the rushed limit ·
            <strong>Watch</strong> if gold accuracy is below the target · otherwise <strong>Good</strong>.
          </p>
          <button type="button" class="emplo-login-btn" style="width:100%; margin-top:14px; padding:10px;" id="apply-settings-btn">
            Apply Live Thresholds Across App
          </button>
        </div>

        <!-- EXPORT, IMPORT & CONFLICT MERGER -->
        <div class="panel-card" style="margin-bottom:0;">
          <div class="panel-header">
            <div>
              <div class="panel-title">4. Export Verdicts &amp; Multi-Reviewer Conflict Merger</div>
              <div class="panel-subtitle">Download JSON/CSV or import a second reviewer's verdicts file to resolve conflicts</div>
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
            <button type="button" class="emplo-login-btn" style="padding:8px 14px; min-width:auto; font-size:0.76rem;" id="export-json-btn">
              ↓ Export Verdicts JSON
            </button>
            <button type="button" class="emplo-login-btn" style="padding:8px 14px; min-width:auto; font-size:0.76rem; background:#C0533A;" id="export-csv-btn">
              ↓ Export Verdicts CSV
            </button>
            <label class="ws-utility-btn" style="cursor:pointer;">
              ↑ Import Verdicts JSON
              <input type="file" id="import-json-input" accept=".json" style="display:none;" />
            </label>
            <button type="button" class="ws-utility-btn" id="demo-conflict-btn">
              ⚡ Load Sample Colleague File (3 Conflicts)
            </button>
          </div>

          <div id="conflict-merger-box">
            ${renderConflictMergerHtml()}
          </div>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 5: BATCH ACCEPTANCE GATE TABLE -->
    <div class="sarvam-doc-section" data-sub-id="acceptance_gate">
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">5. Batch Acceptance Gate Table (Language × Recording Source)</div>
            <div class="panel-subtitle">Each Language × Source slice is evaluated against live thresholds. Set Gate Decision and Reason Notes directly in the table.</div>
          </div>
          <button type="button" class="clean-pill-action-btn" id="export-gate-btn">↓ Export Gate Report JSON</button>
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table clean-issue-table">
            <thead>
              <tr>
                <th>Language</th>
                <th>Recording Source</th>
                <th>Clips</th>
                <th>Flagged %</th>
                <th>Mean SNR</th>
                <th>Auto-Gate Check</th>
                <th>Gate Decision</th>
                <th>Reason / Note</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>${gateRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SUBSECTION 6: QUALITY OVER TIME, FOLLOWED UNDERNEATH BY POINT 7 QUEUE ASSIGNMENTS, POINT 8 & POINT 9 -->
    <div class="sarvam-doc-section" data-sub-id="quality_trends">
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">6. Quality Over Time (Weekly CER, % Flagged &amp; Acceptance Rate)</div>
            <div class="panel-subtitle">Grouped by the week each clip was recorded. Acceptance = share of reviewed clips not dropped. Pick a language to see its trend.</div>
          </div>
          <div class="extej-time-pills">${qotLangPills}</div>
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Languages</th>
                <th>Mean CER</th>
                <th>% Flagged</th>
                <th>Acceptance Rate</th>
              </tr>
            </thead>
            <tbody>${qualityOverTimeRowsHtml}</tbody>
          </table>
        </div>
      </div>

      <!-- POINT 7 STACKED DIRECTLY UNDER POINT 6 -->
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">7. Queue &amp; Assignments Progress Tracker (${unassignedClips.length} Unassigned)</div>
            <div class="panel-subtitle">Monitor each annotator's completion bar or assign the ${unassignedClips.length} unassigned clips in one click</div>
          </div>
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Annotator</th>
                <th>Langs</th>
                <th>Queue Progress</th>
                <th>Count</th>
                <th style="text-align:right;">Quick Assign</th>
              </tr>
            </thead>
            <tbody>${queueProgressRowsHtml}</tbody>
          </table>
        </div>
      </div>

      <!-- POINT 8: REVIEW SUMMARY & TOP ASR DISAGREEMENTS -->
      <div class="panel-card" style="margin-bottom:18px;">
        <div class="panel-header">
          <div>
            <div class="panel-title">8. Batch Review Summary &amp; Top Human vs. ASR Disagreements</div>
            <div class="panel-subtitle">Aggregate Keep / Fix / Drop verdict counts, issue tag frequency &amp; highest CER clips</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:12px;">
          <div style="padding:8px 10px; border-radius:10px; background:#F7FBF8; border:1px solid #D7EBDD; text-align:center;">
            <div style="font-size:0.68rem; font-weight:700; color:#1F7A4D;">KEEP</div>
            <div style="font-size:1.15rem; font-weight:800; color:#1F7A4D;">${totalKeep}</div>
          </div>
          <div style="padding:8px 10px; border-radius:10px; background:#FBF6EE; border:1px solid #EAD9BD; text-align:center;">
            <div style="font-size:0.68rem; font-weight:700; color:#8A5A1C;">FIX TRANSCRIPT</div>
            <div style="font-size:1.15rem; font-weight:800; color:#8A5A1C;">${totalFix}</div>
          </div>
          <div style="padding:8px 10px; border-radius:10px; background:#FDF3F2; border:1px solid #F1CFCB; text-align:center;">
            <div style="font-size:0.68rem; font-weight:700; color:#B23B36;">DROP CLIP</div>
            <div style="font-size:1.15rem; font-weight:800; color:#B23B36;">${totalDrop}</div>
          </div>
          <div style="padding:8px 10px; border-radius:10px; background:var(--bg-subtle); border:1px solid var(--border-strong); text-align:center;">
            <div style="font-size:0.68rem; font-weight:700; color:var(--text-muted);">UNREVIEWED</div>
            <div style="font-size:1.15rem; font-weight:800;">${totalUnrev}</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:12px;">
          ${tagCountsHtml}
        </div>
        <div class="data-table-wrap">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Clip</th>
                <th>Lang</th>
                <th>CER</th>
                <th>Fired Issue</th>
                <th style="text-align:right;">Inspect</th>
              </tr>
            </thead>
            <tbody>
              ${topCerClips
                .map(
                  (c) => `
                <tr>
                  <td style="font-family:var(--font-mono); font-weight:700;">${c.id}</td>
                  <td><span class="lang-mini-chip">${c.language}</span></td>
                  <td style="color:#C0533A; font-weight:700;">${(c.cer * 100).toFixed(1)}%</td>
                  <td>${c.all_flags.map((f) => `<span class="issue-tag-name" style="font-size:0.63rem; margin-right:3px;">${f}</span>`).join('')}</td>
                  <td style="text-align:right;"><button type="button" class="clean-pill-action-btn" data-open-wb="${c.id}">Inspect →</button></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- POINT 9: BROWSER VERDICT ACTIVITY LOG -->
      <div class="panel-card" style="margin-bottom:0;">
        <div class="panel-header">
          <div>
            <div class="panel-title">9. Browser Verdict Activity Log (${state.activityLog.length})</div>
            <div class="panel-subtitle">Searchable audit log of every verdict change in this browser</div>
          </div>
          <input type="text" id="activity-search-input" value="${state.activitySearch}" placeholder="Search clip or user..." style="padding:5px 10px; border-radius:4px; border:1px solid var(--border-strong); font-size:0.75rem;" />
        </div>
        <div class="data-table-wrap" style="max-height:310px; overflow-y:auto;">
          <table class="atlas-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Clip</th>
                <th>Transition</th>
              </tr>
            </thead>
            <tbody>
              ${
                state.activityLog.length
                  ? state.activityLog
                      .filter((l) => !state.activitySearch || l.clip_id.includes(state.activitySearch) || l.user_name.toLowerCase().includes(state.activitySearch.toLowerCase()))
                      .map(
                        (log) => `
                      <tr>
                        <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td><strong>${log.user_name}</strong></td>
                        <td style="font-family:var(--font-mono);">${log.clip_id}</td>
                        <td>${log.old_verdict} → <strong>${log.new_verdict.toUpperCase()}</strong></td>
                      </tr>
                    `
                      )
                      .join('')
                  : '<tr><td colspan="4" style="color:var(--text-muted);">No manual overrides yet in this session. Judge clips in Workbench to populate log.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Bind Annotator row & graph column clicks
  container.querySelectorAll('[data-admin-ann]').forEach((el) => {
    el.addEventListener('click', () => {
      state.selectedAdminAnnotator = el.dataset.adminAnn;
      renderScreenAdmin(container);
    });
    if (el.getAttribute('role') === 'button') {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          state.selectedAdminAnnotator = el.dataset.adminAnn;
          renderScreenAdmin(container);
        }
      });
    }
  });

  // Bind User Workload Reassign dropdowns in the Speed vs. Accuracy Graph section
  container.querySelectorAll('.user-reassign-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const sourceAnn = sel.getAttribute('data-source-ann');
      const targetAnn = e.target.value;
      if (!sourceAnn || !targetAnn) return;
      const sourceClips = state.enrichedClips.filter((c) => c.annotator_id === sourceAnn);
      sourceClips.forEach((c) => {
        state.assignmentsMap[c.id] = targetAnn;
      });
      savePersistedStorage();
      recomputeEnrichedClips();
      renderScreenAdmin(container);
      showToast(`Transferred ${sourceClips.length} clips from ${sourceAnn} to ${targetAnn}!`);
    });
  });

  container.querySelectorAll('[data-config-inspect-ann]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedAdminAnnotator = btn.getAttribute('data-config-inspect-ann');
      switchSarvamSubsection('admin', 'annotator_deep_dive');
      renderScreenAdmin(container);
    });
  });

  // Bind Gate Table Filter Slice buttons
  container.querySelectorAll('[data-gate-filter-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      resetFilters();
      state.filters.language = btn.getAttribute('data-gate-filter-lang');
      state.filters.source = btn.getAttribute('data-gate-filter-src');
      state.activeSubsections.explorer = 'all';
      navigateToScreen('explorer');
    });
  });

  document.getElementById('detail-filter-explorer-btn').addEventListener('click', () => {
    resetFilters();
    state.filters.annotator = selectedMetrics.ann.id;
    navigateToScreen('explorer');
  });

  // Bind Quick Assign Unassigned buttons
  container.querySelectorAll('[data-assign-unassigned]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetAnn = btn.dataset.assignUnassigned;
      unassignedClips.forEach((c) => {
        state.assignmentsMap[c.id] = targetAnn;
      });
      savePersistedStorage();
      recomputeEnrichedClips();
      renderScreenAdmin(container);
      showToast(`Assigned ${unassignedClips.length} unassigned clips to ${targetAnn}!`);
    });
  });

  // Bind inline play & open workbench inside Admin
  bindExplorerRowInteractions(container, state.enrichedClips);

  container.querySelectorAll('[data-qot-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.qotLang = btn.dataset.qotLang;
      const y = window.scrollY;
      renderScreenAdmin(container);
      window.scrollTo(0, y);
    });
  });

  // Apply Live Settings
  document.getElementById('apply-settings-btn').addEventListener('click', () => {
    const num = (id, fallback) => {
      const v = parseFloat(document.getElementById(id).value);
      return Number.isFinite(v) ? v : fallback;
    };
    state.settings.minSnrDb = num('set-snr', DEFAULT_SETTINGS.minSnrDb);
    state.settings.maxCer = num('set-cer', DEFAULT_SETTINGS.maxCer * 100) / 100;
    state.settings.minCps = num('set-min-cps', DEFAULT_SETTINGS.minCps);
    state.settings.maxCps = num('set-max-cps', DEFAULT_SETTINGS.maxCps);
    state.settings.goldTargetPct = num('set-gold', DEFAULT_SETTINGS.goldTargetPct);
    state.settings.maxFlaggedPct = num('set-flagged', DEFAULT_SETTINGS.maxFlaggedPct);
    state.settings.actionGoldPct = num('set-action-gold', DEFAULT_SETTINGS.actionGoldPct);
    state.settings.minReviewSec = num('set-min-review', DEFAULT_SETTINGS.minReviewSec);
    savePersistedStorage();
    recomputeEnrichedClips();
    renderScreenAdmin(container);
    showToast('Quality thresholds updated! Flags, scorecards & gates recomputed.');
  });

  document.getElementById('reset-thresholds-btn').addEventListener('click', () => {
    state.settings = { ...DEFAULT_SETTINGS };
    savePersistedStorage();
    recomputeEnrichedClips();
    renderScreenAdmin(container);
    showToast('Thresholds reset to factory defaults.');
  });

  // Export JSON & CSV
  document.getElementById('export-json-btn').addEventListener('click', () => {
    const exportData = state.enrichedClips.map((c) => ({
      clip_id: c.id,
      language: c.language,
      source: c.source,
      verdict: c.effective_verdict,
      tags: c.effective_tags,
      transcript: c.transcript,
      note: c.note
    }));
    downloadBlob(JSON.stringify(exportData, null, 2), 'clip_atlas_verdicts.json', 'application/json');
  });

  document.getElementById('export-csv-btn').addEventListener('click', () => {
    const headers = ['clip_id', 'language', 'source', 'speaker_id', 'duration_s', 'snr_db', 'cer', 'verdict', 'tags', 'note'];
    const rows = state.enrichedClips.map((c) =>
      [
        c.id,
        c.language,
        c.source,
        c.speaker_id,
        c.duration_s,
        c.snr_db ?? '',
        c.cer ?? '',
        c.effective_verdict ?? '',
        `"${(c.effective_tags || []).join(';')}"`,
        `"${(c.note || '').replace(/"/g, '""')}"`
      ].join(',')
    );
    downloadBlob([headers.join(','), ...rows].join('\n'), 'clip_atlas_verdicts.csv', 'text/csv');
  });

  // Import JSON & Demo Conflict
  const importInput = document.getElementById('import-json-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          state.importedVerdicts = JSON.parse(reader.result);
          renderScreenAdmin(container);
          showToast(`Imported ${state.importedVerdicts.length} verdicts for conflict analysis.`);
        } catch (err) {
          showToast('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    });
  }

  document.getElementById('demo-conflict-btn').addEventListener('click', () => {
    state.importedVerdicts = [
      { clip_id: 'clp_0020', reviewer: 'Kavya M. (rev_01)', verdict: 'drop', tags: ['truncated', 'noisy'] },
      { clip_id: 'clp_0058', reviewer: 'Imran A. (rev_02)', verdict: 'drop', tags: ['wrong_language'] },
      { clip_id: 'clp_0041', reviewer: 'Kavya M. (rev_01)', verdict: 'fix', tags: ['wrong_transcript'] }
    ];
    renderScreenAdmin(container);
    showToast('Loaded sample colleague verdicts with 3 conflicts against initial annotator verdicts.');
  });

  bindConflictButtons(container);

  // Gate selects, reason inputs & export
  const saveGateCell = (key, statusVal, reasonVal) => {
    const existing = state.gateDecisions[key];
    const prevStatus = typeof existing === 'object' && existing !== null ? existing.status : (existing || 'Accepted');
    const prevReason = typeof existing === 'object' && existing !== null ? existing.reason : '';
    state.gateDecisions[key] = {
      status: statusVal !== null ? statusVal : prevStatus,
      reason: reasonVal !== null ? reasonVal : prevReason,
      updated_at: new Date().toISOString()
    };
    savePersistedStorage();
  };

  container.querySelectorAll('.gate-decision-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      saveGateCell(sel.dataset.gateKey, e.target.value, null);
      showToast(`Saved gate decision (${e.target.value}) for ${sel.dataset.gateKey.replace('__', ' / ')}`);
    });
  });

  container.querySelectorAll('.gate-reason-input').forEach((inp) => {
    inp.addEventListener('change', (e) => {
      saveGateCell(inp.dataset.gateReasonKey, null, e.target.value);
      showToast(`Saved gate note for ${inp.dataset.gateReasonKey.replace('__', ' / ')}`);
    });
  });

  document.getElementById('export-gate-btn').addEventListener('click', () => {
    downloadBlob(JSON.stringify(state.gateDecisions, null, 2), 'clip_atlas_batch_gate_decisions.json', 'application/json');
  });

  const actSearch = document.getElementById('activity-search-input');
  if (actSearch) {
    actSearch.addEventListener('input', (e) => {
      state.activitySearch = e.target.value;
      renderScreenAdmin(container);
    });
  }

  ['admin-jump-deepdive-btn', 'scatter-jump-deepdive-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        switchSarvamSubsection('admin', 'annotator_deep_dive');
      });
    }
  });

  renderSarvamDocsNavigation();
}

function renderConflictMergerHtml() {
  if (!state.importedVerdicts || !state.importedVerdicts.length) {
    return `<div style="padding:14px; border-radius:12px; background:var(--bg-subtle); border:1px dashed var(--border-strong); font-size:0.78rem; color:var(--text-muted);">
      No external verdicts loaded yet. Click <strong>"⚡ Load Sample Colleague File"</strong> above or upload a JSON export to inspect &amp; resolve verdict conflicts side-by-side.
    </div>`;
  }

  const conflicts = state.importedVerdicts.filter((imp) => {
    const local = state.enrichedClips.find((c) => c.id === imp.clip_id);
    return local && local.effective_verdict !== imp.verdict;
  });

  if (conflicts.length === 0) {
    return `<div class="status-chip chip-good" style="padding:10px 14px;">✓ All imported verdicts have been resolved and merged!</div>`;
  }

  return `
    <div style="font-size:0.76rem; font-weight:700; color:#b91c1c; margin-bottom:8px;">
      ⚠ ${conflicts.length} Verdict Conflicts Detected — Pick Winning Verdict:
    </div>
    <div class="data-table-wrap">
      <table class="atlas-table">
        <thead>
          <tr>
            <th>Clip</th>
            <th>Current App Verdict</th>
            <th>Imported Verdict</th>
            <th>Resolution</th>
          </tr>
        </thead>
        <tbody>
          ${conflicts
            .map((imp) => {
              const local = state.enrichedClips.find((c) => c.id === imp.clip_id);
              return `
                <tr>
                  <td style="font-family:var(--font-mono); font-weight:700;">${imp.clip_id}</td>
                  <td><span class="status-chip chip-watch">${(local.effective_verdict || 'unreviewed').toUpperCase()}</span></td>
                  <td><span class="status-chip chip-action">${imp.verdict.toUpperCase()} (${(imp.tags || []).join(', ')})</span></td>
                  <td style="display:flex; gap:6px;">
                    <button type="button" class="ws-utility-btn" data-resolve-clip="${imp.clip_id}" data-resolve-winner="imported">Accept Imported (${imp.verdict.toUpperCase()})</button>
                    <button type="button" class="ws-utility-btn" data-resolve-clip="${imp.clip_id}" data-resolve-winner="local">Keep Current</button>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function bindConflictButtons(container) {
  container.querySelectorAll('[data-resolve-clip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const clipId = btn.dataset.resolveClip;
      const winner = btn.dataset.resolveWinner;
      const imp = state.importedVerdicts.find((x) => x.clip_id === clipId);
      const clip = state.enrichedClips.find((c) => c.id === clipId);
      if (winner === 'imported' && imp && clip) {
        saveClipVerdict(clip, imp.verdict, imp.tags || []);
      }
      state.importedVerdicts = state.importedVerdicts.filter((x) => x.clip_id !== clipId);
      renderScreenAdmin(container);
      showToast(`Resolved conflict for ${clipId} (${winner.toUpperCase()} won)`);
    });
  });
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  showToast(`Downloaded ${filename}`);
}

// ----------------------------------------------------------------------------
// 9. SPEAKER PROFILE, A/B COMPARE & EXECUTIVE FINDINGS MODALS
// ----------------------------------------------------------------------------
function openSpeakerProfileModal(speakerId) {
  const modal = document.getElementById('speaker-modal');
  const content = document.getElementById('speaker-modal-content');
  if (!modal || !content) return;

  const spkClips = state.enrichedClips.filter((c) => c.speaker_id === speakerId);
  const totalSec = spkClips.reduce((s, c) => s + (c.duration_s || 0), 0);
  const snrs = spkClips.map((c) => c.snr_db).filter((v) => v !== null);
  const meanSnr = snrs.length ? (snrs.reduce((a, b) => a + b, 0) / snrs.length).toFixed(1) : '—';
  const lang = spkClips[0] ? spkClips[0].language : 'hi';

  content.innerHTML = `
    <div class="modal-header">
      <div>
        <h3>🎙 Speaker Profile: <span style="font-family:var(--font-mono); color:var(--emplo-blue);">${speakerId}</span></h3>
        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
          ${LANG_NAMES[lang]} • ${spkClips.length} Clips • Total Duration: ${totalSec.toFixed(1)}s (${(totalSec / 60).toFixed(2)}m) • Mean SNR: ${meanSnr} dB
        </div>
      </div>
      <button type="button" class="modal-close-btn" id="close-speaker-modal-btn" aria-label="Close">✕</button>
    </div>
    <div class="data-table-wrap">
      <table class="atlas-table">
        <thead>
          <tr>
            <th>Play</th>
            <th>Clip ID</th>
            <th>Source</th>
            <th>Duration</th>
            <th>SNR</th>
            <th>CER</th>
            <th>Flags</th>
            <th>Transcript</th>
          </tr>
        </thead>
        <tbody>
          ${spkClips
            .map(
              (c) => `
            <tr>
              <td><button type="button" class="inline-play-btn" data-play-url="${c.audio_url}" aria-label="Play ${c.id}" title="Play ${c.id}">▶</button></td>
              <td style="font-family:var(--font-mono); font-weight:700;">${c.id}</td>
              <td>${c.source}</td>
              <td>${c.duration_s}s</td>
              <td>${c.snr_db !== null ? `${c.snr_db} dB` : '—'}</td>
              <td>${c.cer !== null ? `${(c.cer * 100).toFixed(1)}%` : '—'}</td>
              <td>${c.all_flags.join(', ') || 'Clean'}</td>
              <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.transcript}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  modal.classList.remove('hidden');
  document.getElementById('close-speaker-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));
  bindExplorerRowInteractions(content, spkClips);
}

function bindGlobalHeaderModals() {
  // A/B Compare Modal
  const abBtn = document.getElementById('open-ab-compare-btn');
  const abModal = document.getElementById('ab-compare-modal');
  const abContent = document.getElementById('ab-compare-content');

  if (abBtn && abModal && abContent) {
    abBtn.addEventListener('click', () => renderAbCompareModal('clp_0012', 'clp_0095'));
  }

  // Findings Modal
  const findingsBtn = document.getElementById('open-findings-btn');
  const findingsModal = document.getElementById('findings-modal');
  const findingsContent = document.getElementById('findings-modal-content');

  if (findingsBtn && findingsModal && findingsContent) {
    findingsBtn.addEventListener('click', () => {
      findingsContent.innerHTML = `
        <div class="modal-header">
          <div>
            <h3>📋 Executive Batch Findings Report (FINDINGS.md)</h3>
            <div style="font-size:0.78rem; color:var(--text-muted);">
              "What I'd tell the data team about this 100-clip batch" — Click any deep-link button below to jump straight to that filtered view.
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="close-findings-modal-btn" aria-label="Close">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px; font-size:0.83rem; line-height:1.6;">
          <div class="panel-card" style="margin-bottom:0; border-left:4px solid #dc2626;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
              <strong>Finding 1 (Annotator Speed-Clicking): Meera K. (ann_03) rubber-stamped 28 clips at 4.0s median time (44.4% Gold Accuracy)</strong>
              <button type="button" class="emplo-login-btn" style="padding:6px 12px; min-width:auto; font-size:0.73rem;" data-finding-link="ann_03">Filter ann_03 in Explorer →</button>
            </div>
            <p>Meera K. was assigned 30 clips (HI, MR, BN) — 30% of the entire batch — and reviewed 28 of them in <strong>2.1s to 7.4s per clip</strong> despite clip durations of 11–21s. She marked 89.3% as <code>keep</code>, approving Bengali clips containing Hindi Devanagari transcripts (<code>clp_0058</code>) and a 1.07s truncated Hindi clip (<code>clp_0051</code>). <strong>Action:</strong> Quarantine all 28 of <code>ann_03</code>'s reviews for Reviewer re-judging and enforce a minimum listen-duration gate in the workbench.</p>
          </div>

          <div class="panel-card" style="margin-bottom:0; border-left:4px solid #ea580c;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
              <strong>Finding 2 (Truncation Blindspot): 6 clips are severely cut short (1.04s–1.61s) &amp; Vikram S. (ann_02) approved 4 of them</strong>
              <button type="button" class="emplo-login-btn" style="padding:6px 12px; min-width:auto; font-size:0.73rem;" data-finding-link="rate_anomaly">Filter rate_anomaly (8) →</button>
            </div>
            <p>Our browser-derived speaking-rate check (<code>chars/sec &gt; 25</code>) caught 6 clips (<code>clp_0020</code>, <code>clp_0023</code>, <code>clp_0029</code>, <code>clp_0042</code>, <code>clp_0051</code>, <code>clp_0074</code>) where audio cuts off after 1–3 words while the human transcript contains 91–211 characters (79–157 chars/s, CER 81–96%). Annotator <code>ann_02</code> (Vikram S.) marked <code>keep</code> on all 4 truncated clips in his queue. <strong>Action:</strong> Auto-drop clips with <code>cps &gt; 35</code> &amp; retrain <code>ann_02</code> on end-of-utterance truncation checks.</p>
          </div>

          <div class="panel-card" style="margin-bottom:0; border-left:4px solid #d97706;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
              <strong>Finding 3 (Vendor Hardware Defect): 100% of audio clipping (10/10) &amp; 89% of low SNR (8/9) originate from vendor_b Tamil</strong>
              <button type="button" class="emplo-login-btn" style="padding:6px 12px; min-width:auto; font-size:0.73rem;" data-finding-link="vendor_b_ta">Filter vendor_b Tamil (10) →</button>
            </div>
            <p>Every single <code>vendor_b</code> Tamil clip (10 of 10: <code>clp_0003</code>, <code>clp_0008</code>, <code>clp_0012</code>, <code>clp_0020</code>, <code>clp_0029</code>, <code>clp_0031</code>, <code>clp_0035</code>, <code>clp_0038</code>, <code>clp_0049</code>, <code>clp_0063</code>) suffers from severe gain clipping (<code>1.62%–5.83%</code>) and/or low SNR (<code>8.5–15.1 dB</code>). Meanwhile, <code>vendor_b</code>'s Hindi, Marathi, and Bengali slices are clean. <strong>Action:</strong> Reject the <code>ta × vendor_b</code> slice in the Batch Acceptance Gate and require hardware pre-amp recalibration from <code>vendor_b</code>'s Tamil studio.</p>
          </div>

          <div class="panel-card" style="margin-bottom:0; border-left:4px solid #D4A055;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
              <strong>Finding 4 (Pipeline Script Contamination): 4 Bengali (bn) clips have Hindi Devanagari transcripts (~100% CER)</strong>
              <button type="button" class="emplo-login-btn" style="padding:6px 12px; min-width:auto; font-size:0.73rem;" data-finding-link="script_mismatch">Filter script_mismatch (4) →</button>
            </div>
            <p>Clips <code>clp_0017</code>, <code>clp_0037</code> (unassigned), <code>clp_0058</code>, and <code>clp_0060</code> are tagged <code>bn</code> (Bengali), but their prompts/transcripts are in Hindi Devanagari (<code>\\u0900–\\u097F</code>), driving Bengali ASR CER to 94.4%–105.4%. <strong>Action:</strong> Drop or relabel these 4 clips to <code>hi</code> after audio verification, and add a pre-ingestion Unicode script validator.</p>
          </div>

          <div class="panel-card" style="margin-bottom:0; border-left:4px solid #3F3F46;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
              <strong>Finding 5 (Missing Transcripts, Duplicate Prompts &amp; Unreviewed Backlog): 2 empty transcripts + 3 duplicate prompts + 15 unreviewed</strong>
              <button type="button" class="emplo-login-btn" style="padding:6px 12px; min-width:auto; font-size:0.73rem;" data-finding-link="duplicate_transcript">Filter Duplicates (3) →</button>
            </div>
            <p><code>clp_0066</code> (TA) and <code>clp_0096</code> (OR) have empty human transcripts (<code>""</code>) but valid ASR hypotheses ready for 1-click recovery in our Workbench. Three Tamil clips (<code>clp_0012</code>, <code>clp_0035</code>, <code>clp_0095</code>) share the exact same sentence across 3 speakers (great for A/B comparison, but must be deduplicated across train/test splits). Finally, 15 clips remain unreviewed (7 unassigned + 8 assigned pending).</p>
          </div>
        </div>
      `;
      findingsModal.classList.remove('hidden');

      document.getElementById('close-findings-modal-btn').addEventListener('click', () => {
        findingsModal.classList.add('hidden');
      });

      findingsContent.querySelectorAll('[data-finding-link]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.findingLink;
          findingsModal.classList.add('hidden');
          resetFilters();
          if (target === 'ann_03') state.filters.annotator = 'ann_03';
          else if (target === 'rate_anomaly') state.filters.flag = 'rate_anomaly';
          else if (target === 'vendor_b_ta') {
            state.filters.language = 'ta';
            state.filters.source = 'vendor_b';
          } else if (target === 'script_mismatch') state.filters.flag = 'script_mismatch';
          else if (target === 'duplicate_transcript') state.filters.flag = 'duplicate_transcript';
          navigateToScreen('explorer');
        });
      });
    });
  }
}

function renderAbCompareModal(clipIdA, clipIdB) {
  const modal = document.getElementById('ab-compare-modal');
  const content = document.getElementById('ab-compare-content');
  if (!modal || !content) return;

  const clipA = state.enrichedClips.find((c) => c.id === clipIdA) || state.enrichedClips[11];
  const clipB = state.enrichedClips.find((c) => c.id === clipIdB) || state.enrichedClips[94];

  const optionsA = state.enrichedClips
    .map((c) => `<option value="${c.id}" ${c.id === clipA.id ? 'selected' : ''}>${c.id} (${c.language.toUpperCase()} • ${c.source} • ${c.speaker_id})</option>`)
    .join('');
  const optionsB = state.enrichedClips
    .map((c) => `<option value="${c.id}" ${c.id === clipB.id ? 'selected' : ''}>${c.id} (${c.language.toUpperCase()} • ${c.source} • ${c.speaker_id})</option>`)
    .join('');

  content.innerHTML = `
    <div class="modal-header">
      <div>
        <h3>⚖ A/B Side-by-Side Audio &amp; Quality Comparison</h3>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          Compare duplicate sentences across speakers/sources (e.g. <code>clp_0012</code> vendor_b vs <code>clp_0095</code> inhouse_studio)
        </div>
      </div>
      <button type="button" class="modal-close-btn" id="close-ab-modal-btn" aria-label="Close">✕</button>
    </div>

    <div class="dashboard-grid-equal" style="margin-bottom:14px;">
      <div class="panel-card" style="margin-bottom:0;">
        <label class="emplo-label">Clip A Selection</label>
        <select id="ab-select-a" style="width:100%; padding:8px; border-radius:8px; margin:6px 0 12px; border:1px solid var(--border-strong); background:var(--bg-subtle); color:var(--text-dark);">${optionsA}</select>
        <audio id="ab-audio-a" controls src="${clipA.audio_url}" style="width:100%; margin-bottom:10px;"></audio>
        <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
          <span><strong>Source:</strong> ${clipA.source}</span>
          <span><strong>Speaker:</strong> ${clipA.speaker_id}</span>
          <span><strong>SNR:</strong> ${clipA.snr_db !== null ? `${clipA.snr_db} dB` : '—'}</span>
          <span><strong>Clipping:</strong> ${clipA.clipping_pct}%</span>
          <span><strong>Duration:</strong> ${clipA.duration_s}s</span>
          <span><strong>Flags:</strong> ${clipA.all_flags.join(', ') || 'Clean'}</span>
        </div>
        <div style="font-size:0.82rem; padding:10px; background:var(--bg-subtle); border-radius:8px;">${clipA.transcript}</div>
      </div>

      <div class="panel-card" style="margin-bottom:0;">
        <label class="emplo-label">Clip B Selection</label>
        <select id="ab-select-b" style="width:100%; padding:8px; border-radius:8px; margin:6px 0 12px; border:1px solid var(--border-strong); background:var(--bg-subtle); color:var(--text-dark);">${optionsB}</select>
        <audio id="ab-audio-b" controls src="${clipB.audio_url}" style="width:100%; margin-bottom:10px;"></audio>
        <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
          <span><strong>Source:</strong> ${clipB.source}</span>
          <span><strong>Speaker:</strong> ${clipB.speaker_id}</span>
          <span><strong>SNR:</strong> ${clipB.snr_db !== null ? `${clipB.snr_db} dB` : '—'}</span>
          <span><strong>Clipping:</strong> ${clipB.clipping_pct}%</span>
          <span><strong>Duration:</strong> ${clipB.duration_s}s</span>
          <span><strong>Flags:</strong> ${clipB.all_flags.join(', ') || 'Clean'}</span>
        </div>
        <div style="font-size:0.82rem; padding:10px; background:var(--bg-subtle); border-radius:8px;">${clipB.transcript}</div>
      </div>
    </div>

    <div style="display:flex; justify-content:center; gap:12px;">
      <button type="button" class="emplo-login-btn" id="ab-sync-play-btn">▶ Play Both Simultaneously (Synced Start)</button>
      <button type="button" class="ws-utility-btn" id="ab-stop-both-btn">⏹ Stop Both</button>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-ab-modal-btn').addEventListener('click', () => {
    document.getElementById('ab-audio-a').pause();
    document.getElementById('ab-audio-b').pause();
    modal.classList.add('hidden');
  });

  document.getElementById('ab-select-a').addEventListener('change', (e) => {
    renderAbCompareModal(e.target.value, document.getElementById('ab-select-b').value);
  });
  document.getElementById('ab-select-b').addEventListener('change', (e) => {
    renderAbCompareModal(document.getElementById('ab-select-a').value, e.target.value);
  });

  document.getElementById('ab-sync-play-btn').addEventListener('click', () => {
    const a = document.getElementById('ab-audio-a');
    const b = document.getElementById('ab-audio-b');
    a.currentTime = 0;
    b.currentTime = 0;
    a.play();
    b.play();
  });

  document.getElementById('ab-stop-both-btn').addEventListener('click', () => {
    document.getElementById('ab-audio-a').pause();
    document.getElementById('ab-audio-b').pause();
  });
}

// Boot Clip Atlas
window.addEventListener('DOMContentLoaded', initClipAtlas);
