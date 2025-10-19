# app.js Refactoring Roadmap

**Current Status**: 3,355 lines, 102 functions
**Target**: 2,000-2,500 lines
**Progress**: ~750-1,355 lines to remove

---

## Current State Analysis

### What's Already Extracted ✅

1. **Player Controls** → `PlayerBarComponent` (Phase 5 - COMPLETE)
   - Transport (play/pause)
   - Volume (mute, setVolume)
   - Rate controls (setRate, presets, lock)
   - Marker controls (toggle, frequency, shift)
   - Loop/cycle controls

2. **Marker Systems** → `markerSystem.js`, `stemMarkerSystem.js`
   - Bar/beat marker rendering
   - Marker frequency calculations
   - Snap-to-marker logic

3. **Stem Lifecycle** → `stemPlayerManager.js`
   - Preload, fetch, destroy stems
   - Toggle expand/collapse
   - Create WaveSurfer instances
   - Sync stems with parent

4. **Utilities** → `utils.js`
   - File formatting
   - Time formatting
   - Tag extraction
   - Audio duration calculation

5. **UI Rendering** → Various view modules
   - `fileListRenderer.js` - File list rendering
   - `libraryView.js` - Library view
   - `galaxyView.js` - Galaxy visualization
   - `sphereView.js` - Sphere view

6. **Other Modules**
   - `config.js` - Supabase, preferences
   - `metronome.js` - Metronome logic
   - `keyboardShortcuts.js` - Keyboard handling
   - `tagManager.js` - Tag management
   - `fileProcessor.js` - File processing
   - `batchOperations.js` - Batch file operations
   - `uploadManager.js` - File uploads
   - `loopControls.js` - Loop control UI

---

## What Remains in app.js (3,355 lines)

### Category 1: Core State Management (~200 lines)
**SHOULD STAY** - This is the single source of truth

- Global state variables (lines 34-105)
- State initialization
- State updates from various sources

**Rationale**: app.js coordinates all modules, state must live here

---

### Category 2: File Management (~400 lines)
**CANDIDATES FOR EXTRACTION**

**Functions to Extract:**
```
loadFile(fileId)                    (~200 lines) - LARGE, complex
saveCurrentPlaybackPosition()       (~20 lines)
deleteFile(fileId)                  (~50 lines)
handleFileRename(fileId, event)     (~40 lines)
handleFileDrop(event)               (~30 lines)
handleFileSelection(files)          (~60 lines)
```

**Extraction Target**: `fileManager.js`
- File loading/unloading
- File deletion
- File renaming
- File drop handling
- File selection
- Playback position saving

**Benefits**: ~400 lines removed from app.js

---

### Category 3: WaveSurfer Initialization (~170 lines)
**CANDIDATE FOR EXTRACTION**

**Function:**
```
initWaveSurfer()                    (~170 lines) - VERY LARGE
```

**Current Issues**:
- Handles parent wavesurfer creation
- Sets up all event listeners (play, pause, seeking, finish, ready, audioprocess)
- Loop checking logic
- Metronome scheduling
- Cycle mode handling
- Too much responsibility

**Extraction Options**:

**Option A**: Extract to `waveformComponent.js`
- Create a `WaveformComponent` class similar to `PlayerBarComponent`
- Handles wavesurfer initialization and event management
- Component-based architecture

**Option B**: Extract to `waveformManager.js`
- Pure functions for initialization
- Returns configured wavesurfer instance
- Less invasive, easier extraction

**Recommendation**: Option A (component-based)
- Consistent with PlayerBarComponent architecture
- Better encapsulation
- Reusable across views

**Benefits**: ~170 lines removed from app.js

---

### Category 4: Tag/Filter UI (~300 lines)
**CANDIDATES FOR EXTRACTION**

**Functions to Extract:**
```
setTagMode(mode)                    (~5 lines)
handleTagClick(tag, event)          (~4 lines)
selectAllVisibleTags()              (~4 lines)
deselectAllTags()                   (~5 lines)
renderTags(searchQuery)             (~5 lines) - delegates to TagManager
toggleShowAllTags()                 (~5 lines)
getAllBPMs()                        (~15 lines)
getAllKeys()                        (~15 lines)
handleBPMClick(bpm, event)          (~14 lines)
handleKeyClick(key, event)          (~14 lines)
renderBPMs()                        (~19 lines)
renderKeys()                        (~22 lines)
```

**Current State**: Many are thin wrappers, some have logic

**Extraction Target**: `filterControls.js` or expand `tagManager.js`
- Tag mode management
- Tag selection/deselection
- BPM/Key filter rendering
- Filter click handlers

**Benefits**: ~120 lines removed from app.js (many are already thin)

---

### Category 5: Playback Controls (~200 lines)
**MOSTLY EXTRACTED** - Some cleanup needed

**Remaining Functions:**
```
playPause()                         (~30 lines) - Parent player wrapper
setPlaybackRate(rate)               (~90 lines) - Complex, updates parent + stems
setVolume(value)                    (~10 lines) - Parent player wrapper
toggleMute()                        (~15 lines) - Parent player wrapper
```

**Status**:
- Parent player controls should delegate to `parentPlayerComponent`
- `setPlaybackRate()` is complex because it updates both parent and all stems
- Needs cleanup to use component methods

**Extraction**: Convert to thin wrappers calling `parentPlayerComponent` methods

**Benefits**: ~50 lines cleaned up (already mostly delegated)

---

### Category 6: Stem Functions (~400 lines)
**PARTIALLY EXTRACTED** - More cleanup possible

**Remaining Functions:**
```
destroyAllStems()                   (~19 lines) - Wrapper for StemPlayerManager
createStemWaveSurfer()              (~22 lines) - Wrapper for StemPlayerManager
syncStemsWithMain()                 (~8 lines) - Wrapper for StemPlayerManager
updateStemAudioState()              (~63 lines) - Updates UI based on stem state
generateMultiStemPlayerUI()         (~47 lines) - Generates stem UI HTML
playAllStems()                      (~14 lines) - Plays all stem wavesurfers
pauseAllStems()                     (~21 lines) - Pauses all stem wavesurfers
setupParentStemSync()               (~86 lines) - Sets up parent-stem event sync
destroyMultiStemPlayerWavesurfers() (~39 lines) - Destroys multi-stem UI
toggleStemCycleMode()               (~36 lines) - Already delegates to component
setupStemCycleModeClickHandler()    (~99 lines) - Could move to PlayerBarComponent
updateStemLoopVisuals()             (~39 lines) - Could move to PlayerBarComponent
updateStemLoopRegion()              (~31 lines) - Could move to PlayerBarComponent
renderStemWaveforms()               (~49 lines) - Visual-only waveforms
restoreStemControlStates()          (~36 lines) - Restore UI after re-expansion
```

**Issues**:
- Many thin wrappers (already good)
- Some helpers could move to `StemPlayerManager`
- Loop/cycle helpers could move to `PlayerBarComponent`

**Extraction Opportunities**:
- Move `setupStemCycleModeClickHandler`, `updateStemLoopVisuals`, `updateStemLoopRegion` to `PlayerBarComponent`
- Move `renderStemWaveforms`, `restoreStemControlStates` to `StemPlayerManager`

**Benefits**: ~150 lines removed

---

### Category 7: Stem Generation (~25 lines)
**CANDIDATE FOR EXTRACTION**

**Function:**
```
generateStems(fileId, event)        (~25 lines) - Calls Music.ai API
```

**Extraction Target**: `stemGenerator.js` or move to `StemPlayerManager`

**Benefits**: ~25 lines removed

---

### Category 8: Search/Navigation (~100 lines)
**CANDIDATES FOR EXTRACTION**

**Functions:**
```
handleSearch(query)                 (~6 lines) - Thin wrapper
handleSearchKeydown(e)              (~75 lines) - File navigation, tag selection
scrollToFile(fileId)                (~10 lines) - Scroll to file in list
navigateFiles(direction)            (~10 lines) - Next/prev file
```

**Extraction Target**: `navigationControls.js`
- Search handling
- Keyboard navigation
- File scrolling
- Arrow key navigation

**Benefits**: ~100 lines removed

---

### Category 9: Loop Recording System (~150 lines)
**CANDIDATE FOR EXTRACTION**

**Functions:**
```
startRecording()                    (~20 lines)
stopRecording()                     (~15 lines)
playbackRecording()                 (~35 lines)
stopPlayback()                      (~10 lines)
recordAction(action, data)          (~5 lines)
downloadRecording()                 (~15 lines)
loadRecording(data)                 (~15 lines)
updateRecordingStatus()             (~10 lines)
```

**Extraction Target**: `actionRecorder.js`
- Loop action recording
- Action playback
- Recording download/upload

**Benefits**: ~125 lines removed

---

### Category 10: BPM Calculation (~100 lines)
**CANDIDATE FOR EXTRACTION**

**Function:**
```
calculateBPMFromOnsets(onsets, duration)  (~100 lines) - Complex BPM detection
```

**Extraction Target**: `bpmDetector.js` or `utils.js`

**Benefits**: ~100 lines removed

---

### Category 11: Marker Functions (~300 lines)
**MOSTLY EXTRACTED** - Some wrappers remain

**Remaining Functions:**
```
addBarMarkers(file)                 (~188 lines) - LARGE, should be in component
toggleMarkers()                     (~27 lines) - Wrapper
setMarkerFrequency(freq)            (~12 lines) - Wrapper
shiftBarStartLeft()                 (~13 lines) - Wrapper
shiftBarStartRight()                (~20 lines) - Wrapper

// Stem marker wrappers (thin)
toggleStemMarkers(stemType)         (~21 lines)
setStemMarkerFrequency(stemType)    (~20 lines)
shiftStemBarStartLeft(stemType)     (~23 lines)
shiftStemBarStartRight(stemType)    (~23 lines)
```

**Issues**:
- `addBarMarkers()` is 188 lines and should be in `parentPlayerComponent`
- Many thin wrappers (already good)

**Cleanup**:
- Move `addBarMarkers()` to `parentPlayerComponent.addBarMarkers()`
- Verify thin wrappers delegate correctly

**Benefits**: ~200 lines removed

---

### Category 12: Event Listeners & Initialization (~200 lines)
**SHOULD MOSTLY STAY** - App coordination

**Functions:**
```
document.addEventListener('DOMContentLoaded', ...)  (~50 lines) - App init
window.addEventListener('beforeunload', ...)        (~5 lines) - Cleanup
Various button event listeners                      (~50 lines) - UI bindings
```

**Rationale**: App.js needs to coordinate initialization and bind UI to modules

---

### Category 13: View Management (~100 lines)
**ALREADY EXTRACTED** to `viewManager.js`

**Status**: Good, delegates to view modules

---

## Extraction Priority & Roadmap

### Phase 6: File Management Extraction
**Target**: Extract file operations to `fileManager.js`
**Lines Saved**: ~400
**Complexity**: Medium
**Impact**: High - cleans up major responsibility

**Functions to Extract**:
- `loadFile()`
- `deleteFile()`
- `handleFileRename()`
- `handleFileDrop()`
- `handleFileSelection()`
- `saveCurrentPlaybackPosition()`

**Architecture**:
```javascript
// fileManager.js - Pure functions with callbacks
export function loadFile(fileId, state, dependencies, callbacks) {
    // ... file loading logic
    return { updatedState };
}

// app.js - Thin wrapper
async function loadFile(fileId) {
    const result = await FileManager.loadFile(fileId, {
        audioFiles, currentFileId, wavesurfer, etc.
    }, {
        supabase, WaveSurfer, Utils, etc.
    }, {
        onReady: () => { ... },
        onError: (err) => { ... }
    });

    // Update app.js state
    Object.assign(this, result);
}
```

---

### Phase 7: WaveSurfer Component Extraction
**Target**: Extract to `WaveformComponent` class
**Lines Saved**: ~170
**Complexity**: High
**Impact**: Very High - creates reusable waveform component

**Approach**:
```javascript
// waveformComponent.js
export class WaveformComponent {
    constructor(options) {
        this.container = options.container;
        this.wavesurfer = null;
        // ... state
    }

    init(WaveSurfer, config) {
        // Create wavesurfer
        // Setup event listeners
        // Return instance
    }

    load(url) { ... }
    destroy() { ... }
}

// app.js
const parentWaveform = new WaveformComponent({ container: '#waveform' });
parentWaveform.init(WaveSurfer, config);
```

**Benefits**:
- Reusable across views (Library, Galaxy, Sphere)
- Cleaner separation of concerns
- Easier testing

---

### Phase 8: Cleanup Marker Wrappers
**Target**: Move `addBarMarkers()` to parent component, verify wrappers
**Lines Saved**: ~200
**Complexity**: Low
**Impact**: Medium - completes marker extraction

---

### Phase 9: Tag/Filter UI Extraction
**Target**: Extract to `filterControls.js`
**Lines Saved**: ~120
**Complexity**: Low
**Impact**: Medium - cleans up UI logic

---

### Phase 10: Miscellaneous Extractions
**Target**: Extract smaller systems
**Lines Saved**: ~400
**Complexity**: Low-Medium
**Impact**: Medium

- BPM calculator → `bpmDetector.js` (~100 lines)
- Loop recording → `actionRecorder.js` (~125 lines)
- Stem generation → `stemGenerator.js` (~25 lines)
- Navigation → `navigationControls.js` (~100 lines)
- Stem loop helpers → `PlayerBarComponent` (~150 lines)

---

## Estimated Final State

**Current**: 3,355 lines

**After Phase 6 (File Manager)**: ~2,955 lines (-400)
**After Phase 7 (Waveform Component)**: ~2,785 lines (-170)
**After Phase 8 (Marker Cleanup)**: ~2,585 lines (-200)
**After Phase 9 (Filter UI)**: ~2,465 lines (-120)
**After Phase 10 (Misc)**: ~2,065 lines (-400)

**Target**: 2,000-2,500 lines ✅

---

## Commit Strategy

### Option A: Commit After Each Phase
**Pros**:
- Smaller, focused commits
- Easier to review
- Can revert individual phases if issues arise
- Clear progression in git history

**Cons**:
- More commits to manage
- Possible intermediate broken states

**Recommended Commit Points**:
1. ✅ After Phase 5 (Stem Controls) - **CURRENT STATE**
2. After Phase 6 (File Manager)
3. After Phase 7 (Waveform Component)
4. After Phase 8 (Marker Cleanup)
5. After Phase 9 (Filter UI)
6. After Phase 10 (Misc Extractions)

### Option B: Commit After Major Milestones
**Pros**:
- Fewer commits
- Each commit represents a major feature complete
- Cleaner git history

**Cons**:
- Larger commits harder to review
- More risk if something breaks

**Recommended Commit Points**:
1. ✅ After Phase 5 (Stem Controls) - **CURRENT STATE**
2. After Phase 6-7 (File & Waveform)
3. After Phase 8-10 (Cleanup & Misc)

### Option C: One Big Commit at End
**Pros**:
- Single "refactoring complete" commit
- All work in one place

**Cons**:
- Massive commit, hard to review
- High risk, difficult to revert
- Loses incremental progress

**NOT RECOMMENDED**

---

## Recommendation

**Strategy**: Option A (Commit After Each Phase)

**Next Steps**:
1. **Commit Phase 5 NOW** - Stem controls extraction is complete and tested ✅
2. **Start Phase 6** - File Manager extraction
3. **Commit Phase 6** when complete and tested
4. Continue through phases 7-10, committing after each

**Reasoning**:
- Phase 5 is complete, tested, and working - safe to commit
- Incremental commits reduce risk
- Can always squash commits later if desired
- Git history shows clear refactoring progression

---

## What to Do Next

### Immediate Action: Commit Phase 5

```bash
git add .
git commit -m "refactor: Extract stem player controls to PlayerBarComponent

- Add 12 control methods to PlayerBarComponent (playPause, toggleMute, setVolume, rate controls)
- Replace app.js functions with thin wrappers delegating to component methods
- Remove duplicate helper functions (calculateStemFinalRate, updateStemRateDisplay, etc.)
- Expose currentRate and currentParentFileBPM to window for component access
- Reduce app.js from 3,578 to 3,355 lines (-223 lines)

All stem player controls now use reusable component architecture.
Testing: All transport, volume, rate, marker, and cycle controls verified working.

Part of refactoring roadmap to reduce app.js to 2,000-2,500 lines."
```

### Then Choose Next Phase

**If you want quick wins**: Start Phase 8 (Marker Cleanup - low complexity, medium impact)

**If you want big impact**: Start Phase 6 (File Manager - high impact, medium complexity)

**If you want architectural improvement**: Start Phase 7 (Waveform Component - very high impact, high complexity)

---

## Summary

- **Current**: 3,355 lines (102 functions)
- **Target**: 2,000-2,500 lines
- **Remaining**: ~850-1,355 lines to extract
- **Identified Phases**: 6-10 (5 more phases)
- **Recommended**: Commit Phase 5 now, then proceed with incremental phases

**Phase 5 is complete and tested - ready to commit!**
