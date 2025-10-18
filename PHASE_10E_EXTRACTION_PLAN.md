# Phase 10e: Complete Stem Code Extraction Plan

**Date**: 2025-10-18
**Goal**: Extract all remaining stem code from app.js to stemPlayerManager.js
**Expected Result**: app.js: 2,670 → 1,895 lines (-775 lines)

---

## Executive Summary

**Current State**:
- 30 stem functions still in app.js (not yet thin wrappers)
- ~775 lines of stem code to extract
- stemPlayerManager.js exists and is partially used (11 functions already wrapped)

**Target State**:
- All stem logic in stemPlayerManager.js
- Only thin wrappers + state variables in app.js
- Clear separation of concerns

---

## 30 Functions to Extract

### Category 1: Core Playback Controls (8 functions, ~200 lines)

| Function | Lines | Location | Complexity |
|----------|-------|----------|------------|
| `updateStemAudioState()` | 64 | app.js:244 | High - solo/mute logic |
| `playAllStems()` | 14 | app.js:772 | Low |
| `pauseAllStems()` | 21 | app.js:786 | Low |
| `setupParentStemSync()` | 86 | app.js:807 | High - event handlers |
| `toggleMultiStemPlay()` | 5 | app.js:932 | Low |
| `toggleMultiStemMute()` | 4 | app.js:937 | Low |
| `toggleMultiStemLoop()` | 6 | app.js:941 | Low |
| `destroyMultiStemPlayerWavesurfers()` | 39 | app.js:893 | Medium |

**Dependencies**: wavesurfer, stemPlayerWavesurfers, stemWavesurfers, stemFiles, stemMuted, stemSoloed, stemVolumes

### Category 2: Stem Cycle Mode (5 functions, ~215 lines) 🎯 HIGH PRIORITY

| Function | Lines | Location | Complexity |
|----------|-------|----------|------------|
| `setupStemCycleModeClickHandler()` | 99 | app.js:993 | High - event handling |
| `updateStemLoopVisuals()` | 39 | app.js:1092 | Medium - UI updates |
| `updateStemLoopRegion()` | 31 | app.js:1131 | Medium - DOM manipulation |
| `toggleStemCycleMode()` | 36 | app.js:957 | Medium |
| `setStemLoopRegion()` | 10 | app.js:947 | Low |

**Dependencies**: stemLoopStates, stemCycleModes, stemNextClickSets, Utils.formatTime()

### Category 3: UI Rendering (2 functions, ~64 lines)

| Function | Lines | Location | Complexity |
|----------|-------|----------|------------|
| `generateMultiStemPlayerUI()` | 15 | app.js:725 | Low - already has partial wrapper |
| `renderStemWaveforms()` | 49 | app.js:1185 | Medium - DOM generation |
| `restoreStemControlStates()` | 36 | app.js:1234 | Medium |

**Dependencies**: stemFiles, audioFiles, generateStemPlayerBar, stemVolumes, stemMuted, stemSoloed

### Category 4: Volume/Rate Controls (5 functions, ~50 lines)

| Function | Lines | Location | Complexity |
|----------|-------|----------|------------|
| `handleMultiStemVolumeChange()` | 8 | app.js:1162 | Low |
| `handleStemRateChange()` | 5 | app.js:1170 | Low |
| `setStemRatePreset()` | 5 | app.js:1175 | Low |
| `toggleStemRateLock()` | 5 | app.js:1180 | Low |
| `handleStemVolumeChange()` | 19 | app.js:2050 | Low - OLD system |

**Dependencies**: stemIndependentRates, stemRateLocked, currentParentFileBPM, stemVolumes

### Category 5: Stem Markers (7 functions, ~100 lines)

| Function | Lines | Location | Complexity |
|----------|-------|----------|------------|
| `toggleStemMarkers()` | 8 | app.js:1338 | Low |
| `setStemMarkerFrequency()` | 7 | app.js:1345 | Low |
| `shiftStemBarStartLeft()` | 7 | app.js:1352 | Low |
| `shiftStemBarStartRight()` | 7 | app.js:1359 | Low |
| `addStemBarMarkers()` | 19 | app.js:1366 | Medium |
| `findStemNearestMarkerToLeft()` | 21 | app.js:1385 | Medium |

**Dependencies**: stemMarkersEnabled, stemMarkerFrequency, stemBarStartOffset, stemPlayerComponents

**Note**: Consider moving these to stemMarkerSystem.js instead of stemPlayerManager.js

### Category 6: OLD Stem System (3 functions, ~60 lines)

| Function | Lines | Location | Complexity |
|----------|-------|----------|------------|
| `handleStemMute()` | 19 | app.js:2069 | Low - legacy |
| `handleStemSolo()` | 19 | app.js:2088 | Low - legacy |

**Note**: OLD system functions - may be safe to delete if not used

### Category 7: Keep in app.js (1 function)

| Function | Lines | Location | Reason |
|----------|-------|----------|---------|
| `generateStems()` | 26 | app.js:1270 | File processing integration |

---

## Extraction Strategy

### Phase 1: Prepare stemPlayerManager.js

1. **Add new exports** to stemPlayerManager.js for all 30 functions
2. **Group functions by category** within the file
3. **Document dependencies** in comments

### Phase 2: Extract by Category (Do in Order)

Execute extractions in this order for safety:

#### Step 1: Volume/Rate Controls (Easiest - 5 functions, ~50 lines)
- Low complexity, clear dependencies
- Good warm-up for extraction process
- Test: Volume sliders, rate controls

#### Step 2: Core Playback Controls (8 functions, ~200 lines)
- Essential functionality
- Test after each function
- Test: Play/pause, mute, destroy

#### Step 3: UI Rendering (2 functions, ~64 lines)
- Medium complexity
- Test: Stem player UI generation

#### Step 4: Stem Cycle Mode (5 functions, ~215 lines) 🎯 HIGHEST IMPACT
- Largest single category
- Most complex (event handlers, UI updates)
- Test thoroughly: Click handlers, loop visuals

#### Step 5: Stem Markers (Optional - 7 functions, ~100 lines)
- Consider moving to stemMarkerSystem.js instead
- Test: Marker visibility, frequency changes

### Phase 3: Create Thin Wrappers in app.js

For each extracted function, create a thin wrapper:

```javascript
// THIN WRAPPER: Delegates to StemPlayerManager
function functionName(params) {
    return StemPlayerManager.functionName({
        // State from app.js
        wavesurfer,
        stemPlayerWavesurfers,
        // ... other dependencies
    }, params);
}
```

### Phase 4: Update State Management

**Pattern learned from FileLoader and ActionRecorder**:

1. **Keep state variables in app.js** (single source of truth)
2. **Pass state via function parameters**
3. **Return new state values from module functions**
4. **Use getter functions for lazy dependencies**

Example:
```javascript
// In stemPlayerManager.js
export function playAllStems(state) {
    const { stemPlayerWavesurfers } = state;
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    
    stemTypes.forEach(stemType => {
        const ws = stemPlayerWavesurfers[stemType];
        if (ws) {
            ws.play();
            const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
            if (icon) icon.textContent = '||';
        }
    });
}

// In app.js (thin wrapper)
function playAllStems() {
    StemPlayerManager.playAllStems({ stemPlayerWavesurfers });
}
```

---

## State Variables in app.js

**Keep these in app.js** (don't move):

```javascript
// Multi-stem player state
let stemPlayerWavesurfers = {};
let stemPlayerComponents = {};
let multiStemPlayerExpanded = false;
let multiStemReadyCount = 0;
let multiStemAutoPlayOnReady = false;
let stemsPreloaded = false;

// Stem control state
let stemIndependentRates = {};
let stemRateLocked = {};
let stemPlaybackIndependent = {};
let stemVolumes = {};
let stemMuted = {};
let stemSoloed = {};

// Stem loop state
let stemLoopStates = {};
let stemCycleModes = {};
let stemNextClickSets = {};

// Stem marker state
let stemMarkersEnabled = {};
let stemMarkerFrequency = 'bar';
let stemBarStartOffset = 0;

// OLD stem system state
let stemWavesurfers = {};
let stemFiles = {};
let allStemFiles = {};

// Parent file BPM
let currentParentFileBPM = null;
```

---

## Testing Checklist

After each category extraction, test:

### Category 1: Core Playback Controls
- [ ] Play all stems button works
- [ ] Pause all stems button works
- [ ] Parent-stem sync works (play, pause, seek)
- [ ] Destroy stems cleans up properly
- [ ] Solo/mute logic works correctly

### Category 2: Stem Cycle Mode
- [ ] Cycle mode toggle works
- [ ] Click to set loop start works
- [ ] Click to set loop end works
- [ ] Click to adjust loop boundaries works
- [ ] Loop visuals update correctly
- [ ] Loop region shows/hides properly

### Category 3: UI Rendering
- [ ] Multi-stem player UI generates correctly
- [ ] Stem waveforms render
- [ ] Control states restore after file change

### Category 4: Volume/Rate Controls
- [ ] Master volume affects stems
- [ ] Individual stem volume sliders work
- [ ] Rate changes work
- [ ] Rate presets work
- [ ] Rate lock toggle works

### Category 5: Stem Markers
- [ ] Marker toggle works
- [ ] Marker frequency changes work
- [ ] Bar start offset shifts work
- [ ] Markers render on stems

---

## Key Lessons from Previous Extractions

### From FileLoader (Phase 6):
1. **Use getter functions for lazy dependencies**
   ```javascript
   getParentPlayerComponent: () => parentPlayerComponent
   ```
   Not: `parentPlayerComponent: parentPlayerComponent` (will be null!)

2. **Return new state from service functions**
   ```javascript
   const result = await FileLoader.loadFile(fileId);
   currentFileId = result.newFileId;
   ```

3. **Keep thin wrappers for HTML onclick compatibility**

### From ActionRecorder (Phase 10a):
1. **Service class pattern works well for complex features**
2. **Dependency injection in constructor**
3. **State callbacks for integration points**
4. **Update button states in service, not app.js**

### From TagManager:
1. **Module exports with init() function**
2. **Callback pattern for app.js communication**
3. **State getters/setters pattern**

---

## Potential Issues & Solutions

### Issue 1: Circular Dependencies
**Problem**: stemPlayerManager might need to call functions in app.js
**Solution**: Pass callbacks as parameters, like ActionRecorder does

### Issue 2: DOM Manipulation
**Problem**: Many stem functions directly manipulate DOM
**Solution**: Keep DOM code in module (it's fine), just pass state

### Issue 3: Window Scope Exposure
**Problem**: HTML onclick handlers need global functions
**Solution**: Keep thin wrappers exposed to window in app.js

### Issue 4: Event Handlers
**Problem**: setupStemCycleModeClickHandler attaches events
**Solution**: Store handler references, clean up in destroy function

### Issue 5: Complex State Dependencies
**Problem**: Functions need many state variables
**Solution**: Pass state as object: `{ wavesurfer, stemPlayerWavesurfers, ... }`

---

## Success Criteria

✅ All 30 functions extracted to stemPlayerManager.js
✅ Thin wrappers created in app.js
✅ All tests passing
✅ No duplication
✅ app.js reduced to ~1,895 lines
✅ Stem functionality works identically

---

## Estimated Time

- Category 1 (Volume/Rate): 30 min
- Category 2 (Core Playback): 1 hour
- Category 3 (UI Rendering): 30 min
- Category 4 (Stem Cycle Mode): 1.5 hours (complex)
- Category 5 (Stem Markers): 45 min (optional)
- Testing & debugging: 1 hour

**Total**: 4-5 hours for complete extraction

---

## Quick Start Commands

```bash
# 1. Verify branch and status
git branch --show-current  # Should be refactor-v28-player-component-architecture
git status  # Should be clean

# 2. Create backup
git add .
git commit -m "Backup before Phase 10e stem extraction"

# 3. Start extraction
# Follow steps in order: Category 1 → 2 → 3 → 4 → (5 optional)
# Commit after each category

# 4. Final verification
wc -l src/core/app.js  # Should be ~1,895 lines
npm start  # Test in browser

# 5. Final commit
git add .
git commit -m "refactor: Complete stem code extraction - Phase 10e"
```

---

## Alternative: Phased Approach

If 4-5 hours is too much for one session, split into smaller phases:

### Phase 10e-1: Volume/Rate + Core Playback (~250 lines, 1.5 hours)
- Categories 1 & 2
- Quick win, good testing

### Phase 10e-2: UI Rendering + Stem Cycle Mode (~280 lines, 2 hours)
- Categories 3 & 4
- More complex but high impact

### Phase 10e-3: Stem Markers (optional) (~100 lines, 1 hour)
- Category 5
- Consider moving to stemMarkerSystem.js

---

## Final Note

This extraction eliminates the remaining duplication and completes the stem code consolidation. After this:

- **app.js**: 1,895 lines (47% reduction from original 3,578)
- **All stem code**: Consolidated in dedicated modules
- **Clear architecture**: Component-based, service layer, thin wrappers
- **Maintainable**: No duplication, clear ownership

The codebase will be in excellent shape! 🎉
