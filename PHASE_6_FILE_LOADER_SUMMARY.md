# Phase 6: File Loader Extraction - Summary

**Date**: 2025-10-18
**Branch**: refactor-v28-player-component-architecture
**Phase**: Refactoring Phase 6 - File Loader Service Extraction

---

## Overview

Successfully extracted file loading logic from `app.js` into a dedicated `FileLoader` service class, making file loading operations reusable and testable.

---

## What Was Extracted

### From app.js

**Target Function**: `loadAudio(fileId, autoplay)`
- **Original Location**: app.js lines 1988-2156
- **Original Size**: 168 lines
- **New Size**: 18 lines (thin wrapper)
- **Lines Removed**: 150 lines of core logic

### What `loadAudio()` Did Before

```javascript
function loadAudio(fileId, autoplay = true) {
    // 1. Find file in audioFiles array (2 lines)
    // 2. Check if already loaded (1 line)

    // 3. Loop Preservation System (30 lines)
    //    - Save current loop as bar indices
    //    - Calculate playback position within loop
    //    - Store cycle mode state

    // 4. Update global state (15 lines)
    //    - Set currentFileId
    //    - Reset or prepare loop state
    //    - Reset bar start offset

    // 5. Destroy old wavesurfer and stems (15 lines)

    // 6. Initialize new wavesurfer (10 lines)
    //    - Call initWaveSurfer()
    //    - Apply volume and rate

    // 7. Load audio file (5 lines)
    //    - wavesurfer.load()
    //    - Update UI elements

    // 8. Setup 'ready' event handler (75 lines) ← LARGEST SECTION
    //    - Restore volume
    //    - Load markers via PlayerBarComponent
    //    - Apply BPM lock
    //    - Restore preserved loop from bar indices
    //    - Pre-load stems if available
    //    - Auto-play if requested

    // 9. Update file list highlighting (10 lines)

    // 10. Update STEMS button (1 line)
}
```

---

## New Architecture

### FileLoader Service (New)

**Location**: `src/services/fileLoader.js`
**Lines**: ~360 lines

**New Class**: `FileLoader`
- Constructor receives dependencies via dependency injection
- All logic extracted into focused methods

**Public Methods**:
1. **`loadFile(fileId, autoplay)`** - Main entry point, orchestrates file loading

**Private Methods** (internal helpers):
2. **`_preserveLoopState(currentFileId)`** - Save loop as bar indices before switching
3. **`_prepareLoopState()`** - Reset or prepare loop state for new file
4. **`_resetBarStartOffset()`** - Reset bar start offset to 0
5. **`_destroyOldWavesurfer()`** - Destroy old wavesurfer instance
6. **`_applyVolumeAndRate(wavesurfer)`** - Apply current volume and playback rate
7. **`_updatePlayerUI(file)`** - Update player UI elements
8. **`_handleWaveformReady(file, wavesurfer, autoplay)`** - Handle 'ready' event (largest method)
9. **`_restorePreservedLoop(file, wavesurfer, autoplay)`** - Restore loop from bar indices
10. **`_preloadStems(file)`** - Pre-load stems if available
11. **`_updateFileListHighlighting(fileId)`** - Update active file highlighting

### app.js `loadAudio()` (New - Thin Wrapper)

**Location**: app.js lines 1991-2008
**Size**: 18 lines

```javascript
// THIN WRAPPER: Delegates to FileLoader service
async function loadAudio(fileId, autoplay = true) {
    if (!fileLoader) {
        console.error('[app.js] FileLoader not initialized');
        return;
    }

    // Reset bar start offset (managed by app.js)
    barStartOffset = 0;

    // Delegate to FileLoader service
    const result = await fileLoader.loadFile(fileId, autoplay);
    if (!result || result.alreadyLoaded) return;

    // FileLoader manages all other state through callbacks
    // wavesurfer is set via setWavesurfer callback
    // currentFileId is set via setCurrentFileId callback
    // Loop state is managed via get/set callbacks
}
```

---

## Dependency Injection

FileLoader uses dependency injection to access app.js state and helpers:

```javascript
fileLoader = new FileLoader({
    // State getters/setters
    audioFiles: () => audioFiles,
    getCurrentFileId: () => currentFileId,
    setCurrentFileId: (id) => { currentFileId = id; },
    getWavesurfer: () => wavesurfer,
    setWavesurfer: (ws) => { wavesurfer = ws; },
    parentWaveform: parentWaveform,
    parentPlayerComponent: parentPlayerComponent,

    // Loop state
    getLoopState: () => ({ start: loopStart, end: loopEnd, cycleMode, nextClickSets }),
    setLoopState: (state) => { /* update state */ },
    getPreserveLoopOnFileChange: () => preserveLoopOnFileChange,
    getPreservedLoopBars: () => ({ /* preserved bar state */ }),
    setPreservedLoopBars: (bars) => { /* update preserved bars */ },

    // Helpers
    resetLoop,
    updateLoopVisuals,
    getBarIndexAtTime,
    getTimeForBarIndex,
    destroyAllStems,
    preloadMultiStemWavesurfers,
    updateStemsButton,

    // BPM lock
    getBpmLockState: () => ({ enabled: bpmLockEnabled, lockedBPM }),
    setPlaybackRate,

    // UI
    getCurrentRate: () => currentRate,
    initWaveSurfer
});
```

---

## Benefits

### 1. Testability
- **FileLoader is a class** - can be instantiated with mock dependencies
- **Pure logic** - no direct DOM dependencies (passed via callbacks)
- **Focused methods** - each method has one responsibility

### 2. Reusability
- **Works across views** - can be used in Library, Galaxy, Sphere views
- **Component-based** - integrates with WaveformComponent and PlayerBarComponent
- **Standalone** - can be used independently of app.js

### 3. Maintainability
- **Clear separation** - File loading logic separate from player controls
- **Focused methods** - Easy to find and modify specific functionality
- **Good naming** - Method names clearly describe what they do

### 4. Extensibility
- **Easy to add features** - Just add new methods or modify existing ones
- **Dependency injection** - Easy to swap out dependencies for testing
- **Future-ready** - Can add file pre-loading, caching, etc.

---

## File Statistics

### FileLoader Service
- **New file**: `src/services/fileLoader.js`
- **Lines**: ~360 lines
- **Methods**: 11 total (1 public, 10 private)

### app.js
- **Before Phase 6**: 3,003 lines
- **After Phase 6**: 2,906 lines
- **Net Change**: -97 lines (168-line function → 18-line wrapper, but +49 lines for initialization)
- **Actual Logic Extracted**: 150 lines of file loading code

---

## Testing Checklist

After Phase 6, test the following:

### File Loading
- [ ] Load a file from list - verify waveform renders
- [ ] Switch between files - verify old destroyed, new created
- [ ] Load file with BPM lock ON - verify rate auto-adjusts
- [ ] Check browser console for errors

### Loop Preservation
- [ ] Enable loop preservation
- [ ] Set loop points on file A
- [ ] Switch to file B - verify loop restores to same bar positions
- [ ] Verify cycle mode state preserved
- [ ] Play through loop - verify smooth fade in/out (if enabled)

### Stem Pre-loading
- [ ] Load file with stems - verify "STEMS" button appears
- [ ] Check console for "pre-loading stems" messages
- [ ] Click STEMS button - verify stems expand quickly (already pre-loaded)

### Playback
- [ ] Auto-play after loading - verify plays automatically
- [ ] Load without auto-play - verify stays paused
- [ ] Volume/rate preserved across file changes

### UI Updates
- [ ] Player filename updates
- [ ] Player time resets to "0:00 / 0:00"
- [ ] Play icon resets to "▶"
- [ ] Active file highlighted in list

---

## Known Limitations

### Dependency on app.js State
FileLoader still accesses app.js state through callbacks. This is intentional for Phase 6.

**Future Improvement** (Phase 7+):
- Create LoopManager service to manage loop state
- Create StateManager to centralize global state
- Reduce number of dependencies passed to FileLoader

---

## Architecture Wins

**Phase 6 Complete**: ✅

- **Extracted**: 150 lines of file loading logic from app.js
- **Created**: FileLoader service with 11 focused methods
- **Result**: Clean, testable file loading operations
- **app.js size**: 2,906 lines (down from 3,003)
- **Progress toward goal**: Only 406 lines above target (2,500 lines)

**Key Improvements**:
- ✅ File loading is a service (not monolithic function)
- ✅ Dependency injection for testability
- ✅ Reusable across views
- ✅ Loop preservation logic cleanly separated
- ✅ BPM lock handled cleanly
- ✅ Stem pre-loading integrated

**Status**: ⏳ Testing pending

---

**Last Updated**: 2025-10-18
