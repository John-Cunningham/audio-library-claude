# Implementation Guide: Version 27d Full Template System

**Status**: Steps 1-2 COMPLETE, Steps 3-6 IN PROGRESS

## What Has Been Done

### ✅ Step 1: Template Expansion (COMPLETE)
**File**: `src/core/playerTemplate.js`

Added ALL missing control definitions to template:
- Transport controls (Previous, Next, Shuffle) - parent only
- Marker controls (MARKS button, frequency selector, shift buttons, offset display)
- Metronome controls (button + sound selector)
- Cycle/Loop controls (CYCLE, SEEK, CLEAR, loop status, expand button)
- Loop manipulation (shift, expand, half, double, jump, fade, preserve, BPM lock, record/play)

Updated `generateStemPlayerBar()` to use ALL these controls in proper layout matching parent player.

### ✅ Step 2: Per-Stem State Objects (COMPLETE)
**File**: `src/core/app.js` (lines 2269-2381)

Added all per-stem state objects:
```javascript
stemMarkersEnabled, stemMarkerFrequency, stemCurrentMarkers, stemBarStartOffset
stemMetronomeEnabled, stemMetronomeSound
stemSeekOnClick, stemImmediateJump, stemLoopControlsExpanded
stemLoopFadesEnabled, stemFadeTime, stemPreserveLoop, stemBPMLock
stemRecordingActions, stemRecordedActions
stemPreservedLoopStartBar, stemPreservedLoopEndBar
```

## What Needs To Be Done

### 🔨 Step 3: Create Per-Stem Function Wrappers

**Pattern**: For every parent function, create a stem version that:
1. Takes `stemType` as first parameter
2. Uses per-stem state objects instead of global variables
3. Targets stem-specific DOM elements
4. Operates on stem WaveSurfer instance

**Example Pattern**:
```javascript
// Parent function (existing)
function toggleMarkers() {
    markersEnabled = !markersEnabled;
    const btn = document.getElementById('markersBtn');
    if (btn) btn.classList.toggle('active', markersEnabled);
    const file = audioFiles.find(f => f.id === currentFileId);
    if (file) addBarMarkers(file);
}

// Stem version (create this)
function toggleStemMarkers(stemType) {
    stemMarkersEnabled[stemType] = !stemMarkersEnabled[stemType];
    const btn = document.getElementById(`stem-markers-btn-${stemType}`);
    if (btn) btn.classList.toggle('active', stemMarkersEnabled[stemType]);
    const file = audioFiles.find(f => f.id === currentFileId);
    if (file) addStemBarMarkers(stemType, file);
}
```

#### Functions To Create:

**Markers** (insert after line 3901 in app.js):
- `toggleStemMarkers(stemType)`
- `setStemMarkerFrequency(stemType, freq)`
- `getStemShiftIncrement(stemType)`
- `shiftStemBarStartLeft(stemType)`
- `shiftStemBarStartRight(stemType)`
- `addStemBarMarkers(stemType, file)` - renders markers on stem waveform
- `updateStemMarkerDisplay(stemType)`

**Metronome** (find parent metronome functions, adapt):
- `toggleStemMetronome(stemType)`
- `setStemMetronomeSound(stemType, sound)`
- Update stem audioprocess to trigger metronome clicks

**Cycle/Loop** (already have toggleStemCycleMode, add):
- `toggleStemSeekOnClick(stemType)`
- `clearStemLoopKeepCycle(stemType)`
- `toggleStemLoopControlsExpanded(stemType)` - show/hide loop manipulation buttons

**Loop Manipulation**:
- `shiftStemLoopLeft(stemType)`
- `shiftStemLoopRight(stemType)`
- `moveStemStartLeft(stemType)`
- `moveStemEndRight(stemType)`
- `halfStemLoopLength(stemType)`
- `doubleStemLoopLength(stemType)`

**Loop Modes**:
- `toggleStemImmediateJump(stemType)`
- `toggleStemLoopFades(stemType)`
- `setStemFadeTime(stemType, time)`
- `toggleStemPreserveLoop(stemType)`
- `toggleStemBPMLock(stemType)`

**Recording**:
- `toggleStemRecordActions(stemType)`
- `playStemRecordedActions(stemType)`

**Display Updates**:
- `updateStemLoopVisuals(stemType)` - update loop status display, show/hide controls
- `updateStemLoopRegionOverlay(stemType)` - render green/blue loop overlay on stem waveform

### 🔨 Step 4: Wire Up Stem Waveforms

**Location**: In `preloadMultiStemWavesurfers()` after WaveSurfer creation

For each stem WaveSurfer instance:

1. **Add marker rendering**:
```javascript
// After stem WaveSurfer is created
ws.on('ready', () => {
    const file = audioFiles.find(f => f.id === currentFileId);
    if (file && stemMarkersEnabled[stemType]) {
        addStemBarMarkers(stemType, file);
    }
});
```

2. **Add loop region overlay**:
```javascript
ws.on('ready', () => {
    updateStemLoopRegionOverlay(stemType);
});

ws.on('audioprocess', () => {
    updateStemLoopRegionOverlay(stemType);
});
```

3. **Add metronome sync**:
```javascript
ws.on('audioprocess', () => {
    const currentTime = ws.getCurrentTime();
    // If stem metronome enabled, check if should play click
    if (stemMetronomeEnabled[stemType]) {
        checkAndPlayStemMetronomeClick(stemType, currentTime);
    }
});
```

4. **Cycle mode click handler already exists** at lines 2952-3043 (`setupStemCycleModeClickHandler`)

### 🔨 Step 5: Expose All Stem Functions to Window

**Location**: Bottom of app.js (around line 5967)

Add after existing stem function exports:
```javascript
// Version 27d: Full template system exports
window.toggleStemMarkers = toggleStemMarkers;
window.setStemMarkerFrequency = setStemMarkerFrequency;
window.shiftStemBarStartLeft = shiftStemBarStartLeft;
window.shiftStemBarStartRight = shiftStemBarStartRight;

window.toggleStemMetronome = toggleStemMetronome;
window.setStemMetronomeSound = setStemMetronomeSound;

window.toggleStemSeekOnClick = toggleStemSeekOnClick;
window.clearStemLoopKeepCycle = clearStemLoopKeepCycle;
window.toggleStemLoopControlsExpanded = toggleStemLoopControlsExpanded;

window.shiftStemLoopLeft = shiftStemLoopLeft;
window.shiftStemLoopRight = shiftStemLoopRight;
window.moveStemStartLeft = moveStemStartLeft;
window.moveStemEndRight = moveStemEndRight;
window.halfStemLoopLength = halfStemLoopLength;
window.doubleStemLoopLength = doubleStemLoopLength;

window.toggleStemImmediateJump = toggleStemImmediateJump;
window.toggleStemLoopFades = toggleStemLoopFades;
window.setStemFadeTime = setStemFadeTime;
window.toggleStemPreserveLoop = toggleStemPreserveLoop;
window.toggleStemBPMLock = toggleStemBPMLock;

window.toggleStemRecordActions = toggleStemRecordActions;
window.playStemRecordedActions = playStemRecordedActions;
```

### 🔨 Step 6: Update CSS

**File**: `styles/stems.css`

Add styles for new controls:

```css
/* Marker controls in stem players */
.stem-player-btn {
    /* Existing styles */
}

/* Metronome controls */
/* (Already styled by player-btn class) */

/* Loop manipulation container */
#stem-loop-controls-vocals,
#stem-loop-controls-drums,
#stem-loop-controls-bass,
#stem-loop-controls-other {
    /* Hidden by default, shown when expanded */
}

/* Collapsible states */
.stem-expand-btn.expanded {
    transform: rotate(180deg); /* Flip arrow */
}
```

### 🔨 Step 7: Create Backup Before Implementation

```bash
cp src/core/app.js "src/core/app.js Backups/app_v27d_before_full_functions.js"
```

## Implementation Order

1. **Markers first** - Most straightforward, good pattern to establish
2. **Loop manipulation** - Uses existing loop state, just needs controls
3. **Metronome** - Requires audio playback integration
4. **Recording/Playback** - Most complex, do last

## Key Architecture Principles

1. **No bidirectional sync** - Stems don't affect parent (already fixed in Phase 4)
2. **Independence** - Stems with active loops ignore parent pause/seek
3. **Multiplicative** - Parent rate/volume multiply with stem values
4. **Template-driven** - All HTML from playerTemplate.js (already done)
5. **Per-stem state** - Every parent variable has stem equivalent (already done)

## Testing Checklist

After implementation, test:

1. ✅ 4 stem player bars appear with ALL controls visible
2. ⏳ Markers work independently per stem (different frequencies)
3. ⏳ Cycle mode works independently per stem (already working from Phase 4)
4. ⏳ Metronome works independently per stem
5. ⏳ Loop manipulation works per stem
6. ⏳ Parent rate multiplies with stem rates (already working)
7. ⏳ Stems with loops stay independent from parent (already working)
8. ⏳ Loop controls expand/collapse per stem
9. ⏳ Recording/playback works per stem
10. ⏳ Preserve loop/BPM lock work across file changes

## Estimated Code Volume

- **Marker functions**: ~300 lines
- **Metronome functions**: ~150 lines
- **Loop manipulation**: ~400 lines
- **Loop modes**: ~200 lines
- **Recording**: ~250 lines
- **Display updates**: ~200 lines
- **Waveform integration**: ~150 lines
- **Window exports**: ~50 lines

**Total**: ~1700 lines of new code

## Next Steps

The next Claude session should:
1. Read this guide
2. Implement functions in the order specified
3. Test each category before moving to next
4. Only call user when ready for full integration testing

## Files Modified Summary

1. ✅ `src/core/playerTemplate.js` - Added all control definitions + updated generateStemPlayerBar
2. ✅ `src/core/app.js` - Added all per-stem state objects (lines 2269-2381)
3. ⏳ `src/core/app.js` - Need to add ~50 per-stem functions (~1700 lines)
4. ⏳ `src/core/app.js` - Need to wire up stem waveforms with marker/loop/metronome rendering
5. ⏳ `src/core/app.js` - Need to export all functions to window
6. ⏳ `styles/stems.css` - Need to add styles for new controls
7. ⏳ `CHANGELOG.txt` - Document Version 27d completion

---

**Ready to continue implementation.**
