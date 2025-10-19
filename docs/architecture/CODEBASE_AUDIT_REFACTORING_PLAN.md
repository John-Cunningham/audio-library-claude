# Codebase Audit & Refactoring Plan

**Date**: 2025-10-18
**Current app.js**: 2,052 lines
**Goal**: Reduce to <1,500 lines, improve modularity, prepare for multi-view architecture

---

## Executive Summary

App.js still has **~850 lines of loop/cycle state** that should be extracted. The main opportunity is to create a **LoopStateManager** module (similar to StemStateManager) to centralize all loop-related state.

### Priority Recommendations

1. **HIGHEST PRIORITY**: Extract loop state to LoopStateManager (~850 lines reduction)
2. **HIGH PRIORITY**: Extract player state to PlayerStateManager (~200 lines reduction)
3. **MEDIUM PRIORITY**: Clean up window object exposure (lines 1870-2052, ~180 lines)
4. **LOWER PRIORITY**: Extract advanced rate mode placeholders

---

## Current State Analysis

### ✅ Already Extracted (Good)
- Stem state → `StemStateManager` (162 lines extracted)
- Tag management → `TagManager` module
- File list rendering → `FileListRenderer`
- Loop control logic → `LoopControls` module (pure functions)
- Metronome → `Metronome` module
- Upload workflow → `UploadManager`
- Batch operations → `BatchOperations`
- File processing → `FileProcessor`
- Marker system → `MarkerSystem`, `StemMarkerSystem`
- Action recording → `ActionRecorder` service
- File loading → `FileLoader` service
- Player components → `PlayerBarComponent`, `WaveformComponent`

### ❌ Still in app.js (Needs Extraction)

## Priority 1: Loop State Extraction

**Lines**: 70-90 (loop state variables ~20 lines)
**Additional**: Lines 806-1087 (loop control wrappers ~280 lines)
**Window exposure**: Lines 1890-1914 (loop state window exposure ~25 lines)
**Total Impact**: ~325 lines direct + architectural improvement

### Current Loop State in app.js:
```javascript
// Lines 70-90
let loopStart = null;
let loopEnd = null;
let cycleMode = false;
let nextClickSets = 'start';
let immediateJump = 'off';
let pendingJumpTarget = null;
let seekOnClick = 'off';
let loopControlsExpanded = false;
let loopFadesEnabled = false;
let fadeTime = 0.015;
let preserveLoopOnFileChange = true;
let preservedLoopStartBar = null;
let preservedLoopEndBar = null;
let preservedCycleMode = false;
let preservedPlaybackPositionInLoop = null;
let bpmLockEnabled = false;
let lockedBPM = null;
```

### Why Extract?
- **State persistence**: Loop settings should persist across view switches
- **Centralized management**: All loop state in one place
- **Reusability**: Loop controls work in Library, Galaxy, Sphere views
- **Clarity**: Separation of concerns (app.js orchestrates, LoopStateManager owns state)

### Proposed Module: `LoopStateManager.js`

**Location**: `/src/state/loopStateManager.js`

**API**:
```javascript
// Getters
export function getLoopState()
export function getLoopStart()
export function getLoopEnd()
export function getCycleMode()
export function getImmediateJump()
export function getSeekOnClick()
// ... etc

// Setters
export function setLoopStart(value)
export function setLoopEnd(value)
export function setCycleMode(value)
// ... etc

// Convenience
export function hasActiveLoop()
export function clearLoop()
export function getPreservedLoopState()
export function debugPrintState()
```

**Benefits**:
- ~325 lines removed from app.js
- Multi-view loop persistence (set loop in Library, persist to Galaxy)
- Clean API for loop state access
- Single source of truth

---

## Priority 2: Player State Extraction

**Lines**: 40-60, 64-68, 81-82, 99-108 (~40 lines of player state)
**Additional**: Lines 1122-1533 (player control functions ~400 lines)
**Total Impact**: ~200 lines useful extraction

### Current Player State in app.js:
```javascript
// Core player state
let wavesurfer = null;
let parentWaveform = null;
let parentPlayerComponent = null;
let currentFileId = null;
let currentRate = 1;
let isLooping = false;
let isShuffling = false;
let isMuted = false;
let volumeBeforeMute = 100;
let userPaused = false;

// Markers
let markersEnabled = true;
let markerFrequency = 'bar';
let currentMarkers = [];
let barStartOffset = 0;

// Filters & sorting
let filters = { canHave, mustHave, exclude };
let sortBy = 'date';
let sortOrder = 'desc';
```

### Why Extract?
- **Multi-view**: Player state should persist when switching views
- **Component isolation**: Player state belongs with player, not app orchestrator
- **Testability**: Easier to test player state in isolation

### Proposed Module: `PlayerStateManager.js`

**Location**: `/src/state/playerStateManager.js`

**API**:
```javascript
// Player instance
export function getWavesurfer()
export function setWavesurfer(ws)
export function getCurrentFileId()
export function setCurrentFileId(id)

// Playback state
export function getPlaybackState() // { isPlaying, rate, volume, isMuted }
export function setPlaybackRate(rate)
export function setVolume(volume)

// Markers
export function getMarkerState()
export function setMarkersEnabled(enabled)

// Filters/sorting
export function getFilters()
export function setFilter(type, values)
export function getSortOptions()
```

**Benefits**:
- ~200 lines removed from app.js
- Player state persists across views
- Cleaner separation of concerns

---

## Priority 3: Window Object Cleanup

**Lines**: 1870-2052 (~180 lines of window object exposure)

### Current Issue:
Massive block of window object assignments for HTML onclick handlers.

### Why Clean Up?
- **Legacy code**: Required for HTML onclick handlers, but messy
- **Better pattern**: Use event delegation or data attributes
- **Maintainability**: Hard to track what's exposed globally

### Proposed Solution:
Create a **WindowBridge** module that centralizes window exposure.

**Location**: `/src/core/windowBridge.js`

```javascript
/**
 * WindowBridge - Centralized window object exposure
 * Required for HTML onclick handlers until we migrate to event delegation
 */

export function exposeToWindow(app) {
    // Player controls
    window.playPause = app.playPause;
    window.nextTrack = app.nextTrack;
    // ... etc

    // Tag manager
    window.tagManagerHandleClick = (tag, event) => TagManager.handleClick(tag, event);
    // ... etc
}
```

**Benefits**:
- ~180 lines removed from app.js
- Clear documentation of global exposure
- Easier to migrate away from window objects later

---

## Priority 4: Advanced Rate Mode Cleanup

**Lines**: 1355-1431 (~76 lines of placeholder code)

### Current Issue:
Placeholder code for Signalsmith Stretch integration (speed/pitch separation).

### Why Extract?
- **Not implemented**: Just placeholders, adds noise
- **Future feature**: Should be in separate module when implemented

### Proposed Solution:
Either:
1. **Remove entirely** (just placeholders, add back when implementing)
2. **Extract to module**: `/src/features/advancedRate.js` (future feature)

**Benefits**:
- ~76 lines removed from app.js
- Cleaner code, less noise

---

## Estimated Impact

### After All Extractions:
- **Current**: 2,052 lines
- **After loop state**: ~1,727 lines (-325)
- **After player state**: ~1,527 lines (-200)
- **After window cleanup**: ~1,347 lines (-180)
- **After rate mode**: ~1,271 lines (-76)

**Final target**: **~1,270 lines** (down from 2,052, **38% reduction**)

---

## Recommended Extraction Order

### Phase 1: Loop State (HIGHEST PRIORITY)
**Why first?**
- Biggest impact (~325 lines)
- Critical for multi-view architecture
- Loop controls already modular (LoopControls.js)

**Steps**:
1. Create `LoopStateManager.js`
2. Extract state variables
3. Add sync functions (hybrid pattern like StemState)
4. Update app.js to use LoopState API
5. Update FileLoader, ActionRecorder to use LoopState
6. Test all loop functionality

**Time estimate**: 1-2 hours
**Risk**: Medium (touches FileLoader, ActionRecorder)

### Phase 2: Player State (HIGH PRIORITY)
**Why second?**
- Significant impact (~200 lines)
- Enables multi-view player persistence
- Natural extension after loop state

**Steps**:
1. Create `PlayerStateManager.js`
2. Extract player state variables
3. Add sync functions
4. Update app.js, FileLoader, ViewManager
5. Test playback, markers, volume, rate

**Time estimate**: 1 hour
**Risk**: Low (mostly getters/setters)

### Phase 3: Window Bridge (MEDIUM PRIORITY)
**Why third?**
- Moderate impact (~180 lines)
- Cleanup/organization, not architecture
- Low risk

**Steps**:
1. Create `windowBridge.js`
2. Move all window.* assignments
3. Call exposeToWindow(app) at end of app.js
4. Test HTML onclick handlers

**Time estimate**: 30 minutes
**Risk**: Very low (just reorganization)

### Phase 4: Rate Mode Cleanup (OPTIONAL)
**Why last?**
- Small impact (~76 lines)
- Placeholder code, not critical

**Steps**:
1. Decide: remove or extract?
2. If extract: create `advancedRate.js`
3. If remove: just delete, add TODO

**Time estimate**: 15 minutes
**Risk**: None (unused code)

---

## Architecture Goals

### Before (Current):
```
app.js (2,052 lines)
├── All loop state
├── All player state
├── 180 lines of window exposure
├── Placeholder rate mode code
└── Orchestration logic
```

### After (Target):
```
app.js (1,270 lines) - ORCHESTRATION ONLY
├── View management
├── Module initialization
└── Coordination logic

/src/state/
├── stemStateManager.js (413 lines) ✅
├── loopStateManager.js (350 lines) 🎯
└── playerStateManager.js (250 lines) 🎯

/src/core/
└── windowBridge.js (200 lines) 🎯
```

---

## Best Practices Applied

### ✅ Component-Based Architecture
- PlayerBarComponent, WaveformComponent classes
- Reusable across parent and stems

### ✅ Service-Based Architecture
- FileLoader, ActionRecorder services
- Dependency injection pattern

### ✅ Pure Function Modules
- LoopControls, MarkerSystem modules
- No side effects, testable

### ✅ State Managers (NEW)
- StemStateManager ✅ (completed)
- LoopStateManager 🎯 (next)
- PlayerStateManager 🎯 (after)

### ✅ Multi-View Ready
- State persists across Library ↔ Galaxy ↔ Sphere
- Components work in any view

---

## Success Criteria

### Technical:
- [ ] app.js < 1,500 lines
- [ ] All state in dedicated managers
- [ ] No state variables in app.js (only references)
- [ ] Clean window object exposure
- [ ] Multi-view architecture enabled

### Functional:
- [ ] All current functionality preserved
- [ ] No regressions in tests
- [ ] Performance maintained or improved
- [ ] Code is more maintainable

---

## Next Steps

**Immediate recommendation**: Extract loop state to LoopStateManager.

**Why?**
1. **Biggest impact**: 325 lines removed
2. **Most important**: Enables multi-view loop persistence
3. **Clear boundary**: Loop controls already modular
4. **Well-understood**: Same pattern as StemStateManager

**Alternative**: If you want a quicker win, start with Window Bridge cleanup (low risk, fast).

---

## Questions for User

1. **Priority**: Start with loop state extraction (biggest impact) or window bridge (quick win)?
2. **Scope**: Do all 4 phases now, or just Phase 1 (loop state)?
3. **Testing**: Should we update test plans after each extraction?
4. **Documentation**: Update architecture docs after each phase or at the end?

---

**Recommendation**: Start with **Phase 1: Loop State Extraction** for maximum architectural benefit.
