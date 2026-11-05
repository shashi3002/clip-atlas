# FINDINGS.md — What I'd Tell the Data Team About This Batch

**Batch Summary:** 100 speech clips (`0.30 hours` / `18.1 minutes` across 6 Indian languages: `hi`, `bn`, `ta`, `mr`, `te`, `or`, 24 speakers, and 4 sources). While **85% of the batch is reviewed**, auditing the batch in **Clip Atlas** revealed **5 critical quality & operational blockers** that must be resolved before shipping this data to ASR/TTS model training.

---

### 1. Annotator Quality Failure #1: `ann_03` (Meera K.) is Speed-Clicking Without Listening
* **Filtered View Link:** `?screen=explorer&annotator=ann_03` (or inspect `ann_03` in `?screen=admin`)
* **Evidence:**
  * Meera K. (`ann_03`) was assigned **30 clips** (`hi`, `mr`, `bn` — 30% of the entire batch) and completed 28 of them with a **median review time of just `4.0s` (`2.1s–7.4s`)** on clips that are `11s–21s` long.
  * She marked **89.3% (`25 / 28`) as `keep`**, resulting in a **44.4% Gold Accuracy (`4 / 9` match against `gold.json`)**.
  * Specifically, she marked `clp_0058` (`bn`, which actually contains a Hindi Devanagari transcript and `105.4%` CER) as `keep` in `5.3s`, marked `clp_0051` (`hi`, severely truncated `1.07s` audio with a 168-char transcript) as `keep` in `4.4s`, and missed transcript errors on `clp_0041`, `clp_0087`, and `clp_0094`.
* **What I'd Do About It:**
  1. **Quarantine and re-queue all 28 clips reviewed by `ann_03`** to Reviewer `rev_01` (`Kavya M.`, who covers `hi`, `mr`, `bn`).
  2. **Enforce a minimum playback gate in the Listening Workbench** requiring annotators to listen to at least `60%` of the clip duration (or `≥ 5s`) before the `Keep` button unlocks.

---

### 2. Annotator Quality Failure #2 & Derived Check (`rate_anomaly`): 6 Severely Truncated Clips Missed by `ann_02` (Vikram S.)
* **Filtered View Link:** `?screen=explorer&flag=rate_anomaly` and `?screen=explorer&annotator=ann_02&verdict=gold_disagree`
* **Evidence:**
  * Using our browser-derived speaking-rate check (`chars/sec ∉ [4, 25]` or empty transcript), we identified **6 truncated recordings** (`clp_0020`, `clp_0023`, `clp_0029`, `clp_0042`, `clp_0051`, `clp_0074`) where the WAV audio cuts off abruptly at **`1.04s–1.61s`** (only 1–3 spoken words), while the human transcript contains the full sentence (`91–211` characters, yielding impossible speaking rates of **`79.5–157.0 chars/sec`** and ASR CER of **`81.9%–96.4%`**).
  * Annotator `ann_02` (`Vikram S.`) reviewed 4 of these truncated clips (`clp_0020`, `clp_0023`, `clp_0029`, `clp_0074`) and **approved (`keep`) all 4 of them**, dragging his Gold Accuracy down to **50.0% (`4 / 8`)**.
* **What I'd Do About It:**
  1. **Immediately drop all 6 truncated clips** (`clp_0020`, `clp_0023`, `clp_0029`, `clp_0042`, `clp_0051`, `clp_0074`)—training ASR/TTS on full-sentence text paired with 1.5s cut-off audio causes severe alignment hallucinations.
  2. **Add an automated pre-ingestion gate** rejecting any clip with `chars/sec > 35`, and coach `ann_02` on verifying end-of-utterance audio completeness.

---

### 3. Source Hardware Defect: 100% of Clipping (`10/10`) & 89% of Low SNR (`8/9`) Come from `vendor_b` Tamil (`ta`)
* **Filtered View Link:** `?screen=explorer&language=ta&source=vendor_b`
* **Evidence:**
  * Cross-filtering the **Batch Acceptance Gate** and **SNR/Clipping Distributions** by source reveals that `inhouse_studio` (27 clips) and `vendor_a` (15 clips) have **0 pipeline flags**.
  * In contrast, **10 out of 10 `vendor_b` Tamil (`ta`) clips** (`clp_0003`, `clp_0008`, `clp_0012`, `clp_0020`, `clp_0029`, `clp_0031`, `clp_0035`, `clp_0038`, `clp_0049`, `clp_0063`) fail quality checks, exhibiting hard microphone clipping (`1.62%–5.83%`) and low SNR (`8.5–15.1 dB`). Meanwhile, `vendor_b`'s Hindi, Marathi, and Bengali recordings are clean (`22–31 dB` SNR).
* **What I'd Do About It:**
  1. **Mark the `ta × vendor_b` slice as `Rejected` in the Admin Batch Acceptance Gate** while accepting `vendor_b` for `hi`, `mr`, and `bn`.
  2. **Notify `vendor_b`'s Tamil recording studio** that their microphone pre-amp gain is over-driven and has a noisy floor (`~9 dB` SNR).

---

### 4. Pipeline Script Contamination (`script_mismatch`): 4 Bengali (`bn`) Clips Have Hindi Devanagari Transcripts
* **Filtered View Link:** `?screen=explorer&flag=script_mismatch`
* **Evidence:**
  * Our browser-derived Unicode script validator detected **4 clips tagged `language: "bn"` (Bengali)** whose human transcripts are written in **Hindi Devanagari (`\u0900–\u097F`)** instead of Bengali (`\u0980–\u09FF`): `clp_0017`, `clp_0037` (unassigned), `clp_0058`, and `clp_0060`.
  * Because the Bengali ASR model decoded Hindi speech/prompts into garbled Bengali characters, these 4 clips have **CER between `94.4%` and `105.4%`**.
* **What I'd Do About It:**
  1. **Drop `clp_0017`, `clp_0037`, `clp_0058`, and `clp_0060` from the Bengali training split** (or re-route them to the Hindi split after verifying the spoken language in the Workbench).
  2. **Add a Unicode script regex check at prompt-assignment time** so Devanagari prompts can never be injected into Bengali recording sessions.

---

### 5. Recoverable Empty Transcripts, Duplicate Prompts Across Speakers & Missing Metadata
* **Filtered View Links:**
  * Empty transcripts: `?screen=explorer&flag=rate_anomaly&minDur=5` (`clp_0066`, `clp_0096`)
  * Duplicate prompts: `?screen=explorer&flag=duplicate_transcript` (`clp_0012`, `clp_0035`, `clp_0095`)
* **Evidence:**
  * **2 clips (`clp_0066` in Tamil, `clp_0096` in Odia)** have clean audio (`18.2 dB` and `21.9 dB` SNR) and valid ASR hypotheses, but their human `transcript` field is empty (`""`).
  * **3 Tamil clips (`clp_0012`, `clp_0035`, `clp_0095`)** contain the exact same normalized sentence spoken by 3 different speakers (`spk_0246`, `spk_0723`, `spk_0460`).
  * **5 clips (`clp_0013`, `clp_0015`, `clp_0046`, `clp_0049`, `clp_0063`)** have `peaks_url: null` (handled seamlessly via our Web Audio API WAV decoder), **2 clips (`clp_0026`, `clp_0041`)** have `snr_db: null`, and **2 clips (`clp_0040`, `clp_0095`)** have `asr_hypothesis: null`.
* **What I'd Do About It:**
  1. Use the **"← Copy ASR Hypothesis"** button in the Listening Workbench on `clp_0066` and `clp_0096` to human-verify and save the missing transcripts (`Fix` verdict) rather than discarding 27.7 seconds of clean speech.
  2. Group duplicate transcripts by normalized text hash before train/validation/test splitting to prevent **data leakage** between splits.
