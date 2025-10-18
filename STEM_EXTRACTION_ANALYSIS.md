# Stem System Extraction Analysis
**Date**: 2025-10-18
**Branch**: refactor-v29-stem-extraction
**Goal**: Prepare multi-stem player for multi-view architecture (Library, Galaxy, Sphere)

---

## Problem Statement

**User's Goal**: Switch between 3 views (Library, Galaxy, Sphere) while keeping the player GLOBAL:
- Bottom player (parent waveform + controls) = persists across views
- Multi-stem player = persists across views
- Only the file browsing/visualization changes per view

**Current Issue**:
- Multi-stem player HTML is correctly placed globally (index.html line 1155)
- BUT 162 lines of stem STATE live in app.js mixed with orchestration code
- This makes it unclear what belongs to the stem system vs. general orchestration

---

## Current Stem Code Distribution

### In app.js:

**1. Stem State Variables (Lines 392-553, ~162 lines)**
```
25 separate state declarations including:
- multiStemPlayerExpanded
- stemPlayerWavesurfers = {}
- multiStemReadyCount
- multiStemAutoPlayOnReady
- stemsPreloaded
- stemIndependentRates = {}
- stemRateLocked = {}
- stemPlaybackIndependent = { vocals: true, drums: true, ... }
- currentParentFileBPM
- stemLoopStates = { vocals: {...}, drums: {...}, ... }
- stemCycleModes = { vocals: false, drums: false, ... }
- stemNextClickSets = { vocals: 'start', drums: 'start', ... }
- stemMarkersEnabled = { vocals: true, drums: true, ... }
- stemMarkerFrequency = { vocals: 'bar', drums: 'bar', ... }
- stemCurrentMarkers = { vocals: [], drums: [], ... }
- stemBarStartOffset = { vocals: 0, drums: 0, ... }
- stemMetronomeEnabled = { vocals: false, drums: false, ... }
- stemMetronomeSound = { vocals: 'click', drums: 'click', ... }
- stemSeekOnClick = { vocals: 'off', drums: 'off', ... }
- stemImmediateJump = { vocals: 'off', drums: 'off', ... }
- stemLoopControlsExpanded = { vocals: false, drums: false, ... }
- stemLoopFadesEnabled = { vocals: false, drums: false, ... }
- stemFadeTime = { vocals: 15, drums: 15, ... }
- stemPreserveLoop = { vocals: false, drums: false, ... }
- stemBPMLock = { vocals: false, drums: false, ... }
- stemRecordingActions = { vocals: false, drums: false, ... }
- stemRecordedActions = { vocals: [], drums: [], ... }
- stemPreservedLoopStartBar = { vocals: null, drums: null, ... }
- stemPreservedLoopEndBar = { vocals: null, drums: null, ... }
```

**2. Stem Functions (34 functions)**

**Category A: Thin Wrappers to StemPlayerManager (~15 functions)**
Already delegating correctly:
- `preloadAllStems()` → StemPlayerManager.preloadAllStems()
- `fetchStemFiles()` → StemPlayerManager.fetchStemFiles()
- `destroyAllStems()` → StemPlayerManager.destroyAllStems()
- `createStemWaveSurfer()` → StemPlayerManager.createStemWaveSurfer()
- `loadStems()` → StemPlayerManager.loadStems()
- `syncStemsWithMain()` → StemPlayerManager.syncStemsWithMain()
- `updateStemsButton()` → StemPlayerManager.updateStemsButton()
- `preloadMultiStemWavesurfers()` → StemPlayerManager.preloadMultiStemWavesurfers()
- `toggleMultiStemPlayer()` → StemPlayerManager.toggleMultiStemPlayer()
- `initializeMultiStemPlayerWavesurfers()` → StemPlayerManager.initializeMultiStemPlayerWavesurfers()
- `playAllStems()` → StemPlayerManager.playAllStems()
- `setupParentStemSync()` → StemPlayerManager.setupParentStemSync()

**Category B: Thin Wrappers to PlayerBarComponent (~12 functions)**
Already delegating correctly:
- `toggleMultiStemPlay(stemType)` → stemPlayerComponents[stemType].playPause()
- `toggleMultiStemMute(stemType)` → stemPlayerComponents[stemType].toggleMute()
- `handleMultiStemVolumeChange(stemType, value)` → stemPlayerComponents[stemType].setVolume()
- `handleStemRateChange(stemType, value)` → stemPlayerComponents[stemType].setRate()
- `setStemRatePreset(stemType, rate)` → stemPlayerComponents[stemType].setRatePreset()
- `toggleStemRateLock(stemType)` → stemPlayerComponents[stemType].toggleRateLock()
- `toggleStemCycleMode(stemType)` → stemPlayerComponents[stemType].toggleCycleMode()
- `toggleStemMarkers(stemType)` → stemPlayerComponents[stemType].toggleMarkers()
- `setStemMarkerFrequency(stemType, freq)` → stemPlayerComponents[stemType].setMarkerFrequency()
- `shiftStemBarStartLeft(stemType)` → stemPlayerComponents[stemType].shiftBarStartLeft()
- `shiftStemBarStartRight(stemType)` → stemPlayerComponents[stemType].shiftBarStartRight()

**Category C: Coordinating Functions (~7 functions)**
These coordinate between systems:
- `updateStemAudioState()` - Coordinates volume updates (master → stems)
- `setStemLoopRegion(stemType, start, end)` - Sets loop region (simple state update)
- `addStemBarMarkers(stemType, file)` - Adds markers (delegates to StemMarkerSystem)
- `findStemNearestMarkerToLeft(stemType, time)` - Finds marker (delegates to StemMarkerSystem)
- `generateMultiStemPlayerUI()` - UI generation (mostly empty now - Phase 1 preload)
- `toggleMultiStemLoop(stemType)` - Delegates to toggleStemCycleMode()
- `handleStemVolumeChange(stemType, value)` - OLD system volume control
- `handleStemMute(stemType)` - OLD system mute
- `handleStemSolo(stemType)` - OLD system solo
- `generateStems(fileId, event)` - Opens processing modal (not stem-specific really)

---

### In stemPlayerManager.js (927 lines):

**Functions already extracted**:
1. `preloadAllStems()` - Fetch all stems from database
2. `fetchStemFiles()` - Fetch stems for specific file
3. `destroyAllStems()` - Cleanup all stem instances
4. `updateStemsButton()` - Update STEMS button visibility
5. `createStemWaveSurfer()` - Create WaveSurfer instance for stem
6. `syncStemsWithMain()` - Sync OLD stem system with parent
7. `loadStems()` - Load stems for OLD system
8. `preloadMultiStemWavesurfers()` - Preload NEW multi-stem player (617 lines!)
9. `toggleMultiStemPlayer()` - Toggle expanded/collapsed
10. `initializeMultiStemPlayerWavesurfers()` - Legacy initialization
11. `setupParentStemSync()` - Setup parent-stem event sync
12. `playAllStems()` - Play all stems in sync
13. `updateMultiStemVolumes()` - Update NEW system volumes

---

### In PlayerBarComponent (per stem):

Each stem (vocals, drums, bass, other) has a PlayerBarComponent instance that handles:
- Play/pause
- Volume control
- Rate control (independent or locked to parent)
- Mute/unmute
- Loop/cycle mode
- Markers (toggle, frequency, shift)
- All per-stem UI logic

---

## The Core Problem: State Management

**162 lines of stem state in app.js breaks down as:**

### Global Stem System State (~30 lines)
State that manages the overall stem system:
```javascript
multiStemPlayerExpanded = false;        // UI expanded?
stemPlayerWavesurfers = {};             // WaveSurfer instances {vocals: ws, ...}
stemPlayerComponents = {};              // PlayerBarComponent instances
multiStemReadyCount = 0;                // Loading progress
multiStemAutoPlayOnReady = false;       // Auto-play when ready?
stemsPreloaded = false;                 // Pre-loaded for current file?
```

### Per-Stem Control State (~132 lines)
State for individual stem controls (4 stems × 33 lines each):
```javascript
// For EACH of vocals, drums, bass, other:
stemIndependentRates[stemType]          // Individual rate multiplier
stemRateLocked[stemType]                // Follows parent rate?
stemPlaybackIndependent[stemType]       // Active/inactive toggle
stemLoopStates[stemType]                // {enabled, start, end}
stemCycleModes[stemType]                // Cycle mode active?
stemNextClickSets[stemType]             // 'start' or 'end'
stemMarkersEnabled[stemType]            // Markers on/off
stemMarkerFrequency[stemType]           // 'bar', 'beat', etc.
stemCurrentMarkers[stemType]            // Array of marker times
stemBarStartOffset[stemType]            // Bar 1 offset
stemMetronomeEnabled[stemType]          // Metronome on/off
stemMetronomeSound[stemType]            // 'click', 'beep', etc.
stemSeekOnClick[stemType]               // Seek mode
stemImmediateJump[stemType]             // Jump mode
stemLoopControlsExpanded[stemType]      // UI expanded?
stemLoopFadesEnabled[stemType]          // Fades on/off
stemFadeTime[stemType]                  // Fade duration (ms)
stemPreserveLoop[stemType]              // Preserve on file change?
stemBPMLock[stemType]                   // BPM lock on/off
stemRecordingActions[stemType]          // Recording active?
stemRecordedActions[stemType]           // Array of recorded actions
stemPreservedLoopStartBar[stemType]     // Preserved loop start
stemPreservedLoopEndBar[stemType]       // Preserved loop end
```

---

## Extraction Strategy

### Goal: Create StemStateManager

Encapsulate all stem state in a single module that:
1. ✅ Persists across view switches (lives globally, not tied to any view)
2. ✅ Provides clear API for getting/setting stem state
3. ✅ Reduces app.js by ~162 lines
4. ✅ Makes stem system easy to understand and maintain

### Proposed Architecture

```
┌─────────────────────────────────────────────────────┐
│                     app.js                          │
│  (Orchestration - coordinates global player state)  │
│                                                     │
│  - currentFileId                                    │
│  - wavesurfer (parent)                              │
│  - parentPlayerComponent                            │
│  - loadAudio(), playPause(), etc.                   │
│                                                     │
│  REMOVES: 162 lines of stem state                   │
│  ADDS: 1 reference to stemStateManager              │
└─────────────────────────────────────────────────────┘
                          │
                          │ coordinates with
                          ▼
┌─────────────────────────────────────────────────────┐
│              StemStateManager                        │
│         (NEW - Stem state encapsulation)            │
│                                                     │
│  STATE:                                              │
│  - expanded: false                                   │
│  - playerWavesurfers: {}                             │
│  - playerComponents: {}                              │
│  - perStemState: {                                   │
│      vocals: { rate, loop, markers, ... },          │
│      drums: { rate, loop, markers, ... },           │
│      bass: { rate, loop, markers, ... },            │
│      other: { rate, loop, markers, ... }            │
│    }                                                 │
│                                                     │
│  API:                                                │
│  - getState()                                        │
│  - setState(key, value)                              │
│  - getStemState(stemType, key)                       │
│  - setStemState(stemType, key, value)                │
│  - isExpanded()                                      │
│  - setExpanded(bool)                                 │
│  - reset()                                           │
└─────────────────────────────────────────────────────┘
                          │
                          │ uses
                          ▼
┌─────────────────────────────────────────────────────┐
│            StemPlayerManager                         │
│    (EXISTING - 927 lines of lifecycle functions)    │
│                                                     │
│  - preloadAllStems()                                 │
│  - preloadMultiStemWavesurfers()                     │
│  - toggleMultiStemPlayer()                           │
│  - playAllStems()                                    │
│  - setupParentStemSync()                             │
│  - updateMultiStemVolumes()                          │
│  - etc.                                              │
└─────────────────────────────────────────────────────┘
                          │
                          │ creates/manages
                          ▼
┌─────────────────────────────────────────────────────┐
│          PlayerBarComponent (×4)                     │
│     (EXISTING - Per-stem player instances)          │
│                                                     │
│  Instances: vocals, drums, bass, other              │
│                                                     │
│  Each handles:                                       │
│  - playPause()                                       │
│  - setVolume()                                       │
│  - setRate()                                         │
│  - toggleCycleMode()                                 │
│  - toggleMarkers()                                   │
│  - etc.                                              │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create StemStateManager Module

**File**: `src/state/stemStateManager.js`

**Purpose**: Central state management for multi-stem player

**Structure**:
```javascript
// Global stem system state
const state = {
    expanded: false,
    playerWavesurfers: {},
    playerComponents: {},
    readyCount: 0,
    autoPlayOnReady: false,
    preloaded: false,
    currentParentFileBPM: null,

    // Per-stem state organized by stem type
    stems: {
        vocals: createDefaultStemState(),
        drums: createDefaultStemState(),
        bass: createDefaultStemState(),
        other: createDefaultStemState()
    }
};

function createDefaultStemState() {
    return {
        // Rate controls
        independentRate: 1.0,
        rateLocked: true,
        playbackIndependent: true,

        // Loop controls
        loopState: { enabled: false, start: null, end: null },
        cycleMode: false,
        nextClickSets: 'start',
        seekOnClick: 'off',
        immediateJump: 'off',
        loopControlsExpanded: false,
        loopFadesEnabled: false,
        fadeTime: 15,
        preserveLoop: false,
        preservedLoopStartBar: null,
        preservedLoopEndBar: null,

        // Markers
        markersEnabled: true,
        markerFrequency: 'bar',
        currentMarkers: [],
        barStartOffset: 0,

        // Metronome
        metronomeEnabled: false,
        metronomeSound: 'click',

        // BPM lock
        bpmLock: false,

        // Action recording
        recordingActions: false,
        recordedActions: []
    };
}

// API
export function getState() { return state; }
export function isExpanded() { return state.expanded; }
export function setExpanded(val) { state.expanded = val; }

export function getStemState(stemType, key) {
    return state.stems[stemType][key];
}

export function setStemState(stemType, key, value) {
    state.stems[stemType][key] = value;
}

export function getPlayerWavesurfers() { return state.playerWavesurfers; }
export function setPlayerWavesurfers(ws) { state.playerWavesurfers = ws; }

export function getPlayerComponents() { return state.playerComponents; }
export function setPlayerComponents(comps) { state.playerComponents = comps; }

export function reset() {
    state.expanded = false;
    state.playerWavesurfers = {};
    state.playerComponents = {};
    state.readyCount = 0;
    state.autoPlayOnReady = false;
    state.preloaded = false;
    state.currentParentFileBPM = null;

    // Reset all stems to defaults
    ['vocals', 'drums', 'bass', 'other'].forEach(type => {
        state.stems[type] = createDefaultStemState();
    });
}
```

---

### Phase 2: Update app.js

**Remove** (162 lines):
- All 25 stem state variable declarations (lines 392-553)

**Add** (2 lines):
```javascript
import * as StemState from '../state/stemStateManager.js';
// Access via StemState.getState(), StemState.getStemState('vocals', 'loopState'), etc.
```

**Update** stem function wrappers:
```javascript
// BEFORE:
function playAllStems() {
    StemPlayerManager.playAllStems(stemPlayerWavesurfers);
}

// AFTER:
function playAllStems() {
    const wavesurfers = StemState.getPlayerWavesurfers();
    StemPlayerManager.playAllStems(wavesurfers);
}
```

---

### Phase 3: Update StemPlayerManager.js

Update all functions to accept/return state via StemState module:

```javascript
// BEFORE:
export async function preloadMultiStemWavesurfers(fileId, dependencies, state, callbacks) {
    // ... uses state.stemPlayerWavesurfers, state.stemLoopStates, etc.
    return { stemPlayerWavesurfers, stemPlayerComponents, ... };
}

// AFTER:
import * as StemState from '../state/stemStateManager.js';

export async function preloadMultiStemWavesurfers(fileId, dependencies, callbacks) {
    // ... uses StemState.getPlayerWavesurfers(), StemState.getStemState(), etc.

    // Update state directly
    StemState.setPlayerWavesurfers(newWavesurfers);
    StemState.setPlayerComponents(newComponents);
    // No return needed - state updated internally
}
```

---

### Phase 4: Update PlayerBarComponent (if needed)

PlayerBarComponent instances may need to read/write stem state:

```javascript
// In PlayerBarComponent.js
import * as StemState from '../state/stemStateManager.js';

class PlayerBarComponent {
    toggleCycleMode() {
        if (this.playerType === 'stem') {
            const current = StemState.getStemState(this.stemType, 'cycleMode');
            StemState.setStemState(this.stemType, 'cycleMode', !current);
            // ... rest of logic
        }
    }
}
```

---

## Benefits of This Extraction

### 1. Multi-View Architecture Ready ✅
- Stem state lives in dedicated module (not in app.js orchestration)
- Easy to access from any view (Library, Galaxy, Sphere)
- State persists across view switches automatically

### 2. Cleaner app.js ✅
- Removes 162 lines of state declarations
- Adds ~2 lines of import
- **Net reduction: ~160 lines**
- app.js focused on orchestration, not stem state management

### 3. Better Encapsulation ✅
- All stem state in one place
- Clear API for getting/setting state
- Easy to understand stem system boundaries

### 4. Easier Testing ✅
- Can test stem state management independently
- Can reset state easily between tests
- No need to mock app.js

### 5. Easier to Extend ✅
- Adding new per-stem properties? Just update `createDefaultStemState()`
- Adding new stem types? Just add to `stems` object
- No need to search through app.js

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Extract state first, keep all functions unchanged
- Test thoroughly after extraction
- Use git to revert if issues arise

### Risk 2: Performance Impact
**Mitigation**:
- State access via function calls (slight overhead)
- But modern JS engines optimize this well
- Unlikely to be measurable performance difference

### Risk 3: Increased Complexity
**Mitigation**:
- Clear API makes it simpler, not more complex
- Having 162 lines scattered in app.js is currently MORE complex
- Centralized state is easier to reason about

---

## Testing Plan

### After Extraction:

**Test 1: Stem Expansion**
- Load file with stems
- Click STEMS button
- ✅ Multi-stem player expands
- ✅ All 4 waveforms visible
- ✅ State: `StemState.isExpanded() === true`

**Test 2: Volume Control**
- Adjust master volume
- ✅ All stems respond proportionally
- ✅ State: `StemState.getPlayerWavesurfers()` returns correct instances

**Test 3: Individual Stem Controls**
- Toggle markers on vocals
- ✅ Vocals markers toggle
- ✅ State: `StemState.getStemState('vocals', 'markersEnabled')` changes

**Test 4: Loop State**
- Set loop on drums
- ✅ Drums loop correctly
- ✅ State: `StemState.getStemState('drums', 'loopState')` reflects loop points

**Test 5: Rate Controls**
- Change vocals rate
- ✅ Vocals rate changes independently
- ✅ State: `StemState.getStemState('vocals', 'independentRate')` updates

**Test 6: View Switching (Future)**
- Switch from Library → Galaxy → Sphere
- ✅ Stem player persists
- ✅ State preserved across view changes

---

## Estimated Effort

### Phase 1: Create StemStateManager (~1 hour)
- Write module structure
- Create default state factory
- Write API functions (getters/setters)
- Write reset function

### Phase 2: Update app.js (~1 hour)
- Remove 162 lines of state
- Add import
- Update ~30 function wrappers to use StemState API

### Phase 3: Update StemPlayerManager.js (~1 hour)
- Update 13 functions to use StemState API
- Remove state parameter passing
- Test each function

### Phase 4: Update PlayerBarComponent (~30 minutes)
- Add StemState import
- Update methods that read/write stem state
- Test per-stem controls

### Phase 5: Testing (~2 hours)
- Run 6-test suite
- Fix any issues
- Verify across all features

**Total: ~5.5 hours of work**

---

## Commit Strategy

**Commit 1**: Create StemStateManager module
```
feat: Add StemStateManager for centralized stem state

- Create src/state/stemStateManager.js
- Encapsulates all 162 lines of stem state from app.js
- Provides clear API for state access
- Prepares for multi-view architecture

No functional changes - module created but not yet used
```

**Commit 2**: Integrate StemStateManager into app.js
```
refactor: Move stem state to StemStateManager (~160 lines)

REMOVED from app.js:
- 25 stem state variable declarations (162 lines)

ADDED to app.js:
- Import StemStateManager
- Update stem functions to use StemState API

UPDATED:
- ~30 stem wrapper functions to get state from StemState
- All functions tested and working

RESULT: app.js reduced from 2,153 → ~1,993 lines
Multi-view architecture ready for stem system
```

**Commit 3**: Update StemPlayerManager integration
```
refactor: Update StemPlayerManager to use StemState

- All 13 functions now use StemState API
- Removed state parameter passing
- Direct state updates via StemState setters

No functional changes - same behavior, cleaner API
```

**Commit 4**: Final testing and documentation
```
test: Verify stem system after state extraction

- All 6 stem tests passing
- View switching ready
- Documentation updated

Branch ready for multi-view implementation
```

---

## Next Steps After This Extraction

With stem state properly encapsulated:

1. **Implement Galaxy View** - Can access stem state easily
2. **Implement Sphere View** - Same access pattern
3. **View switching logic** - Stem player persists automatically
4. **Future enhancements** - Easy to add new stem features

---

## Recommendation

**YES - Extract stem state to StemStateManager**

**Why**:
1. Aligns with your multi-view architecture goal
2. Removes 160 lines from app.js (7.4% reduction)
3. Makes stem system boundaries clear
4. Essential for view switching (your stated goal)
5. Improves maintainability significantly

**When**:
- Now is the perfect time
- Before implementing Galaxy/Sphere views
- After v29 refactoring is committed

**Confidence**: High
- Clear boundaries
- Low risk
- High benefit
- Aligns with architecture vision

---

**Bottom Line**: The stem state extraction is not just "nice to have" - it's **essential** for your multi-view architecture. You cannot easily implement view switching with 162 lines of stem state scattered in app.js. This extraction should be **Priority 0** before any view development work.
