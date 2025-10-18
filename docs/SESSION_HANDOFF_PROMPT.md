# Audio Library Multi-Stem Player - Session Handoff

## Project Overview
Building a modular web app for audio library management with multi-stem playback capabilities.

**Tech Stack:** WaveSurfer.js v7, Supabase, ES6 modules, vanilla JS
**Current Branch:** `experimental`
**Working Directory:** `/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude`

---

## Current Status: Phase 1 Implementation (In Progress)

### What We're Building
A **multi-stem player** embedded in the bottom player bar that allows:
- Seamless switching between parent file and 4 stems (vocals, drums, bass, other)
- Independent control over each stem (volume, rate, cycle, file swapping)
- Gapless audio switching with perfect synchronization
- Persistent across different views (Library, Galaxy, Sphere)

### Critical Files
- `/src/core/app.js` - Main application logic (6000+ lines)
- `/styles/stems.css` - Multi-stem player styling
- `/index.html` - HTML structure with bottom player and multi-stem container
- `/src/core/config.js` - Supabase configuration
- `CHANGELOG.txt` - Detailed version history

### Database Schema
**Supabase Tables:**
- `audio_files`: id, name, file_url, tags[], bpm, key, has_stems, beatmap, chords
- `audio_files_stems`: id, audio_file_id, stem_type, file_url, stem_file_name, bpm, key

**stem_type values:** 'vocals', 'drums', 'bass', 'other'

---

## Architecture: Pre-loaded Silent Stems (Phase 1)

### Core Concept
When user clicks a file with `has_stems=true`:
1. Load parent file (visible waveform in bottom player)
2. **Simultaneously** load 4 stem files (hidden, muted, synced to parent)
3. All 5 audio streams play continuously (some at volume 0)
4. STEMS button toggles which streams are audible (instant, gapless)

### Master-Slave Sync Pattern
- **Parent = Master** - Controls timeline, visible waveform, interactive
- **Stems = Slaves** - Follow parent play/pause/seek/rate changes
- Sync events: `play`, `pause`, `seeking`, `ratechange`, `audioprocess`

### Key Variables (app.js)
```javascript
// Parent player
let wavesurfer = null;              // Main WaveSurfer instance
let currentFileId = null;            // Currently loaded file ID

// Multi-stem player (NEW system)
let stemPlayerWavesurfers = {};      // {vocals: WS, drums: WS, bass: WS, other: WS}
let stemFiles = {};                  // Cached stem file data
let multiStemPlayerExpanded = false; // UI toggle state
let multiStemReadyCount = 0;         // Track loading progress

// OLD stem system (DISABLED - causes double audio)
let stemWavesurfers = {};            // Hidden inline stems (NOT USED)
```

---

## Recent Changes (Versions 19-23)

### Version 19 (e5d9d50)
- Implemented multi-stem player with individual controls
- Added parent-to-stem synchronization
- Play/pause, mute, volume controls per stem

### Version 20 (23fa54a)
- Fixed `formatTime` reference error (Utils.formatTime)
- Fixed layout to keep all parent controls visible

### Version 21 (d44ceaa)
- Implemented seamless audio switching
- Captured parent state before loading stems
- Synced stems to parent position on load

### Version 22 (c763f3c) ⚠️ CRITICAL
- **Fixed double audio** by disabling OLD stem system
- OLD system auto-loaded stems (hidden) causing 8 audio streams
- Disabled at line 4163: `if (false && file.has_stems)`

### Version 23 (29d4ebf)
- Fixed `stemFiles` being empty
- Multi-stem player now fetches stems from Supabase when STEMS button clicked
- Made `generateMultiStemPlayerBars()` async

---

## Current Issues (What You Need to Fix)

### 🐛 Issue 1: Double Audio When Closing Stems
**Problem:** When collapsing stems while playing, both parent + stems play together

**Root Cause:**
- `destroyMultiStemPlayerWavesurfers()` sets parent volume back to 1.0
- But stems continue playing until destroyed (300ms delay)
- Both audible during this window

**Location:** `destroyMultiStemPlayerWavesurfers()` around line 2515

### 🐛 Issue 2: Time Gap When Opening Stems
**Problem:** Stems start behind the beat when STEMS button clicked

**Root Cause:**
- Stems load asynchronously after button click
- By the time they're ready, parent has moved ahead
- Even though we capture parent position, loading delay causes drift

**Location:** `initializeMultiStemPlayerWavesurfers()` around line 2313

---

## Phase 1 Implementation Plan (What to Do Next)

### Step 1: Pre-load Stems in `loadAudio()`
**Location:** `loadAudio()` function around line 4100

**Goal:** Load all 5 audio streams when file loads

**Pseudocode:**
```javascript
async function loadAudio(fileId, autoplay = true) {
    const file = audioFiles.find(f => f.id === fileId);

    // 1. Load parent WaveSurfer (existing code)
    wavesurfer.load(file.file_url);

    // 2. NEW: If file has stems, pre-load them silently
    if (file.has_stems) {
        console.log('Pre-loading stems in background...');

        // Fetch stem files
        const { data } = await supabase
            .from('audio_files_stems')
            .select('*')
            .eq('audio_file_id', fileId);

        // Organize by type
        stemFiles = {};
        data.forEach(stem => stemFiles[stem.stem_type] = stem);

        // Create 4 hidden WaveSurfer instances
        await createHiddenStemWavesurfers();

        // Set up sync immediately
        setupParentStemSync();

        // Show STEMS button
        document.getElementById('stemsBtn').style.display = 'block';
    }
}
```

### Step 2: Create Hidden Stem WaveSurfers
**New Function:** `createHiddenStemWavesurfers()`

**Goal:** Create muted WaveSurfer instances that stay in sync

```javascript
async function createHiddenStemWavesurfers() {
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];

    for (const stemType of stemTypes) {
        const stemFile = stemFiles[stemType];
        if (!stemFile) continue;

        // Create WaveSurfer (can be without visible container initially)
        const ws = WaveSurfer.create({
            container: document.createElement('div'), // Hidden container
            height: 0, // No visual
            // ... other options
        });

        ws.load(stemFile.file_url);
        ws.setVolume(0); // MUTED by default

        stemPlayerWavesurfers[stemType] = ws;

        // Wait for ready
        await new Promise(resolve => ws.once('ready', resolve));
    }

    console.log('All stems pre-loaded and ready');
}
```

### Step 3: Simplify `toggleMultiStemPlayer()`
**Location:** Around line 2197

**Goal:** Just toggle volumes, no loading/destroying

```javascript
function toggleMultiStemPlayer() {
    multiStemPlayerExpanded = !multiStemPlayerExpanded;

    if (multiStemPlayerExpanded) {
        // EXPAND: Switch to stems
        console.log('Switching to stems (instant)');

        // Mute parent
        wavesurfer.setVolume(0);

        // Unmute stems
        const stemTypes = ['vocals', 'drums', 'bass', 'other'];
        stemTypes.forEach(type => {
            const ws = stemPlayerWavesurfers[type];
            if (ws) {
                ws.setVolume(1.0); // Or restore saved volume
            }
        });

        // Generate UI if not already present
        if (!document.querySelector('.stem-player-bar')) {
            generateMultiStemPlayerUI(); // Just HTML, no loading
        }

        // Show UI
        multiStemPlayer.classList.remove('collapsed');
    } else {
        // COLLAPSE: Switch back to parent
        console.log('Switching to parent (instant)');

        // Unmute parent
        const volumeSlider = document.getElementById('volumeSlider');
        const volume = volumeSlider ? volumeSlider.value / 100 : 1.0;
        wavesurfer.setVolume(volume);

        // Mute stems
        const stemTypes = ['vocals', 'drums', 'bass', 'other'];
        stemTypes.forEach(type => {
            const ws = stemPlayerWavesurfers[type];
            if (ws) {
                ws.setVolume(0);
            }
        });

        // Hide UI
        multiStemPlayer.classList.add('collapsed');
    }
}
```

### Step 4: Update `generateMultiStemPlayerBars()`
**Location:** Around line 2241

**Change:** Don't fetch or load stems here, just generate UI

```javascript
function generateMultiStemPlayerUI() {
    // This function now ONLY generates HTML
    // Stems are already loaded
    // Just creates the visual bars and connects to existing WaveSurfers

    const multiStemPlayer = document.getElementById('multiStemPlayer');
    multiStemPlayer.innerHTML = '';

    const stemTypes = ['vocals', 'drums', 'bass', 'other'];

    stemTypes.forEach(stemType => {
        // Generate HTML for stem bar
        // Connect to existing stemPlayerWavesurfers[stemType]
        // No loading here!
    });
}
```

---

## Testing Checklist

After implementing Phase 1, test these scenarios:

### ✅ Gapless Switching
1. Load file with stems, start playing at 30 seconds
2. Click STEMS button
3. **Expected:** Instant switch, no gap, stems start exactly at 30 seconds

### ✅ No Double Audio
1. Expand stems while playing
2. Listen carefully - should only hear stems
3. Collapse stems while playing
4. Should only hear parent (no stem bleed)

### ✅ Sync Accuracy
1. Expand stems, let play for 1 minute
2. Check if stems stay perfectly aligned with parent waveform
3. Seek to different position
4. Verify stems follow immediately

### ✅ Cycle Mode
1. Enable cycle mode, set loop region
2. Expand stems while looping
3. Verify stems loop at same boundaries

---

## User Requirements (Future Features)

### Phase 2: Individual Stem Controls
- Rate slider per stem (independent speed/pitch)
- Cycle mode per stem (independent loop regions)
- Shift controls per stem (bar alignment)
- Previous/Next buttons per stem (file swapping)

### Phase 3: Signal Smith Time-Pitch Stretch
- Reference file: `/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-app-for-netifly/visualizer_for_netifly/2025-10-08/visualizer_V37_mobile.html`
- Lines with stretch implementation to study

### UI Layout Goal
```
┌────────────────────────────────────────────────────────────┐
│ 🎤 Vocals  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [▶][MUTE][SOLO] Rate:[▬] Vol:[▬] 🔊                       │
│ [CYCLE] [◄][►] Loop: 0:00-0:00  Time:[▬] Pitch:[▬]       │
├────────────────────────────────────────────────────────────┤
│ (Same for Drums, Bass, Other)                              │
└────────────────────────────────────────────────────────────┘
```

---

## Version Control Guidelines

### Commit Format
```
<verb> <short description>

<detailed explanation of what changed and why>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Before Every Change
1. Create backup: `cp src/core/app.js "app.js Backups/app_vX.js"`
2. Update CHANGELOG.txt with version number, changes, testing results
3. Commit with descriptive message
4. Update CHANGELOG with git commit hash

---

## Common Pitfalls to Avoid

### ❌ Don't Re-enable Old Stem System
Line 4163: `if (false && file.has_stems)` - Keep this disabled!

### ❌ Don't Destroy Stems on Collapse
Keep stems loaded for instant re-expansion

### ❌ Don't Create New Stems When Expanding
Stems should already exist from file load

### ❌ Watch Out for Volume Conflicts
Multiple places set volume - ensure consistent state

---

## Key Functions Reference

### Parent Player
- `loadAudio(fileId, autoplay)` - Load file (line ~4100)
- `playPause()` - Toggle parent play/pause
- `setPlaybackRate(rate)` - Change playback speed

### Multi-Stem Player
- `toggleMultiStemPlayer()` - Show/hide stems UI (line ~2197)
- `generateMultiStemPlayerBars()` - Create stem UI (line ~2241)
- `initializeMultiStemPlayerWavesurfers()` - Load stems (line ~2313)
- `setupParentStemSync()` - Set up sync events (line ~2459)
- `destroyMultiStemPlayerWavesurfers()` - Clean up (line ~2515)

### Individual Stem Controls
- `toggleMultiStemPlay(stemType)` - Play/pause stem (line ~2531)
- `toggleMultiStemMute(stemType)` - Mute stem (line ~2551)
- `handleMultiStemVolumeChange(stemType, value)` - Volume (line ~2613)

---

## Questions to Ask User

Before implementing new features:
1. Should all stems have synchronized rate by default? Or independent?
2. When swapping a stem file, should it match BPM/key automatically?
3. Should stem settings (volume, mute) persist when switching files?
4. Priority: Independent loops vs time-pitch stretch vs file swapping?

---

## Start Here

1. Read this entire prompt carefully
2. Open `/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude/src/core/app.js`
3. Find `loadAudio()` function (around line 4100)
4. Implement Step 1: Pre-load stems when file loads
5. Test with a file that has stems
6. Proceed to Steps 2-4

**Goal:** Gapless switching + no double audio. Everything else comes later.

Good luck! 🎵
