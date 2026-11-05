# Clip Atlas

**A speech data quality dashboard and listening workbench that runs entirely in the browser.**

Clip Atlas helps a data team understand a batch of speech clips in about 30 seconds, then listen to and judge individual clips quickly. Team leads get an admin console that shows who is doing careful work, where quality is slipping, and whether a batch is ready for training.

There is no backend: no server code, no database and no real login. Everything is computed in the browser from the files in this repo.

**Live demo:** https://shashi3002.github.io/clip-atlas/

---

## Contents

- [Run it locally](#run-it-locally)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [What's inside](#whats-inside)
- [Roles and sign-in](#roles-and-sign-in)
- [Quality checks and thresholds](#quality-checks-and-thresholds)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Project structure](#project-structure)
- [Tech choices](#tech-choices)
- [What I'd do next](#what-id-do-next)

---

## Run it locally

Browsers block `fetch()` from `file://` pages, so the folder has to be served over HTTP. Any static file server works. Pick **one** of these:

```bash
npm start
```
Uses `npx serve` (Node.js 18+). Then open **http://localhost:8080**.

```bash
python -m http.server 8080
```
No Node needed. Then open **http://localhost:8080**.

There is no build step and nothing to install beyond Node or Python.

**First steps once it's open**

1. On the sign-in screen pick a role: **Annotator**, **Reviewer** or **Admin**.
2. Pick a team member from `users.json` and press **Sign in as …** (there is no password).
3. To see everything, sign in as **Kiran M. (Admin)**.
4. To start clean, use **Reset Data** on the sign-in screen. It clears verdicts, settings and the activity log saved in this browser.

---

## Deploy to GitHub Pages

The site is plain static files, so GitHub Pages can serve the repo directly.

1. Push the repo to GitHub (the `main` branch).
2. On GitHub open **Settings → Pages**.
3. Under **Build and deployment** choose **Deploy from a branch**, then branch `main` and folder `/ (root)`, and press **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

Every later `git push` to `main` redeploys automatically. The empty `.nojekyll` file tells GitHub Pages to serve the files as they are, without running Jekyll.

All paths in the app are relative, so it works under the `/clip-atlas/` sub-path without changes.

---

## What's inside

### Sign in
A clean "Sign in as…" screen with the three roles from `users.json`. Your choice is remembered in browser storage, and you can switch user at any time from the header.

### 1. Batch Overview: "Is this batch healthy?"
- **Six headline numbers:** total clips, total audio hours, languages, speakers, % reviewed and % flagged (checked against the flagged-% target).
- **Hours by language, split by source**, as stacked bars.
- **Distributions of duration, SNR and CER**, as batch histograms or compared across sources or languages.
- **Annotator panel:** clips reviewed, median review time, keep rate and gold accuracy, with rushed and below-target annotators highlighted.
- **Issue breakdown:** counts for every pipeline flag and derived check, each with its rule written out.
- **Everything is a filter:** clicking a number, bar, histogram bin, annotator or issue opens the clip explorer filtered to that slice.

### 2. Clip Explorer
- A table of all clips, with pagination and a virtualised 50,000-row mode to show it scales.
- Sorting on every column, plus filters for language, source, speaker, annotator, status, flags and numeric ranges (duration, SNR, CER).
- Free-text search over transcripts, ASR text, clip IDs and speakers.
- Inline ▶ playback on every row.
- **Filters and sort live in the URL.** Copy the link, paste it into Slack, and it opens the same view.
- Select rows and send them to the review queue ("review these 40"), or assign them to an annotator.

### 3. Listening Workbench
Everything for one clip on a single page:
- **Audio:** waveform with a playhead, click to seek, play/pause, ±2 s, speed 0.75×–2×, drag on the waveform to loop a region, and a spectrogram toggle. When a clip has no peaks file, the waveform is drawn from the decoded audio.
- **Transcript vs. ASR** side by side, with word-level substitutions, deletions and insertions highlighted.
- **Clip details:** language, speaker, source, SNR, CER, clipping, silence, speaking rate, annotator, and which flags and derived checks fired.
- **Verdict panel:** Keep / Fix transcript / Drop, issue tags (noisy, clipped, wrong language, truncated, wrong transcript, other), a free-text note, and an editable transcript when the verdict is Fix.
- Previous/next within the current filtered queue, with progress ("23 / 140").
- Verdicts are saved in `localStorage` and survive a refresh.

### 4. Admin Console (admins only)
- **Team quality scorecard:** clips done, median review time, keep/fix/drop split, gold accuracy against `gold.json`, reviewer agreement (how often a reviewer or admin who re-judged a clip in the app agreed), a weekly gold-accuracy sparkline, and a Good / Watch / Action needed status chip driven by Settings.
- **Speed vs. gold accuracy:** a scatter plot plus a paired bar chart, so "fast but careless" annotators stand out.
- **Annotator deep dive:** accuracy by week, the issue tags they miss most compared with gold, languages covered, and every clip that disagrees with gold, each with ▶ play and "Open in Workbench".
- **Settings:** all quality thresholds, with "Reset to defaults" and a marker on any value that differs from the default. Changing a value immediately updates flags, status chips and counts across the whole app.
- **Activity and export:** a searchable log of every verdict (who, when, clip, old → new), a review summary, JSON and CSV export, and importing a second reviewer's file with a conflict view where the admin picks the winning verdict.
- **Batch acceptance gate:** a language × source grid where each cell passes or fails against the thresholds. The admin marks each slice Accepted / On hold / Rejected with a reason, and the decisions can be exported.
- **Quality over time:** weekly CER, % flagged and acceptance rate by recording week, for the whole batch or one language.
- **Assignments:** move clips between annotators and track each person's queue progress.

### Extras
A/B compare (two clips side by side with synced playback), a speaker page, a light/dark theme, an in-app findings report, keyboard support and screen-reader labels, and layouts that adapt to laptop and tablet widths.

---

## Roles and sign-in

| Role | Overview | Explorer | Workbench | Admin console |
|---|---|---|---|---|
| annotator | No | Only clips assigned to them | Only their own clips | No |
| reviewer | Yes | Yes | Yes | No |
| admin | Yes | Yes | Yes | Yes |

- People without admin access never see the Admin item in the navigation.
- Opening an admin URL directly shows a polite "You need admin access" page.
- A shared link opened by someone who hasn't signed in shows the sign-in screen first, then opens the shared view.

> This is UI behaviour, not security. All data ships to the browser, so anyone can read `clips.json` directly. Real access control would need a backend that only sends each person their own clips.

---

## Quality checks and thresholds

Defaults are shown below. Every threshold can be changed in **Admin → Settings**, and the whole app recomputes immediately.

**Pipeline flags**

| Flag | Rule |
|---|---|
| `low_snr` | SNR below **15 dB** |
| `clipping` | more than **1%** of samples clipped |
| `long_silence` | silence ratio above **40%** |

**Derived checks** (computed in the browser)

| Check | Rule |
|---|---|
| `rate_anomaly` | speaking rate outside **4–25 characters/second**, or an empty transcript. Catches truncated audio and padded or missing transcripts. |
| `script_mismatch` | fewer than **75%** of the transcript's letters are in the Unicode script expected for the language tag (e.g. a Bengali clip with a Devanagari transcript). |
| `duplicate_transcript` | the same normalised sentence was recorded by more than one speaker (a risk of train/test leakage). |
| `high_cer` | CER above **15%**. |

**Annotator status**

| Status | Rule |
|---|---|
| Action needed | gold accuracy below **65%**, or median review time under **6 s** |
| Watch | gold accuracy below the **80%** target |
| Good | everything else |

Batch-level target: at most **25%** of clips flagged.

---

## Keyboard shortcuts

Press **?** anywhere in the Workbench to see these.

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` / `→` | Seek −2 s / +2 s |
| `[` / `]` | Slower / faster (0.75×–2×) |
| `K` / `F` / `D` | Keep / Fix transcript / Drop |
| `1`–`6` | Toggle issue tags |
| `L` | Loop the selected region |
| `S` | Waveform / spectrogram |
| `Enter` | Save verdict and go to the next clip |
| `J` / `N` | Previous / next clip |
| `Esc` | Close the overlay or leave a text field |

---

## Project structure

```
clip-atlas/
├── index.html            # page shell: sign-in screen, workspace, modals
├── css/
│   ├── styles.css        # base styles and components
│   ├── workspace-mora.css# workspace theme (layout, cards, charts, light/dark)
│   └── signin-tint.css   # sign-in colour adjustments
├── js/
│   └── app.js            # all app logic: data loading, checks, screens, charts
├── clips.json            # the 100-clip batch (unchanged starter data)
├── users.json            # team members and roles
├── gold.json             # expert verdicts for ~50 clips
├── audio/                # one .wav per clip
├── peaks/                # optional precomputed waveform peaks
├── FINDINGS.md           # what the tool revealed about this batch
├── package.json          # `npm start` → local static server
└── .nojekyll             # serve as-is on GitHub Pages
```

The starter data is never modified. Verdicts, settings, gate decisions, assignments and the activity log are stored in the browser's `localStorage`.

---

## Tech choices

- **Plain HTML, CSS and JavaScript, with no framework and no build step.** The brief is front-end only, and a single static folder is the easiest thing to run, review and deploy.
- **Hand-written SVG and Canvas charts** (histograms, stacked bars, scatter plot, sparklines, waveform and spectrogram) instead of a chart library. They stay small, match the design exactly, and are easy to explain line by line.
- **Web Audio API** to decode WAV files and draw a waveform when a clip has no peaks file.
- **Word-level diff** between transcript and ASR, using a dynamic-programming (edit-distance) alignment.
- **URL query parameters** for filters and sort, so any view can be shared as a link.
- **`localStorage`** for verdicts, settings and the activity log, so work survives a refresh with no backend.

---

## What I'd do next

1. **A real backend and logins**, so annotators can only fetch their own clips and verdicts are shared across the team instead of living in one browser.
2. **Scale to 50,000+ clips:** move filtering and the diff into a Web Worker, cache the data in IndexedDB, and load clips page by page.
3. **A minimum-listen gate:** don't allow Keep until most of the clip has been played. This directly targets rushed reviewing.
4. **Click a word in the diff to jump the audio there**, using forced-alignment timestamps.
5. **Automated tests** for the derived checks and the scorecard maths.
