# Function Inventory: app.js

**Total Lines**: 7037
**Purpose**: This inventory categorizes ALL functions in app.js to identify what needs to be extracted/refactored.

---

## 1. Player Control Functions (Parent Player)

Functions that control playback, markers, loop, metronome, etc. for the parent player.

| Function Name | Line | Description |
|---------------|------|-------------|
| `initWaveSurfer()` | 503 | Initialize parent WaveSurfer instance with event handlers |
| `loadAudio(fileId, autoplay)` | 5420 | Load audio file into parent player, handle stems pre-loading |
| `playPause()` | 5591 | Toggle play/pause on parent player |
| `updatePlayerTime()` | 5616 | Update time display for parent player |
| `previousTrack()` | 5986 | Navigate to previous track (or jump to loop start if in cycle mode) |
| `nextTrack()` | 5970 | Navigate to next track (or random if shuffle enabled) |
| `setVolume(value)` | 5661 | Set parent player volume (also updates stem volumes) |
| `resetVolume()` | 5682 | Reset parent player volume to 100% |
| `toggleMute()` | 5688 | Toggle mute on parent player |
| `setPlaybackRate(rate)` | 5708 | Set playback rate for parent (also updates stem rates) |
| `resetRate()` | 5830 | Reset playback rate to 1.0x |
| `toggleLoop()` | 5633 | Toggle track loop (repeat current track) |
| `toggleShuffle()` | 5651 | Toggle shuffle mode |

### Marker Functions (Parent)
| Function Name | Line | Description |
|---------------|------|-------------|
| `addBarMarkers(file)` | 3689 | Add bar/beat markers to parent waveform based on beatmap data |
| `toggleMarkers()` | 4047 | Toggle markers on/off for parent player |
| `setMarkerFrequency(freq)` | 4069 | Set marker frequency (bar8/bar4/bar2/bar/halfbar/beat) |
| `shiftBarStartLeft()` | 4107 | Shift bar start offset left (renumber bars) |
| `shiftBarStartRight()` | 4139 | Shift bar start offset right (renumber bars) |
| `getShiftIncrement()` | 4094 | Get increment value based on marker frequency |
| `findNearestMarkerToLeft(clickTime)` | 4171 | Find nearest marker to left of given time |

### Loop/Cycle Mode Functions (Parent)
| Function Name | Line | Description |
|---------------|------|-------------|
| `toggleCycleMode()` | 4493 | Toggle cycle mode (edit + active loop) |
| `toggleSeekOnClick()` | 4542 | Toggle seek mode (off/seek/clock) |
| `resetLoop()` | 4555 | Clear loop points and disable cycle mode |
| `clearLoopKeepCycle()` | 4564 | Clear loop points but keep cycle mode enabled |
| `updateLoopVisuals()` | 4573 | Update all loop-related UI elements |
| `toggleLoopControlsExpanded()` | 4743 | Toggle expanded loop controls panel |
| `updateLoopRegion()` | 4749 | Update visual loop region overlay on waveform |
| `shiftLoopLeft()` | 5060 | Shift loop region left by loop duration |
| `shiftLoopRight()` | 5106 | Shift loop region right by loop duration |
| `halfLoopLength()` | 5154 | Halve the loop length |
| `doubleLoopLength()` | 5184 | Double the loop length |
| `moveStartLeft()` | 5218 | Move loop start marker left to previous marker |
| `moveStartRight()` | 5314 | Move loop start marker right to next marker |
| `moveEndLeft()` | 5361 | Move loop end marker left to previous marker |
| `moveEndRight()` | 5266 | Move loop end marker right to next marker |
| `toggleImmediateJump()` | 4789 | Toggle jump mode (off/on/clock) |
| `toggleLoopFades()` | 4802 | Toggle loop fade in/out |
| `setFadeTime(milliseconds)` | 4808 | Set fade time duration |
| `togglePreserveLoop()` | 4819 | Toggle preserve loop across file changes |
| `toggleBPMLock()` | 4825 | Toggle BPM lock across file changes |
| `getBarIndexAtTime(time, file)` | 5026 | Get bar marker index at given time |
| `getTimeForBarIndex(barIndex, file)` | 5049 | Get time for given bar marker index |

### Loop Action Recording (Parent)
| Function Name | Line | Description |
|---------------|------|-------------|
| `toggleRecordActions()` | 4846 | Start/stop recording user actions |
| `recordAction(actionName, data)` | 4868 | Record a single action with timestamp |
| `playRecordedActions()` | 4896 | Play back recorded actions |
| `stopPlayback()` | 4885 | Stop action playback |

### Metronome Functions (Parent)
| Function Name | Line | Description |
|---------------|------|-------------|
| `toggleMetronome()` | 5412 | Wrapper for Metronome.toggleMetronome() |
| `setMetronomeSound(sound)` | 5416 | Wrapper for Metronome.setMetronomeSound() |

### Advanced Rate/Pitch Functions (Placeholder)
| Function Name | Line | Description |
|---------------|------|-------------|
| `toggleRateMode()` | 5844 | Toggle between simple rate and advanced speed/pitch mode |
| `setSpeed(speed)` | 5866 | Set speed (placeholder for future Signalsmith integration) |
| `resetSpeed()` | 5879 | Reset speed to 1.0x |
| `setPitch(semitones)` | 5884 | Set pitch in semitones (placeholder) |
| `resetPitch()` | 5892 | Reset pitch to 0 semitones |
| `toggleSpeedPitchLock()` | 5897 | Toggle speed/pitch lock |

---

## 2. Stem Control Functions

Functions that control stem players (vocals, drums, bass, other).

### OLD Stem System (Disabled at line 4163)
| Function Name | Line | Description |
|---------------|------|-------------|
| `fetchStemFiles(parentFileId)` | 213 | Fetch stem files from database for parent file |
| `destroyAllStems()` | 239 | Destroy all OLD + NEW stem WaveSurfer instances |
| `createStemWaveSurfer(stemType)` | 294 | Create hidden WaveSurfer for single stem (OLD system) |
| `loadStems(parentFileId, autoplay)` | 330 | Load and sync all stems for file (OLD system) |
| `syncStemsWithMain(autoplay)` | 377 | Sync OLD stem WaveSurfers with parent events |
| `updateStemAudioState()` | 440 | Apply solo/mute logic to OLD stem players |

### NEW Multi-Stem Player System (Phase 1+)
| Function Name | Line | Description |
|---------------|------|-------------|
| `preloadMultiStemWavesurfers(fileId)` | 2447 | Pre-load stems silently when file loads (Phase 1) |
| `toggleMultiStemPlayer()` | 2651 | Toggle multi-stem player expanded/collapsed (instant mute/unmute) |
| `generateMultiStemPlayerUI()` | 2777 | Show pre-loaded UI (Phase 1 - essentially no-op) |
| `initializeMultiStemPlayerWavesurfers()` | 2792 | Initialize WaveSurfer instances for stems (OLD - replaced by preload) |
| `playAllStems()` | 2954 | Play all stem WaveSurfers |
| `pauseAllStems()` | 2969 | Pause all stem WaveSurfers |
| `setupParentStemSync()` | 2983 | Set up sync between parent and stem players |
| `destroyMultiStemPlayerWavesurfers()` | 3070 | Destroy all NEW multi-stem WaveSurfers |
| `toggleMultiStemPlay(stemType)` | 3099 | Toggle play/pause for individual stem |
| `toggleMultiStemMute(stemType)` | 3123 | Toggle mute for individual stem |
| `toggleMultiStemLoop(stemType)` | 3163 | Toggle cycle mode for individual stem |
| `handleMultiStemVolumeChange(stemType, value)` | 3384 | Handle volume change for individual stem |

### Stem Rate Control (Phase 2A)
| Function Name | Line | Description |
|---------------|------|-------------|
| `calculateStemFinalRate(stemType)` | 3423 | Calculate final rate (independent × parent) |
| `updateStemRateDisplay(stemType, finalRate)` | 3440 | Update stem rate/BPM display |
| `updateStemRateSlider(stemType, sliderValue)` | 3456 | Update stem rate slider position |
| `updateLockButton(stemType, isLocked)` | 3466 | Update lock button visual state |
| `handleStemRateChange(stemType, sliderValue)` | 3484 | Handle stem rate slider change |
| `setStemRatePreset(stemType, presetRate)` | 3515 | Set stem rate to preset (0.5x, 1x, 2x) |
| `toggleStemRateLock(stemType)` | 3546 | Toggle lock/unlock for stem rate |

### Stem Loop/Cycle Control (Phase 2B)
| Function Name | Line | Description |
|---------------|------|-------------|
| `setStemLoopRegion(stemType, startTime, endTime)` | 3169 | Set loop region for individual stem |
| `toggleStemCycleMode(stemType)` | 3179 | Toggle cycle mode for individual stem |
| `setupStemCycleModeClickHandler(stemType, container, ws)` | 3215 | Set up click handler for stem cycle mode |
| `updateStemLoopVisuals(stemType)` | 3314 | Update stem loop visuals (button, status, region) |
| `updateStemLoopRegion(stemType)` | 3353 | Update stem loop region overlay |

### Stem Markers (Version 27d)
| Function Name | Line | Description |
|---------------|------|-------------|
| `toggleStemMarkers(stemType)` | 4192 | Toggle markers for individual stem |
| `setStemMarkerFrequency(stemType, freq)` | 4226 | Set marker frequency for individual stem |
| `getStemShiftIncrement(stemType)` | 4250 | Get shift increment for stem based on frequency |
| `shiftStemBarStartLeft(stemType)` | 4263 | Shift stem bar start left |
| `shiftStemBarStartRight(stemType)` | 4294 | Shift stem bar start right |
| `addStemBarMarkers(stemType, file)` | 4325 | Add bar markers to stem waveform |
| `findStemNearestMarkerToLeft(stemType, clickTime)` | 4475 | Find nearest marker to left for stem |

### OLD Stem Functions (Fallback implementations)
| Function Name | Line | Description |
|---------------|------|-------------|
| `_oldToggleStemMarkers(stemType)` | 4204 | OLD implementation of toggleStemMarkers |
| `_oldSetStemMarkerFrequency(stemType, freq)` | 4238 | OLD implementation of setStemMarkerFrequency |
| `_oldShiftStemBarStartLeft(stemType)` | 4275 | OLD implementation of shiftStemBarStartLeft |
| `_oldShiftStemBarStartRight(stemType)` | 4306 | OLD implementation of shiftStemBarStartRight |

### Stem UI Functions (In-File Browser - Phase 4 Step 2B)
| Function Name | Line | Description |
|---------------|------|-------------|
| `renderStemWaveforms(fileId)` | 3579 | Render visual waveforms in expansion containers |
| `restoreStemControlStates(fileId)` | 3628 | Restore control states after re-expansion |
| `handleStemVolumeChange(stemType, value)` | 5913 | Handle volume change in file browser expansion |
| `handleStemMute(stemType)` | 5932 | Handle mute toggle in file browser expansion |
| `handleStemSolo(stemType)` | 5951 | Handle solo toggle in file browser expansion |
| `openStemsViewer(fileId, event)` | 2206 | Toggle stem expansion in file browser |
| `toggleStemsViewer()` | 2230 | Toggle stem expansion from bottom player bar |
| `updateStemsButton()` | 2256 | Update STEMS button visibility and state |
| `generateStems(fileId, event)` | 3664 | Open processing modal to generate stems |

---

## 3. Library View Functions

File browser, file list rendering, file selection.

| Function Name | Line | Description |
|---------------|------|-------------|
| `renderFiles()` | 1812 | Render file list with sorting, filtering, and waveforms |
| `renderMiniWaveforms(files)` | 2052 | Render mini waveforms for each file |
| `handleFileClick(fileId, event)` | 2117 | Handle file click (normal/range/multi-select) |
| `quickEditFile(fileId, event)` | 2183 | Open edit modal for single file |
| `sortFiles(files)` | 1763 | Sort files by name/date/bpm/key/length |
| `handleSort(column)` | 1801 | Handle sort column click |
| `filterFiles()` | 1641 | Filter files based on tags and search query |
| `handleSearch(query)` | 115 | Handle search input |
| `handleSearchKeydown(e)` | 121 | Handle keyboard navigation in search |

### File Selection Functions
| Function Name | Line | Description |
|---------------|------|-------------|
| `toggleFileSelection(fileId, event)` | 1690 | Toggle file selection checkbox |
| `updateSelectionUI()` | 1701 | Update selection UI (checkboxes, batch buttons) |
| `selectAll()` | 1750 | Select all visible files |
| `deselectAll()` | 1757 | Deselect all files |

### File Upload Functions
| Function Name | Line | Description |
|---------------|------|-------------|
| `openUploadFlow()` | 866 | Open file upload flow |
| `openUploadTagModal()` | 884 | Open tag modal for upload |
| `performUpload(files, sharedTags)` | 1115 | Perform the actual upload |
| `uploadAudio()` | 1232 | Upload audio (old function, kept for compatibility) |
| `loadProcessingPreferences()` | 831 | Load processing prefs from localStorage |
| `saveProcessingPreferences()` | 842 | Save processing prefs to localStorage |

### File Delete Functions
| Function Name | Line | Description |
|---------------|------|-------------|
| `deleteFile(fileId, event)` | 6015 | Delete single file |
| `batchDelete()` | 6070 | Delete multiple selected files |

### File Processing Functions
| Function Name | Line | Description |
|---------------|------|-------------|
| `runSelectedProcessing(fileIds, options)` | 1018 | Run selected processing tasks with progress |
| `batchDetect()` | 6201 | Batch detect BPM/Key/Instruments |
| `batchSeparateStems()` | 6259 | Batch separate stems |

---

## 4. Tag Management Functions

Tag filtering, tag editing, tag display.

| Function Name | Line | Description |
|---------------|------|-------------|
| `renderTags(searchQuery)` | 1412 | Render tag cloud with counts |
| `getAllTags()` | 1312 | Get all unique tags with counts |
| `getTagCount(tag, files)` | 1330 | Get count for specific tag |
| `handleTagClick(tag, event)` | 1335 | Handle tag click (canHave/mustHave/exclude) |
| `setTagMode(mode)` | 95 | Set tag click mode for mobile |
| `selectAllVisibleTags()` | 1380 | Select all visible tags |
| `deselectAllTags()` | 1402 | Deselect all tags |
| `toggleShowAllTags()` | 1521 | Toggle showing low-count tags |
| `updateActiveFiltersDisplay()` | 1623 | Update active filters display text |

### Tag Modal Functions
| Function Name | Line | Description |
|---------------|------|-------------|
| `batchEditTags()` | 6137 | Open edit tags modal for selected files |
| `saveEditedTags()` | 921 | Save tag edits (handles upload + edit modes) |
| `closeEditTagsModal()` | 6453 | Close edit tags modal |
| `renderModalTags()` | 6386 | Render tag pills in modal |
| `selectModalTag(tag)` | 6430 | Select/deselect tag pill in modal |
| `removeSelectedModalTag()` | 6440 | Remove selected tag from modal |
| `addModalTag(tag)` | 6572 | Add tag to modal |

---

## 5. State Management Functions

Managing global state, preferences, data loading.

| Function Name | Line | Description |
|---------------|------|-------------|
| `loadData()` | 142 | Load audio files from Supabase and initialize views |
| `preloadAllStems()` | 180 | Preload all stem files from database (Phase 4 Fix 1) |

---

## 6. Utility Functions

Helper functions used across the app.

| Function Name | Line | Description |
|---------------|------|-------------|
| `extractTagsFromFilename(filename)` | 668 | Auto-extract tags, BPM, key from filename |
| `getAudioDuration(file)` | 730 | Get duration of audio file |
| `calculateBPMFromOnsets(onsets, duration)` | 750 | Calculate BPM from onset positions (placeholder) |
| `getAllBPMs()` | 1527 | Get all unique BPMs with counts |
| `getAllKeys()` | 1542 | Get all unique keys with counts |
| `handleBPMClick(bpm, event)` | 1557 | Handle BPM filter click |
| `handleKeyClick(key, event)` | 1571 | Handle key filter click |
| `renderBPMs()` | 1585 | Render BPM filters |
| `renderKeys()` | 1604 | Render key filters |

### Progress Bar Functions
| Function Name | Line | Description |
|---------------|------|-------------|
| `showProgressBar(text, current, total)` | 6319 | Show progress bar with text |
| `hideProgressBar()` | 6328 | Hide progress bar |
| `startProgressAnimation(estimatedSeconds)` | 6340 | Animate progress bar over estimated time |
| `completeProgress()` | 6360 | Complete progress bar (100%) |
| `updateProgress(current, total, statusText)` | 6372 | Update progress text and counter |
| `showProgressModal(title, files)` | 6368 | Not used (compatibility) |
| `updateQueueItem(fileId, status, errorMessage)` | 6377 | Not used (compatibility) |
| `closeProgressModal()` | 6381 | Not used (compatibility) |

---

## 7. Initialization Functions

Setup, init code, event handlers.

| Function Name | Line | Description |
|---------------|------|-------------|
| `initWaveSurfer()` | 503 | Initialize parent WaveSurfer (also in Player Control) |
| `loadData()` | 142 | Load data on startup (also in State Management) |

### Global Event Listeners
| Line Range | Description |
|------------|-------------|
| 856-863 | Processing preferences change listeners |
| 873-881 | File input change listener (upload flow) |
| 6482-6569 | Tag input modal event listeners |
| 6603-6856 | Global keyboard shortcuts |

---

## 8. Event Handlers (DOM)

DOM event handlers for user interactions.

Most event handlers are defined inline in the global keyboard shortcuts section (6603-6856) or within component initialization (6482-6569 for tag modal).

### Keyboard Shortcuts
| Key | Line | Function |
|-----|------|----------|
| Space | 6726 | Play/pause |
| M | 6734 | Toggle markers |
| K | 6740 | Toggle metronome |
| Enter | 6746 | Open edit tags for current file |
| C | 6764 | Toggle cycle mode |
| F | 6770 | Focus search field |
| -/_ | 6776 | Decrease volume by 10% |
| +/= | 6788 | Increase volume by 10% |
| L | 6802 | Toggle loop (Shift+L = reset loop) |
| R | 6813 | Toggle shuffle |
| J | 6819 | Toggle immediate jump mode |
| ,/< | 6824 | Previous track |
| ./> | 6832 | Next track |
| S | 6839 | Toggle shuffle |
| H | 6845 | Half loop length |
| D | 6851 | Double loop length |
| Arrow Left | 6660 | Previous track / Shift loop left / Move start left (with Shift) |
| Arrow Right | 6674 | Next track / Shift loop right / Move start right (with Shift) |
| Arrow Up | 6688 | Play previous file / Double loop / Move end right (with Shift) |
| Arrow Down | 6707 | Play next file / Half loop / Move end left (with Shift) |

---

## 9. Window Exports (Global Scope)

Functions exposed to global scope for HTML onclick handlers.

| Line Range | Description |
|------------|-------------|
| 6865-7037 | All window.* exports for onclick handlers |

**Key exports include**:
- File/Tag/Search handlers
- Player controls (play/pause/volume/rate)
- Loop/Cycle controls
- Marker controls
- Stem controls
- Modal functions

---

## Summary Statistics

**Estimated Function Counts by Category:**
1. **Player Control Functions (Parent)**: ~45 functions
2. **Stem Control Functions**: ~50 functions
3. **Library View Functions**: ~25 functions
4. **Tag Management Functions**: ~15 functions
5. **State Management Functions**: ~2 functions
6. **Utility Functions**: ~15 functions
7. **Initialization Functions**: ~2 functions
8. **Event Handlers**: ~1 global listener section

**Total**: ~154 named functions (not counting inline handlers)

---

## Refactoring Priorities

### HIGH PRIORITY (Must Extract)
1. **All Stem Control Functions** → `stemPlayer.js` component
2. **All Player Control Functions** → `PlayerBarComponent` class
3. **All Marker Functions** → `PlayerBarComponent` class

### MEDIUM PRIORITY (Should Extract)
1. **Loop/Cycle Mode Functions** → `PlayerBarComponent` class
2. **Tag Management Functions** → `tagManager.js` module
3. **File Browser Functions** → `libraryView.js` (already partially done)

### LOW PRIORITY (Can Stay in app.js)
1. **Utility Functions** (generic helpers)
2. **State Management Functions** (app-level coordination)
3. **Initialization Functions** (app-level setup)

---

## Current Component Structure (Work in Progress)

### Existing Components
- `PlayerBarComponent` (`src/components/playerBar.js`) - Being migrated
- `WaveformComponent` (`src/components/waveform.js`) - Planned
- `LibraryView` (`src/views/libraryView.js`) - Partial extraction

### Needed Components/Modules
- `StemPlayerComponent` - For individual stem players
- `TagManager` - For tag filtering/editing
- `LoopController` - For cycle mode logic
- `MetronomeController` - Already extracted to `metronome.js`

---

**Last Updated**: 2025-10-17
