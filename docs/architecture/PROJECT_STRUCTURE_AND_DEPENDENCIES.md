# Audio Library - Project Structure & Dependencies

**Date**: 2025-10-18
**Total JavaScript**: ~10,800 lines (excluding docs)
**Main File**: app.js (2,670 lines)

---

## 📊 APP.JS Breakdown (2,670 lines)

### By Content Type
- **Function Code**: 1,619 lines (60.6%) - 102 functions
- **Non-Function Code**: 1,051 lines (39.4%)
  - Imports & module setup: ~100 lines
  - State variable declarations: ~150 lines
  - Window scope exports: ~250 lines
  - Comments & section markers: ~200 lines
  - Event listener setup: ~220 lines
  - Initialization code: ~131 lines

### By Functional Category

| Category | Lines | % | Functions | Description |
|----------|-------|---|-----------|-------------|
| **Stem Player System** | 592 | 22.2% | 34 | Multi-stem player, sync, UI |
| **Loop & Cycle Mode** | 364 | 13.6% | 19 | Loop controls, cycle mode |
| **Other/Misc** | 308 | 11.5% | 36 | WaveSurfer init, navigation |
| **Playback Controls** | 193 | 7.2% | 7 | Play/pause, rate, volume |
| **BPM & Key Detection** | 103 | 3.9% | 3 | BPM calculation, key detect |
| **File Management** | 54 | 2.0% | 2 | Load data, load audio |
| **Search & Navigation** | 5 | 0.2% | 1 | Search handling |

### Top 10 Largest Functions

1. **setPlaybackRate** - 121 lines (L1844) - Playback rate with time stretch
2. **setupStemCycleModeClickHandler** - 97 lines (L993) - Stem loop click handling
3. **setupParentStemSync** - 85 lines (L807) - Parent-stem synchronization
4. **calculateBPMFromOnsets** - 73 lines (L345) - BPM detection algorithm
5. **updateStemAudioState** - 57 lines (L244) - Stem solo/mute logic
6. **renderStemWaveforms** - 47 lines (L1185) - Stem waveform rendering
7. **preloadMultiStemWavesurfers** - 39 lines (L659) - Stem preloading
8. **updateLoopRegion** - 39 lines (L1468) - Parent loop region UI
9. **destroyMultiStemPlayerWavesurfers** - 37 lines (L893) - Stem cleanup
10. **updateStemLoopVisuals** - 37 lines (L1092) - Stem loop UI updates

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           index.html                                 │
│                     (Main Entry Point)                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ├─ Loads CSS (styles/)
                                  └─ Loads app.js (type="module")
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        src/core/app.js                               │
│                   (2,670 lines - Orchestrator)                       │
│                                                                      │
│  • Initializes all modules                                          │
│  • Sets up event listeners                                          │
│  • Coordinates between components                                   │
│  • Manages global state                                             │
│  • Exposes functions to window (for HTML onclick)                   │
└─────────────────────────────────────────────────────────────────────┘
         │
         ├─ Imports & Uses ─────────────────┐
         │                                   │
         ▼                                   ▼
┌──────────────────────┐          ┌──────────────────────┐
│   src/core/          │          │  src/components/     │
│   (Core Modules)     │          │  (UI Components)     │
└──────────────────────┘          └──────────────────────┘
         │                                   │
         ├─ config.js (17)                  ├─ PlayerBarComponent (1,451) ⭐
         ├─ state.js (148)                  ├─ WaveformComponent (600)
         ├─ utils.js (330)                  ├─ StemPlayerManager (884) ⭐
         ├─ supabase.js (104)               ├─ StemMarkerSystem (345)
         ├─ audioContext.js (52)            ├─ MarkerSystem (308)
         ├─ playerTemplate.js (1,326) ⭐    ├─ LoopControls (797)
         ├─ keyboardShortcuts.js (329)      ├─ MiniWaveform (143)
         ├─ viewManager.js (123)            ├─ TagEditModal (571)
         ├─ tagManager.js (374)             └─ ProcessingModal (473)
         ├─ uploadManager.js (150)
         ├─ fileProcessor.js (379)          ┌──────────────────────┐
         ├─ batchOperations.js (403)        │  src/services/       │
         └─ metronome.js (254)              │  (Business Logic)    │
                                            └──────────────────────┘
         ┌──────────────────────┐                   │
         │  src/views/          │                   ├─ FileLoader (373) ⭐
         │  (View Renderers)    │                   └─ ActionRecorder (332) ⭐
         └──────────────────────┘
                │                            ┌──────────────────────┐
                ├─ libraryView.js (55)       │  src/audio/          │
                ├─ galaxyView.js (31)        │  (Audio Processing)  │
                ├─ sphereView.js (31)        └──────────────────────┘
                └─ fileListRenderer.js (613)          │
                                                      └─ signalsmith.js (157)
         ┌──────────────────────┐
         │  src/utils/          │            ┌──────────────────────┐
         │  (Utilities)         │            │  External Libraries  │
         └──────────────────────┘            └──────────────────────┘
                │                                     │
                ├─ beatmap.js (77)                   ├─ WaveSurfer.js
                ├─ formatting.js (95)                ├─ Supabase
                └─ progressBar.js (136)              └─ Signalsmith Stretch
```

---

## 🔗 Dependency Flow

### app.js Dependencies

**app.js imports**:
```javascript
import { config } from './config.js'
import { supabase } from './supabase.js'
import Utils from './utils.js'
import { PlayerBarComponent } from '../components/playerBar.js'
import { WaveformComponent } from '../components/waveform.js'
import { FileLoader } from '../services/fileLoader.js'
import { ActionRecorder } from '../services/actionRecorder.js'
import * as StemPlayerManager from '../components/stemPlayerManager.js'
import * as StemMarkerSystem from '../components/stemMarkerSystem.js'
import { generatePlayerBar, generateStemPlayerBar } from './playerTemplate.js'
// ... and many more
```

**app.js provides to window (for HTML onclick)**:
```javascript
window.playPause = playPause
window.nextTrack = nextTrack
window.previousTrack = previousTrack
window.setPlaybackRate = setPlaybackRate
window.toggleStemCycleMode = toggleStemCycleMode
window.handleStemVolumeChange = handleStemVolumeChange
// ... ~50 more functions
```

### Component Dependencies

**PlayerBarComponent** (1,451 lines)
- **Imports**: Utils, MarkerSystem
- **Used by**: app.js (parent player + 4 stem players)
- **Purpose**: Reusable player bar with controls, markers, time display
- **Instances**: 5 total (1 parent + 4 stems)

**StemPlayerManager** (884 lines)
- **Imports**: None (stateless module)
- **Used by**: app.js
- **Purpose**: Stem lifecycle (preload, sync, destroy)
- **Exports**: 11 functions (preloadAllStems, toggleMultiStemPlayer, etc.)

**FileLoader** (373 lines)
- **Imports**: None
- **Used by**: app.js
- **Purpose**: File loading service with dependency injection
- **Pattern**: Service class with constructor dependencies

**ActionRecorder** (332 lines) ⭐ NEW (Phase 10a)
- **Imports**: None
- **Used by**: app.js
- **Purpose**: Action recording/playback service
- **Pattern**: Service class with callbacks

---

## 📂 File Organization

### Core Layer (`src/core/`)
**Purpose**: Application orchestration, state, configuration

- **app.js** - Main application (imports everything, coordinates)
- **state.js** - Global state variables
- **config.js** - Configuration constants
- **utils.js** - Utility functions (formatTime, etc.)
- **playerTemplate.js** - HTML template generators (1,326 lines!)

### Component Layer (`src/components/`)
**Purpose**: Reusable UI components with encapsulated logic

- **PlayerBarComponent** - Player bar class (used 5x)
- **WaveformComponent** - Waveform visualization
- **StemPlayerManager** - Stem player orchestration
- **MarkerSystem** - Beat marker rendering

### Service Layer (`src/services/`)
**Purpose**: Business logic services

- **FileLoader** - File loading logic
- **ActionRecorder** - Recording/playback logic

### View Layer (`src/views/`)
**Purpose**: View-specific rendering

- **libraryView.js** - Grid view
- **galaxyView.js** - Galaxy visualization
- **fileListRenderer.js** - File list with OLD stem UI

---

## 🎯 Key Architecture Patterns

### 1. Component-Based Player
```javascript
// app.js creates PlayerBarComponent instances
parentPlayerComponent = new PlayerBarComponent({
    playerType: 'parent',
    waveform: wavesurfer
})

stemPlayerComponents['vocals'] = new PlayerBarComponent({
    playerType: 'stem',
    stemType: 'vocals',
    waveform: stemPlayerWavesurfers['vocals']
})
```

### 2. Service Layer with Dependency Injection
```javascript
// app.js initializes services with dependencies
fileLoader = new FileLoader({
    supabase,
    audioFiles,
    getParentPlayerComponent: () => parentPlayerComponent, // Lazy getter!
    loadAudio,
    setCurrentFileId: (id) => { currentFileId = id }
})
```

### 3. Thin Wrapper Pattern
```javascript
// app.js provides thin wrappers for HTML onclick compatibility
function toggleMultiStemPlay(stemType) {
    stemPlayerComponents[stemType]?.playPause()
}

function handleStemRateChange(stemType, sliderValue) {
    stemPlayerComponents[stemType]?.setRate(sliderValue)
}
```

### 4. Module Exports Pattern
```javascript
// StemPlayerManager.js exports pure functions
export async function preloadAllStems(supabase) { ... }
export function toggleMultiStemPlayer(state, dependencies) { ... }

// app.js imports and uses
import * as StemPlayerManager from '../components/stemPlayerManager.js'
StemPlayerManager.preloadAllStems(supabase)
```

---

## 🔄 Data Flow

### File Loading Flow
```
User clicks file
    ↓
app.js: handleFileClick()
    ↓
fileLoader.loadFile(fileId)
    ↓
FileLoader fetches from Supabase
    ↓
FileLoader calls app.js callbacks
    ↓
app.js updates state & UI
    ↓
PlayerBarComponent receives new file
    ↓
Markers render, waveform loads
```

### Stem Player Flow
```
User clicks STEMS button
    ↓
app.js: toggleMultiStemPlayer()
    ↓
StemPlayerManager.toggleMultiStemPlayer(state, deps)
    ↓
Mutes parent, unmutes stems (instant switch)
    ↓
Parent-stem sync activated
    ↓
app.js: setupParentStemSync()
    ↓
Parent play/pause/seek events sync to stems
```

---

## 📝 State Management

### Global State (in app.js)

**Player State**:
```javascript
let wavesurfer = null
let parentPlayerComponent = null
let currentFileId = null
let currentRate = 1.0
let isPlaying = false
```

**Stem State**:
```javascript
let stemPlayerWavesurfers = {}  // { vocals: WS, drums: WS, ... }
let stemPlayerComponents = {}   // { vocals: Component, drums: Component, ... }
let multiStemPlayerExpanded = false
let stemIndependentRates = {}
let stemLoopStates = {}
let stemCycleModes = {}
```

**Loop State**:
```javascript
let loopStart = null
let loopEnd = null
let cycleMode = false
```

---

## 🎨 UI Structure

### HTML Structure
```
index.html
├─ #app-container
│   ├─ #libraryView (grid of files)
│   ├─ #galaxyView (galaxy viz)
│   └─ #sphereView (3D sphere)
│
├─ #playerBar (fixed bottom - parent player)
│   ├─ Waveform container
│   ├─ Play/pause button
│   ├─ Time display
│   ├─ Rate controls
│   ├─ Volume slider
│   └─ STEMS button
│
└─ #multiStemPlayer (collapsible - 4 stem players)
    ├─ Vocals stem player bar
    ├─ Drums stem player bar
    ├─ Bass stem player bar
    └─ Other stem player bar
```

---

## 🔑 Key Files Edited Today (Oct 18)

1. **src/core/app.js**
   - No code changes
   - Deep analysis performed
   - Discovered many functions already thin wrappers

2. **src/services/actionRecorder.js** ⭐ NEW
   - Created in Phase 10a
   - 332 lines
   - Action recording/playback service

3. **PHASE_10E_ACTUAL_STATE_ANALYSIS.md** ⭐ NEW
   - Complete breakdown of 30 stem functions
   - Status analysis (wrappers vs. logic)
   - Extraction recommendations

4. **NEXT_PHASE_HANDOFF.md**
   - Updated with findings
   - Revised recommendations (declare victory!)

5. **SESSION_SUMMARY_2025-10-18.md**
   - Updated with final insights
   - Session progress documented

---

## 📊 Code Quality Metrics

### Good Signs ✅
- **Component-based**: PlayerBarComponent used 5x (parent + 4 stems)
- **Service layer**: FileLoader, ActionRecorder properly encapsulated
- **Thin wrappers**: Many functions delegate to components/modules
- **Separation of concerns**: Views, components, services separated
- **25% reduction**: 3,578 → 2,670 lines (app.js)

### Areas for Improvement (Optional) ⚠️
- **setupParentStemSync duplicate**: Exists in both app.js and StemPlayerManager.js (86 lines)
- **Large functions**: setPlaybackRate (121), setupStemCycleModeClickHandler (97)
- **OLD system compatibility**: 3 functions must stay for fileListRenderer.js
- **Template system**: playerTemplate.js is 1,326 lines (could be split)

---

## 🎯 Summary

**Total Project**: ~10,800 lines of JavaScript
**Main File**: app.js (2,670 lines)
**Architecture**: Component-based with service layer
**Pattern**: Thin wrappers + dependency injection
**Quality**: Excellent! Many functions already properly delegated

**Recommendation**: Codebase is in great shape. Focus on features, not refactoring!

---

**Generated**: 2025-10-18
**Branch**: refactor-v28-player-component-architecture
