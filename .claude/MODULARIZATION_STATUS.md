# Modularization Status & Multi-View Architecture Plan

## Current Status (2025-10-14)

### ✅ Completed Extractions

#### ROUND 1: Foundation Modules
- **config.js** (18 lines) - Supabase client, PREF_KEYS constants
- **utils.js** (331 lines) - 12 pure utility functions
  - extractTagsFromFilename(), getAudioDuration(), calculateBPMFromOnsets()
  - getAllTags(), getTagCount(), getAllBPMs(), getAllKeys()
  - getShiftIncrement(), findNearestMarkerToLeft()
  - getBarIndexAtTime(), getTimeForBarIndex(), formatTime()

#### ROUND 2: Audio Modules
- **metronome.js** (254 lines) - Complete metronome system
  - Audio context initialization
  - 4 sound generators (click, beep, wood, cowbell)
  - Beat scheduling with playback rate compensation
  - State management with getter/setter API

### 📊 Progress Metrics
- **app.js reduced:** 4394 → 4228 lines (166 lines / 3.8% reduction)
- **Modules created:** 3 (config, utils, metronome)
- **Total extracted:** ~600 lines
- **Functionality:** ✅ All working, fully tested

### 🔄 Deferred Extractions

The following extractions were **assessed and deferred** due to tight coupling:

#### Audio Engine (~400 lines) - TIGHTLY COUPLED
**Functions:** loadAudio(), playPause(), nextTrack(), previousTrack(), setVolume(), toggleMute(), resetVolume(), setPlaybackRate(), resetRate(), updatePlayerTime()

**Why deferred:**
- loadAudio() depends on initWaveSurfer(), addBarMarkers(), resetLoop(), updateLoopVisuals()
- Deep integration with loop preservation, BPM lock, seamless swap features
- Would require major refactoring of state management
- **Risk:** High chance of breaking complex features

#### Waveform Player (~800 lines) - TIGHTLY COUPLED
**Functions:** initWaveSurfer(), addBarMarkers(), toggleMarkers(), setMarkerFrequency(), shiftBarStartLeft(), shiftBarStartRight()

**Why deferred:**
- initWaveSurfer() contains critical event handlers:
  - 'finish' event → track navigation
  - 'pause'/'play' events → metronome scheduling
  - 'audioprocess' event → loop fades, metronome scheduling, clock-quantized jumps
  - 'seeking' event → metronome cleanup
- Event loop is the heart of the application
- **Risk:** Very high chance of breaking core functionality

#### Loop Controls (~600 lines) - TIGHTLY COUPLED
**Functions:** toggleCycleMode(), resetLoop(), clearLoopKeepCycle(), updateLoopVisuals(), updateLoopRegion(), shiftLoopLeft(), shiftLoopRight(), halfLoopLength(), doubleLoopLength(), moveStartLeft(), moveStartRight(), toggleImmediateJump(), toggleLoopFades(), setFadeTime(), togglePreserveLoop(), toggleBPMLock()

**Why deferred:**
- Deep integration with audioprocess event loop (fade calculations)
- Complex interdependencies with waveform player
- State management across file changes
- **Risk:** High chance of breaking loop/cycle features

#### Library View (~1000+ lines) - VERY TIGHTLY COUPLED
**Functions:** renderFiles(), renderMiniWaveforms(), renderTags(), filterFiles(), sortFiles(), handleFileClick(), handleTagClick(), handleBPMClick(), handleKeyClick(), handleSearchKeydown(), handleSort(), toggleShowAllTags(), updateSelectionUI(), selectAll(), deselectAll(), toggleFileSelection(), quickEditFile(), openStemsViewer(), generateStems()

**Why deferred:**
- 21+ interconnected functions
- Extensive state dependencies (audioFiles, filters, selectedFiles, currentFileId, etc.)
- Mini-waveform management with WaveSurfer instances
- Calls loadAudio() for playback integration
- **Risk:** Extremely high - would require complete state management refactor

---

## 🎯 Multi-View Architecture Plan

### User's Goals
1. **Multiple View Modes:**
   - Library View (current, list-based)
   - Galaxy Visualizer (3D particle system)
   - Sphere Visualizer (3D spherical visualization)

2. **Consistent Player Bar:**
   - Waveform display
   - Playback controls (play/pause, volume, rate)
   - Loop/cycle controls
   - Metronome
   - Must work across ALL views

3. **Stems Expansion Feature:**
   - Expandable stem player bars (like mobile visualizer)
   - Show individual instrument stems
   - Independent playback controls per stem

### Architecture Strategy

Instead of extracting tightly coupled code, we'll **build new views around the existing core** using a view-switching system.

```
┌─────────────────────────────────────────────────┐
│           index.html (Shell)                     │
│  ┌─────────────────────────────────────────┐   │
│  │     Player Bar (Always Visible)          │   │
│  │  - Waveform, Controls, Loop, Metronome   │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │       View Container (Switchable)        │   │
│  │  ┌──────────┬──────────┬──────────┐     │   │
│  │  │ Library  │ Galaxy   │ Sphere   │     │   │
│  │  │  View    │  View    │  View    │     │   │
│  │  └──────────┴──────────┴──────────┘     │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Core Modules:
- app.js (coordinator, audio engine, waveform, loops)
- config.js (Supabase, constants)
- utils.js (utilities)
- metronome.js (metronome system)

New Modules (to be created):
- viewManager.js (view switching logic)
- libraryView.js (file list, tags, filters)
- galaxyView.js (3D particle visualization)
- sphereView.js (3D spherical visualization)
- stemsPlayer.js (expandable stem bars)
```

### Implementation Steps

#### Phase 1: View Manager System
1. Create `src/core/viewManager.js`
   - registerView(name, initFunction, updateFunction, destroyFunction)
   - switchView(viewName)
   - currentView state management

2. Add view selector UI to index.html
   - Tab bar: [Library] [Galaxy] [Sphere]
   - View container div for dynamic content

3. Extract current library UI to `src/views/libraryView.js`
   - Keep event handlers in app.js
   - Export render functions only
   - registerView('library', initLibraryView, updateLibraryView, destroyLibraryView)

#### Phase 2: Galaxy Visualizer
1. Create `src/views/galaxyView.js`
   - Three.js setup (camera, scene, renderer)
   - Particle system generation
   - File representation as particles
   - Color coding by tags/BPM/key
   - Camera controls (orbit, zoom)
   - Click-to-play interaction

2. Integration:
   - registerView('galaxy', initGalaxyView, updateGalaxyView, destroyGalaxyView)
   - Update on file selection/playback
   - Sync with audio playback (particle highlighting)

#### Phase 3: Sphere Visualizer
1. Create `src/views/sphereView.js`
   - Three.js spherical layout
   - Files arranged on sphere surface
   - Rotation animation
   - Tag-based clustering
   - Click-to-play interaction

2. Integration:
   - registerView('sphere', initSphereView, updateSphereView, destroySphereView)
   - Update on file selection/playback
   - Audio-reactive animations

#### Phase 4: Stems Expansion
1. Create `src/components/stemsPlayer.js`
   - Expandable stem bar UI component
   - Individual stem waveforms
   - Per-stem volume/mute controls
   - Visual expansion animation
   - Load stems data from Supabase

2. Integration:
   - Add expand button to player bar
   - Show below main waveform
   - Works across all views
   - Sync with main playback

---

## 📋 Next Session Tasks

1. **Create View Manager System**
   - Implement viewManager.js
   - Add view selector UI
   - Test view switching (Library view only at first)

2. **Plan Galaxy View**
   - Research Three.js particle systems
   - Design data→visual mapping
   - Sketch interaction patterns

3. **Plan Sphere View**
   - Design spherical layout algorithm
   - Plan tag clustering approach
   - Sketch rotation controls

4. **Plan Stems Player**
   - Design UI mockup
   - Plan animation timeline
   - Define data structure

---

## 🔑 Key Design Principles

1. **Keep Core Stable:** Don't refactor tightly coupled audio/waveform/loop code
2. **Build Around Core:** New views consume events/state from app.js
3. **View Independence:** Each view can init/update/destroy cleanly
4. **Shared Player Bar:** All views use the same player controls
5. **Progressive Enhancement:** Add views incrementally, test thoroughly

---

## 📁 Current File Structure

```
audio-library-claude/
├── index.html (1000+ lines) - Main UI shell
├── src/
│   └── core/
│       ├── app.js (4228 lines) - Main coordinator ⚡
│       ├── config.js (18 lines) - Supabase config ✅
│       ├── utils.js (331 lines) - Utility functions ✅
│       ├── metronome.js (254 lines) - Metronome system ✅
│       └── state.js (149 lines) - State management (not used yet)
├── .claude/
│   ├── CLAUDE.md - User instructions
│   ├── ROUND_2_CONTINUATION.md - Session continuation guide
│   └── MODULARIZATION_STATUS.md - This document
├── CHANGELOG.txt - Version history
└── SESSION_LOG.txt - Detailed session logs
```

---

## 🚀 Success Criteria

### Modularization (Current Focus)
- ✅ Foundation modules extracted (config, utils)
- ✅ Metronome extracted (166 lines reduced)
- ✅ All functionality tested and working
- ⏸️ Further extraction deferred (too risky)

### Multi-View Architecture (Next Focus)
- ⏸️ View manager system implemented
- ⏸️ Library view working as switchable view
- ⏸️ Galaxy visualizer implemented
- ⏸️ Sphere visualizer implemented
- ⏸️ Stems player implemented
- ⏸️ All views tested and polished

---

## 📝 Notes

- **Token Usage:** Modularization consumed ~82k tokens, mostly reading/analyzing code
- **Testing:** User confirmed all functionality working after metronome extraction
- **Backup Strategy:** app_v1 through app_v7 backups created
- **Git Status:** All changes committed and pushed to GitHub (commit 9612ad7)
- **Keyboard Shortcuts:** Defined in app.js around line 4050-4150, not modularized
- **Risk Assessment:** Further extraction of core modules too risky without major refactor

---

**Last Updated:** 2025-10-14
**Status:** Modularization Phase 1 complete, ready for Multi-View Architecture Phase
