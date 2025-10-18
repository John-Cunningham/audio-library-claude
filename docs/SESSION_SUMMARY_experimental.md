# 📋 AUDIO LIBRARY CLAUDE - SESSION SUMMARY (Version 14)

## 🎯 PROJECT GOAL
Build a full-featured audio library with **individual stem players** - each stem (vocals, drums, bass, other) gets its own complete player with all main player features.

## ✅ COMPLETED (Current Session)

### Phase 4 Step 2A - Background Stem Playback
- Stems load automatically when playing files with `has_stems=true`
- 4 hidden WaveSurfer instances play audio (vocals, drums, bass, other)
- Main WaveSurfer muted (volume=0), shows visual only
- All stems sync with main: play/pause/seek/finish
- Rate and volume sliders affect all stems
- **Known issue**: Phase drift on-the-fly rate changes (deferred)

### Phase 4 Step 2B - Visual Waveforms & Layout
- Real stem waveforms render in expansion UI
- Fixed seeking bug (time→progress conversion)
- Changed layout from 2x2 grid to **vertical stack**
- Layout: `Icon | Label | Waveform━━━━━ | [controls area]`
- Waveform height: 80px, fills horizontal space

## 🚧 NEXT STEPS (In Order)

1. **Add basic controls per stem** (NEXT)
   - Volume slider (0-100%)
   - Mute button 🔇
   - Solo button 🎧 (multi-solo support)
   
2. **Add playback controls per stem**
   - Play/Pause button per stem
   - Independent playback control
   
3. **Add advanced features per stem**
   - Previous/Next bar buttons
   - Rate control
   - Bar markers overlay
   - Cycle/loop controls
   - Current time display

## 🗂️ KEY FILES & FUNCTIONS

### State Variables (app.js lines ~26-31)
```javascript
let stemWavesurfers = {}; // Hidden WaveSurfers for audio playback
let stemFiles = {}; // Stem file data from Supabase
let stemMuted = { vocals: false, drums: false, bass: false, other: false };
let stemSoloed = { vocals: false, drums: false, bass: false, other: false };
let stemVolumes = { vocals: 1.0, drums: 1.0, bass: 1.0, other: 1.0 };
```

### Key Functions
- `fetchStemFiles(parentFileId)` - Query audio_files_stems table
- `loadStems(parentFileId, autoplay)` - Load all 4 stems
- `syncStemsWithMain(autoplay)` - Sync play/pause/seek events
- `updateStemAudioState()` - Apply solo/mute logic
- `renderStemWaveforms(fileId)` - Render visual waveforms in expansion UI

### Stem Expansion HTML (app.js lines ~1743-1805)
Vertical stack layout with placeholders for controls

## 🐛 KNOWN ISSUES
- Phase drift on rate changes (deferred - workaround: pause/play)
- Seeking works correctly (time→progress conversion fixed in v13)

## 📊 DATABASE STRUCTURE
- `audio_files` table: `has_stems` boolean
- `audio_files_stems` table: `audio_file_id`, `stem_type`, `file_url`
- Stem types: "vocals", "drums", "bass", "other"

## 💡 CRITICAL FIXES TO REMEMBER
1. **Seeking**: WaveSurfer 'seeking' event passes SECONDS, but seekTo() needs RATIO (0-1)
   ```javascript
   const progress = currentTime / duration;
   stemWS.seekTo(progress);
   ```

2. **Solo logic**: Multi-solo support - if ANY stem soloed, only soloed play
3. **Main WaveSurfer**: Always muted (volume=0) when stems playing

## 📁 PROJECT STRUCTURE
- `src/core/app.js` - Main application logic (4700+ lines)
- `src/core/config.js` - Supabase configuration
- `src/core/utils.js` - Utility functions
- `src/core/metronome.js` - Metronome functionality
- `src/core/viewManager.js` - View switching system
- `src/views/libraryView.js` - Library view module
- `index.html` - Main HTML with view tabs
- `CHANGELOG.txt` - Complete version history
- `src/core/app.js Backups/` - Version backups (app_v1.js to app_v20.js)

## 🔧 DEVELOPMENT SETUP
- Server: `python3 -m http.server 5500`
- URL: http://localhost:5500
- Git repo: https://github.com/John-Cunningham/audio-library-claude.git
- Latest backup: app_v20.js
- Latest commit: 6048e44

## 📝 IF AUTO-COMPACT OCCURS
1. Read this SESSION_SUMMARY.md file first
2. Read CHANGELOG.txt (especially Version 7-14)
3. Check latest backup in `src/core/app.js Backups/`
4. Continue with next step: Add volume/mute/solo controls per stem
