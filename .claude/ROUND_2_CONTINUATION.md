# ROUND 2 Continuation Guide

## Current Status (As of 2025-10-14)

### ✅ ROUND 1 COMPLETE
- Created `src/core/config.js` (Supabase client, PREF_KEYS)
- Created `src/core/utils.js` (12 utility functions)
- Created `src/core/state.js` (not yet used - for future)
- Modified `app.js` to import config and utils
- All functionality tested and working
- Committed to git (commit: cbceb1b)
- Pushed to GitHub

### 📦 Backup System
All files have Backups folders:
- `src/core/app.js Backups/` (app_v1 through app_v4)
- `src/core/config.js Backups/` (config_v1)
- `src/core/utils.js Backups/` (utils_v1)
- `src/core/state.js Backups/` (state_v1)
- `index.html Backups/` (index_v2, index_v3)

### 🎯 ROUND 2 GOAL
Extract these modules from the 4400-line app.js:

1. **waveformPlayer.js** (~800 lines)
   - `initWaveSurfer()` - Initialize WaveSurfer instance
   - `addBarMarkers()` - Render bar/beat markers on waveform
   - `toggleMarkers()` - Toggle marker visibility
   - `setMarkerFrequency()` - Set marker frequency (bar8, bar4, bar, beat, etc.)
   - `shiftBarStartLeft()` / `shiftBarStartRight()` - Adjust marker alignment
   - Waveform click handling for loop editing

2. **audioEngine.js** (~400 lines)
   - `loadAudio()` - Load audio file into WaveSurfer
   - `playPause()` - Toggle playback
   - `nextTrack()` / `previousTrack()` - Track navigation
   - `setVolume()` / `toggleMute()` / `resetVolume()` - Volume controls
   - `setPlaybackRate()` / `resetRate()` - Playback rate controls
   - `updatePlayerTime()` - Update time display

3. **loopControls.js** (~600 lines)
   - `toggleCycleMode()` - Toggle cycle mode (edit + loop)
   - `toggleSeekOnClick()` - Toggle seek on waveform click
   - `resetLoop()` / `clearLoopKeepCycle()` - Reset loop points
   - `updateLoopVisuals()` - Update loop region display
   - `updateLoopRegion()` - Create/update WaveSurfer loop region
   - `shiftLoopLeft()` / `shiftLoopRight()` - Shift entire loop
   - `halfLoopLength()` / `doubleLoopLength()` - Adjust loop length
   - `moveStartLeft()` / `moveStartRight()` - Adjust loop start
   - `moveEndLeft()` / `moveEndRight()` - Adjust loop end
   - `toggleImmediateJump()` - Toggle immediate jump mode
   - `toggleLoopFades()` / `setFadeTime()` - Loop fade controls
   - `togglePreserveLoop()` / `toggleBPMLock()` - Preservation settings
   - Action recorder functions

4. **metronome.js** (~200 lines)
   - `initMetronomeAudioContext()` - Initialize audio context for metronome
   - `stopAllMetronomeSounds()` - Stop all scheduled sounds
   - `playMetronomeSound()` - Play metronome click
   - `playClickSound()` / `playBeepSound()` / `playWoodSound()` / `playCowbellSound()` - Sound generators
   - `scheduleMetronome()` - Schedule upcoming metronome beats
   - `toggleMetronome()` - Toggle metronome on/off
   - `setMetronomeSound()` - Change metronome sound

### 📝 Approach
Conservative extraction to minimize risk:
1. Create new module files with extracted functions
2. Import modules in app.js
3. Remove duplicate function definitions from app.js
4. Test after each module extraction
5. Create versioned backups (v5, v6, v7, etc.)
6. Commit after successful testing

### 🔗 Module Dependencies
```
app.js (main coordinator)
├── config.js (already done ✅)
├── utils.js (already done ✅)
├── waveformPlayer.js (needs: state vars, utils, config)
├── audioEngine.js (needs: state vars, waveformPlayer)
├── loopControls.js (needs: state vars, waveformPlayer, utils)
└── metronome.js (needs: state vars, audioEngine)
```

### ⚠️ Critical Notes
- Keep ALL window.functionName exposures working (for HTML onclick handlers)
- Test thoroughly after each module extraction
- The app is working perfectly now - don't break it!
- User wants multi-view architecture for Galaxy/Sphere visualizers
- User wants stems expansion feature (like mobile visualizer)

### 🚀 Next Commands
```bash
# Create v5 backup before starting extraction
cp "src/core/app.js" "src/core/app.js Backups/app_v5.js"

# Start local server if needed
python3 -m http.server 5500 --bind 127.0.0.1

# Open browser to test
open "http://localhost:5500"
```

### 📊 Testing Checklist After Each Extraction
- [ ] Page loads without console errors
- [ ] Files load from Supabase (90 files)
- [ ] Tag filtering works
- [ ] File playback works
- [ ] Bar markers toggle
- [ ] Shift controls work
- [ ] Player controls (play/pause/volume/rate)
- [ ] Loop/cycle mode works
- [ ] Metronome works

### 📍 Current Working Directory
```
/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude/
```

### 🌿 Git Info
- Branch: `main`
- Remote: `https://github.com/John-Cunningham/audio-library-claude.git`
- Status: Up to date with origin/main
- Last commit: cbceb1b "Update documentation for ROUND 1 completion"

### 🎯 User's End Goals
1. Complete modularization (ROUNDS 2, 3, 4)
2. Add Galaxy visualizer view
3. Add Sphere visualizer view
4. Add stems expansion feature (expandable stem player bars)
5. Maintain consistent player bar/waveform/controls across all views

---

## Resume Point
Start with ROUND 2 extraction. Be methodical, test after each module, and create backups frequently.
