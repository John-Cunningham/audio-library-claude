# Session Handoff - Cycle Mode Fix

## Current Issue
Player refactored to use PlayerBarComponent. Markers work, but **cycle mode is broken**:
- Clicking waveform should snap to nearest marker (doesn't work)
- Cycle mode should set loop start/end on clicks (doesn't work)

## What We've Done
1. ✅ Refactored markers into PlayerBarComponent (commit 089b476)
2. ✅ Added sync bridge: component → global state (commit 86ca6fd, 38033ef)
3. ❌ Cycle mode still not working after fixes

## The Problem
PlayerBarComponent manages `this.currentMarkers` and `this.markersEnabled`, but app.js waveform click handler (line 3677-3773) needs access to this data for:
- Snap-to-marker on waveform clicks
- Cycle mode loop point setting

## Current Bridge (may not be working)
```javascript
// Component syncs to global
window.updateCurrentMarkers(this.currentMarkers);
window.updateMarkersEnabled(this.markersEnabled);

// app.js receives updates
window.updateCurrentMarkers = (markers) => { currentMarkers = markers; };
window.updateMarkersEnabled = (enabled) => { markersEnabled = enabled; };
```

## Debug Steps
1. Refresh page, load a file with beatmap
2. Check console for:
   - `[Parent] Syncing 32 markers to global array`
   - `[Global] currentMarkers updated, length: 32`
3. Press C (cycle mode ON)
4. Click waveform - check console for ANY messages
5. Look for errors about click handlers not being installed

## Waveform Click Handler Location
- **File**: `src/core/app.js`
- **Lines**: 3677-3773
- **Key check**: `if (!markersEnabled || currentMarkers.length === 0 || !wavesurfer) return;`

## Likely Issues
1. **Global vars not syncing** - Bridge might be called before window functions defined
2. **Click handler not installed** - Check if it's being attached to waveform container
3. **Event propagation** - WaveSurfer might be intercepting clicks before handler fires

## Fix Options
**Option A** (Quick): Make component expose `getCurrentMarkers()` and `isMarkersEnabled()` methods, call from app.js click handler

**Option B** (Better): Move waveform click handling INTO component completely

## Commands to Run
```bash
cd "/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude"
git log --oneline -10  # See recent commits
git status
```

## Test Cycle Mode
1. Load file with beatmap
2. Press C or click CYCLE button
3. Click waveform twice → Should see blue loop region
4. Clicks should snap to nearest marker

## Commits
- 089b476: Fix double event binding
- 86ca6fd: Fix cycle mode (attempt 1)
- 38033ef: Add debug logging

## Branch
experimental-v27-stem-independence

## Key Files
- `src/components/playerBar.js` - Component with marker logic
- `src/core/app.js` - Lines 3677-3773 (waveform click handler)
- `src/core/app.js` - Lines 6460-6467 (sync bridge)
