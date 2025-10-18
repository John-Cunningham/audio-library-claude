# app.js Architecture Audit - October 18, 2025

**File**: `src/core/app.js`
**Total Lines**: 1,896
**Purpose**: Main application coordinator - manages state synchronization and module initialization

---

## Import Analysis

| Line | Import | Type | Purpose |
|------|--------|------|---------|
| 9 | config.js | Core | Supabase client and preference keys |
| 10 | utils.js | Utilities | Helper functions |
| 11 | playerTemplate.js | Template | Generates stem player HTML |
| 12 | PlayerBarComponent | Component | Player control component (class) |
| 13 | WaveformComponent | Component | Waveform display component (class) |
| 14 | FileLoader | Service | File loading service (class) |
| 15 | ActionRecorder | Service | Action recording service (class) |
| 17 | metronome.js | Core | Metronome functionality |
| 18 | keyboardShortcuts.js | Core | Keyboard shortcut handling |
| 19 | progressBar.js | Utility | Progress bar display |
| 20 | miniWaveform.js | Component | Mini waveform renderer |
| 21 | bpmDetector.js | Utility | BPM detection |
| 22 | tagManager.js | Core | Tag management |
| 23 | tagEditModal.js | Component | Tag editing modal |
| 24 | fileProcessor.js | Core | File processing |
| 25 | fileListRenderer.js | View | File list rendering |
| 26 | batchOperations.js | Core | Batch file operations |
| 27 | uploadManager.js | Core | File upload management |
| 28 | **loopControls.js** | **Component** | **Loop/cycle controls** |
| 29 | markerSystem.js | Component | Parent player markers |
| 30 | stemMarkerSystem.js | Component | Stem player markers |
| 31 | **stemPlayerManager.js** | **Component** | **NEW multi-stem player** |
| 32 | **stemLegacyPlayer.js** | **Component** | **LEGACY stem player (deprecated)** |
| 33 | **advancedRateMode.js** | **Component** | **Speed/pitch controls (placeholder)** |
| 35 | **stemStateManager.js** | **State Manager** | **Centralized stem state** |
| 36 | **loopStateManager.js** | **State Manager** | **Centralized loop state** |
| 37 | **playerStateManager.js** | **State Manager** | **Centralized player state** |
| 39 | viewManager.js | Core | Multi-view management |
| 40 | libraryView.js | View | Library view |
| 41 | galaxyView.js | View | Galaxy view |
| 42 | sphereView.js | View | Sphere view |

---

## State Variables (Lines 45-122)

### App-Level State (Local to app.js)
| Lines | Variable | Purpose |
|-------|----------|---------|
| 45-51 | `audioFiles`, `wavesurfer`, `parentWaveform`, `parentPlayerComponent`, `fileLoader`, `actionRecorder`, `stemPlayerComponents` | Core app state |
| 53-55 | `selectedFiles`, `processingFiles`, `expandedStems` | UI state (Sets) |
| 57-62 | **`stemWavesurfers`, `stemFiles`, `allStemFiles`, `stemMuted`, `stemSoloed`, `stemVolumes`** | **LEGACY stem state** |
| 64-66 | `searchQuery`, `currentTagMode`, `showAllTags` | Tag/search state |
| 68 | `pendingUploadFiles` | Upload state |

### Loop State - Hybrid Pattern (Lines 70-94)
**Synced to**: `src/state/loopStateManager.js`

| Lines | Variables (17 total) | Module Reference |
|-------|----------------------|------------------|
| 78 | `loopStart` | `LoopState.getLoopStart()` |
| 79 | `loopEnd` | `LoopState.getLoopEnd()` |
| 80 | `cycleMode` | `LoopState.getCycleMode()` |
| 81 | `nextClickSets` | `LoopState.getNextClickSets()` |
| 82 | `immediateJump` | `LoopState.getImmediateJump()` |
| 83 | `pendingJumpTarget` | `LoopState.getPendingJumpTarget()` |
| 84 | `seekOnClick` | `LoopState.getSeekOnClick()` |
| 85 | `loopControlsExpanded` | `LoopState.getLoopControlsExpanded()` |
| 86 | `loopFadesEnabled` | `LoopState.getLoopFadesEnabled()` |
| 87 | `fadeTime` | `LoopState.getFadeTime()` |
| 88 | `preserveLoopOnFileChange` | `LoopState.getPreserveLoopOnFileChange()` |
| 89 | `preservedLoopStartBar` | `LoopState.getPreservedLoopStartBar()` |
| 90 | `preservedLoopEndBar` | `LoopState.getPreservedLoopEndBar()` |
| 91 | `preservedCycleMode` | `LoopState.getPreservedCycleMode()` |
| 92 | `preservedPlaybackPositionInLoop` | `LoopState.getPreservedPlaybackPositionInLoop()` |
| 93 | `bpmLockEnabled` | `LoopState.getBpmLockEnabled()` |
| 94 | `lockedBPM` | `LoopState.getLockedBPM()` |

### Player State - Hybrid Pattern (Lines 96-121)
**Synced to**: `src/state/playerStateManager.js`

| Lines | Variables (11 total) | Module Reference |
|-------|----------------------|------------------|
| 104 | `currentFileId` | `PlayerState.getCurrentFileId()` |
| 105 | `currentRate` | `PlayerState.getCurrentRate()` |
| 106 | `isShuffling` | `PlayerState.getIsShuffling()` |
| 107 | `userPaused` | `PlayerState.getUserPaused()` |
| 108 | `isMuted` | `PlayerState.getIsMuted()` |
| 109 | `volumeBeforeMute` | `PlayerState.getVolumeBeforeMute()` |
| 110 | `markersEnabled` | `PlayerState.getMarkersEnabled()` |
| 111 | `markerFrequency` | `PlayerState.getMarkerFrequency()` |
| 112 | `barStartOffset` | `PlayerState.getBarStartOffset()` |
| 113 | `currentMarkers` | `PlayerState.getCurrentMarkers()` |
| 114 | `isLooping` | `PlayerState.getIsLooping()` |

---

## Function Sections

### Tag Management (Lines 124-310)
| Lines | Function | Delegates To | Purpose |
|-------|----------|--------------|---------|
| 124-126 | `setTagMode()` | `TagManager.setMode()` | Set tag filter mode |
| 128-132 | `handleSearch()` | `TagManager.render()`, `FileListRenderer.render()` | Search handler |
| 134-149 | `handleSearchKeydown()` | Local | Keyboard navigation |
| 152-183 | `loadData()` | `supabase`, `StemPlayerManager.preloadAllStems()`, `ViewManager` | Load files from database |
| 186-188 | `preloadAllStems()` | `StemPlayerManager.preloadAllStems()` | Preload all stem files |
| 292-310 | Tag helpers | `TagManager.*` | Thin wrappers for tag operations |

### LEGACY Stem Playback (Lines 191-260)
**Status**: DEPRECATED - kept for backward compatibility only

| Lines | Function | Delegates To | Purpose |
|-------|----------|--------------|---------|
| 194-196 | `fetchStemFiles()` | `StemPlayerManager.fetchStemFiles()` | Fetch stem files |
| 198-213 | `destroyAllStems()` | `StemPlayerManager.destroyAllStems()` | Destroy all stem instances |
| 215-217 | `createStemWaveSurfer()` | `StemPlayerManager.createStemWaveSurfer()` | Create legacy stem wavesurfer |
| 219-232 | `loadStems()` | `StemPlayerManager.loadStems()` | Load legacy stems |
| 234-239 | `syncStemsWithMain()` | `StemPlayerManager.syncStemsWithMain()` | Sync legacy stems with parent |
| 241-260 | `updateStemAudioState()` | `StemPlayerManager.updateMultiStemVolumes()`, `StemLegacyPlayer.updateLegacyStemVolumes()` | Update stem volumes |

### Waveform Initialization (Lines 265-289)
| Lines | Function | Delegates To | Purpose |
|-------|----------|--------------|---------|
| 265-289 | `initWaveSurfer()` | `WaveformComponent`, `PlayerBarComponent` | Initialize parent waveform |

### Stem State Sync Functions (Lines 336-530)
**Purpose**: Hybrid state pattern - sync local cache with centralized state managers

| Lines | Section | Module Reference | Variables |
|-------|---------|------------------|-----------|
| 344-386 | **Stem State Sync** | `StemState.*` | 7 variables |
| 390-473 | **Loop State Sync** | `LoopState.*` | 17 variables |
| 477-530 | **Player State Sync** | `PlayerState.*` | 11 variables |

### NEW Multi-Stem Player (Lines 532-802)
**Status**: ACTIVE - This is the working stem player in bottom bar

| Lines | Function | Delegates To | Purpose |
|-------|----------|--------------|---------|
| 537-567 | `preloadMultiStemWavesurfers()` | `StemPlayerManager.preloadMultiStemWavesurfers()` | Preload NEW stem players |
| 569-587 | `toggleMultiStemPlayer()` | `StemPlayerManager.toggleMultiStemPlayer()` | Toggle stem player expansion |
| 589-599 | `generateMultiStemPlayerUI()` | Local | Check UI exists |
| 601-628 | `initializeMultiStemPlayerWavesurfers()` | `StemPlayerManager.initializeMultiStemPlayerWavesurfers()` | Initialize wavesurfers |
| 630-632 | `playAllStems()` | `StemPlayerManager.playAllStems()` | Play all stems |
| 641-652 | `setupParentStemSync()` | `StemPlayerManager.setupParentStemSync()` | Sync parent with stems |
| 655-699 | Multi-stem control wrappers | `stemPlayerComponents[stemType].*` | Delegate to PlayerBarComponent instances |
| 701-720 | `generateStems()` | `TagEditModal.open()` | Open stem generation modal |
| 722-801 | Marker functions | `MarkerSystem`, `StemMarkerSystem`, `stemPlayerComponents` | Manage bar markers |

### Loop/Cycle Controls (Lines 804-1090)
**Delegates to**: `src/components/loopControls.js`

| Lines | Function | Module Reference | Purpose |
|-------|----------|------------------|---------|
| 804-818 | `toggleCycleMode()` | `LoopControls.toggleCycleMode()` | Toggle cycle mode |
| 820-824 | `toggleSeekOnClick()` | `LoopControls.toggleSeekOnClick()` | Toggle seek on click |
| 826-833 | `resetLoop()` | `LoopControls.resetLoop()` | Reset loop points |
| 835-841 | `clearLoopKeepCycle()` | `LoopControls.clearLoopKeepCycle()` | Clear loop keep cycle |
| 843-861 | `updateLoopVisuals()` | `LoopControls.updateLoopVisuals()` | Update loop UI |
| 863-867 | `toggleLoopControlsExpanded()` | `LoopControls.toggleLoopControlsExpanded()` | Toggle advanced controls |
| 869-904 | `updateLoopRegion()` | Local | Draw loop region overlay |
| 906-945 | Loop toggle/fade/preserve/BPM | `LoopControls.*` | Loop settings |
| 947-1000 | Recording functions | `actionRecorder.*` | Action recording |
| 1002-1090 | Loop manipulation | `LoopControls.shiftLoopLeft/Right()`, etc. | Shift/resize loop |

### Metronome (Lines 1093-1099)
| Lines | Function | Module Reference | Purpose |
|-------|----------|------------------|---------|
| 1093-1095 | `toggleMetronome()` | `Metronome.toggleMetronome()` | Toggle metronome |
| 1097-1099 | `setMetronomeSound()` | `Metronome.setMetronomeSound()` | Set metronome sound |

### Core Player Controls (Lines 1101-1314)
**Purpose**: Essential player coordination (NOT thin wrappers)

| Lines | Function | Purpose | Module References |
|-------|----------|---------|-------------------|
| 1104-1115 | `loadAudio()` | Load file via FileLoader | `fileLoader.loadFile()` |
| 1117-1134 | `playPause()` | Play/pause with recording | `wavesurfer.playPause()`, `recordAction()` |
| 1136-1150 | `updatePlayerTime()` | Update time display | `wavesurfer.getCurrentTime()` |
| 1152-1155 | `toggleLoop()` | Toggle loop mode | `LoopControls.toggleLoop()` |
| 1157-1163 | `toggleShuffle()` | Toggle shuffle | Local |
| 1165-1182 | `setVolume()` | Set volume + stem sync | `wavesurfer.setVolume()`, `updateStemAudioState()` |
| 1184-1187 | `resetVolume()` | Reset volume | `setVolume()` |
| 1189-1205 | `toggleMute()` | Mute/unmute | `setVolume()` |
| 1207-1310 | `setPlaybackRate()` | **CRITICAL** - Syncs rate to ALL stems (legacy + new) | `wavesurfer.setPlaybackRate()`, `stemWavesurfers`, `stemPlayerWavesurfers`, `Metronome` |
| 1312-1314 | `resetRate()` | Reset rate to 1.0x | `setPlaybackRate()` |

### Advanced Rate Mode (Lines 1316-1343)
**Status**: PLACEHOLDER - waiting for Signalsmith integration
**Delegates to**: `src/components/advancedRateMode.js`

| Lines | Function | Module Reference | Purpose |
|-------|----------|------------------|---------|
| 1321-1323 | `toggleRateMode()` | `AdvancedRateMode.toggleRateMode()` | Toggle advanced mode |
| 1325-1327 | `setSpeed()` | `AdvancedRateMode.setSpeed()` | Set speed (chipmunk effect) |
| 1329-1331 | `resetSpeed()` | `AdvancedRateMode.resetSpeed()` | Reset speed |
| 1333-1335 | `setPitch()` | `AdvancedRateMode.setPitch()` | Set pitch (not functional) |
| 1337-1339 | `resetPitch()` | `AdvancedRateMode.resetPitch()` | Reset pitch |
| 1341-1343 | `toggleSpeedPitchLock()` | `AdvancedRateMode.toggleSpeedPitchLock()` | Toggle lock |

### LEGACY Stem Controls (Lines 1346-1374)
**Status**: DEPRECATED - thin wrappers for file list stem controls
**Delegates to**: `src/components/stemLegacyPlayer.js`

| Lines | Function | Module Reference | Purpose |
|-------|----------|------------------|---------|
| 1351-1358 | `stemLegacyHandleVolumeChange()` | `StemLegacyPlayer.handleStemVolumeChange()` | Legacy volume control |
| 1360-1366 | `stemLegacyHandleMute()` | `StemLegacyPlayer.handleStemMute()` | Legacy mute control |
| 1368-1374 | `stemLegacyHandleSolo()` | `StemLegacyPlayer.handleStemSolo()` | Legacy solo control |

### Track Navigation (Lines 1377-1415)
| Lines | Function | Purpose | Module References |
|-------|----------|---------|-------------------|
| 1377-1390 | `nextTrack()` | Next track logic | `FileListRenderer.filterFiles()`, `loadAudio()` |
| 1392-1415 | `previousTrack()` | Previous track or loop restart | `FileListRenderer.filterFiles()`, `loadAudio()` |

---

## Module Initialization (Lines 1419-1653)

### Event Handlers (Lines 1423-1432)
| Lines | Module | Purpose |
|-------|--------|---------|
| 1423-1432 | `TagEditModal.initEventHandlers()` | Modal event setup |

### Keyboard Shortcuts (Lines 1435-1482)
| Lines | Module | Purpose |
|-------|--------|---------|
| 1435-1482 | `initKeyboardShortcuts()` | Register keyboard shortcuts |

### Component Initialization (Lines 1484-1562)
| Lines | Module | Init Purpose |
|-------|--------|--------------|
| 1484-1487 | `MiniWaveform.init()` | Mini waveform setup |
| 1489-1503 | `TagManager.init()` | Tag manager setup |
| 1505-1522 | `FileListRenderer.init()` | File list renderer setup |
| 1524-1545 | `BatchOperations.init()` | Batch operations setup |
| 1547-1551 | `UploadManager.init()` | Upload manager setup |
| 1553-1558 | **`LoopControls.init()`** | **Loop controls setup** |
| 1560-1562 | **`AdvancedRateMode.init()`** | **Advanced rate mode setup** |

### Service Initialization (Lines 1564-1650)
| Lines | Service | Purpose |
|-------|---------|---------|
| 1564 | `loadData()` | Load initial data |
| 1566-1613 | `FileLoader` | File loading service |
| 1615-1649 | `ActionRecorder` | Action recording service |
| 1653 | `ViewManager.initViewTabs()` | View tab setup |

---

## Window Object Exposure (Lines 1655-1896)

**Purpose**: Expose functions for HTML onclick handlers and global access

### Categories:
| Lines | Category | Count | Examples |
|-------|----------|-------|----------|
| 1660-1662 | Tag management | 3 | `handleTagClick`, `toggleShowAllTags`, `generateStems` |
| 1664-1665 | Tag manager delegates | 2 | `tagManagerHandleClick`, `tagManagerToggleShowAll` |
| 1667-1671 | File list delegates | 5 | `fileListHandleFileClick`, `fileListHandleSort`, etc. |
| 1672-1675 | Modal delegates | 4 | `addModalTag`, `renderModalTags`, etc. |
| 1676-1680 | Search/tags | 5 | `setTagMode`, `handleSearch`, etc. |
| 1681-1685 | Batch operations | 5 | `selectAll`, `deselectAll`, `batchDelete`, etc. |
| 1686-1720 | Tag modal complex | 2 | `closeEditTagsModal`, `saveEditedTags` |
| 1721-1730 | Core player | 10 | `playPause`, `nextTrack`, `setVolume`, `setPlaybackRate`, etc. |
| 1731-1736 | Advanced rate | 6 | `toggleRateMode`, `setSpeed`, `setPitch`, etc. |
| 1737-1855 | Markers/component | 16 | `toggleMarkers`, `setMarkerFrequency`, etc. |
| 1856-1874 | Loop controls | 19 | `toggleCycleMode`, `shiftLoopLeft`, etc. |
| 1875-1877 | **LEGACY stem controls** | **3** | **`stemLegacyHandleVolumeChange`**, etc. |
| 1878 | File list stem viewer | 1 | `toggleStemsViewer` |
| 1879-1887 | **NEW multi-stem** | **9** | **`toggleMultiStemPlayer`**, etc. |
| 1890-1895 | Stem markers/cycle | 5 | `toggleStemMarkers`, `toggleStemCycleMode`, etc. |

---

## Summary Statistics

### Code Organization
- **Total Lines**: 1,896
- **Import Statements**: 34 modules imported
- **State Variables**: 39 (17 loop, 11 player, 7 stem, 4 app-level)
- **Sync Functions**: 35 (17 loop, 11 player, 7 stem)
- **Main Functions**: ~80
- **Window Exposures**: ~95

### Module Dependencies
| Module Type | Count | Examples |
|-------------|-------|----------|
| **State Managers** | 3 | StemState, LoopState, PlayerState |
| **Component Modules** | 11 | LoopControls, StemLegacyPlayer, AdvancedRateMode, etc. |
| **Service Classes** | 2 | FileLoader, ActionRecorder |
| **View Modules** | 3 | LibraryView, GalaxyView, SphereView |
| **Core Modules** | 15 | TagManager, FileProcessor, ViewManager, etc. |

### Refactoring Progress
| System | Status | Module | Lines in app.js |
|--------|--------|--------|----------------|
| **Loop Controls** | ✅ Extracted | `loopControls.js` | ~22 thin wrappers |
| **Stem State** | ✅ Extracted | `stemStateManager.js` | 7 sync functions |
| **Loop State** | ✅ Extracted | `loopStateManager.js` | 17 sync functions |
| **Player State** | ✅ Extracted | `playerStateManager.js` | 11 sync functions |
| **Advanced Rate Mode** | ✅ Extracted | `advancedRateMode.js` | 6 thin wrappers |
| **LEGACY Stem Controls** | ✅ Extracted | `stemLegacyPlayer.js` | 3 thin wrappers |
| **NEW Multi-Stem Player** | ✅ Extracted | `stemPlayerManager.js` | Coordination only |

---

## Architecture Assessment

### ✅ Clean Separation
1. **State Management**: Hybrid pattern working correctly (local cache + centralized managers)
2. **Component Modules**: Well-isolated functionality (Loop, Stem, AdvancedRate)
3. **Service Classes**: FileLoader, ActionRecorder properly encapsulated
4. **View Modules**: Multi-view architecture ready

### ⚠️ Areas of Concern
1. **LEGACY stem system** (lines 191-260, 1346-1374, stemWavesurfers state):
   - Still present but deprecated
   - Kept for backward compatibility
   - Can be removed when 🎛️ icon redirects to NEW stem player

2. **setPlaybackRate()** function (lines 1207-1310):
   - 103 lines - complex coordination
   - Syncs rate to parent + legacy stems + new stems + metronome
   - **NECESSARY** coordination code - cannot be simplified further

3. **Window object exposure** (lines 1655-1896):
   - 241 lines of window exposure
   - Required for HTML onclick handlers
   - Could potentially be reduced with event delegation

### ✅ Core Strengths
1. **Thin wrapper pattern**: Most functions are 3-7 line wrappers that delegate
2. **Dependency injection**: State managers and modules use DI pattern
3. **Modular architecture**: Clear separation of concerns
4. **Hybrid state pattern**: Best of both worlds (performance + persistence)

---

## Recommendations

### Immediate (Pre-Migration)
1. ✅ **DONE** - All state managers extracted
2. ✅ **DONE** - All component modules extracted
3. ✅ **COMPLETE** - Legacy stem controls extracted to module

### Future (Post-Migration)
1. **Remove legacy stem system** when 🎛️ icon redirects to NEW player:
   - Remove `stemWavesurfers` state
   - Remove lines 191-260 (legacy functions)
   - Remove lines 1346-1374 (legacy control wrappers)
   - Remove lines 1875-1877 (window exposure)
   - Update `setPlaybackRate()` to remove legacy stem sync

2. **Consider event delegation** for window exposure reduction:
   - Attach one listener to parent element
   - Reduce window.* assignments from ~95 to ~10

3. **Extract coordination logic**:
   - `setPlaybackRate()` could become `RateCoordinator` module
   - Keeps complex multi-system sync logic isolated

---

## Conclusion

**app.js is now a well-organized coordinator** with:
- Clear module boundaries
- Proper dependency injection
- Hybrid state pattern for performance + persistence
- Thin wrappers that delegate to specialized modules

**Ready for migration** to new clean directory structure! ✅

---

**Generated**: October 18, 2025
**Audit Version**: Post-V29 Refactoring + Legacy Stem Extraction
