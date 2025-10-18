# Phase 6 & 7 Detailed Explanation

**Date**: 2025-10-18
**Current Status**: Phase 8 (Marker Cleanup) complete
**Current app.js size**: 3,083 lines
**Target**: 2,000-2,500 lines
**Remaining work**: ~583-1,083 lines to remove

---

## Phase 6: File Manager Extraction (~400 lines)

### What We're Extracting

The "File Manager" isn't a single module - it's a collection of file lifecycle operations currently scattered in app.js:

**Primary Target**: `loadAudio(fileId, autoplay)` function
- **Location**: app.js lines 2119-2287
- **Size**: ~171 lines
- **Complexity**: High - handles entire file loading lifecycle

**Secondary Targets**: Related file operations (~230 lines total)
- `deleteFile(fileId)` - Delete files from library
- `handleFileRename(fileId, event)` - Rename files
- `handleFileDrop(event)` - Drag-and-drop file handling
- `handleFileSelection(files)` - File input selection
- `saveCurrentPlaybackPosition()` - Save playback position to database

### What `loadAudio()` Currently Does (171 lines):

```javascript
function loadAudio(fileId, autoplay = true) {
    // 1. Find file in audioFiles array
    // 2. Check if already loaded (avoid reload)

    // 3. Loop Preservation System (~30 lines)
    //    - If preserve mode ON and loop exists:
    //      - Save current loop as bar indices (not time)
    //      - Save current playback position within loop
    //      - Save cycle mode state

    // 4. Update Global State
    //    - Set currentFileId
    //    - Reset barStartOffset to 0

    // 5. Destroy Old Wavesurfer (~10 lines)
    //    - Pause, stop, destroy parent wavesurfer
    //    - Destroy all stem wavesurfers

    // 6. Initialize New Wavesurfer
    //    - Call initWaveSurfer()
    //    - Apply current volume
    //    - Apply current playback rate

    // 7. Load Audio File
    //    - wavesurfer.load(file.file_url)
    //    - Update player UI (filename, time display, play icon)

    // 8. Setup 'ready' Event Handler (~75 lines)
    //    - Restore parent volume
    //    - Load file into parent player component (markers)
    //    - BPM Lock: Auto-adjust rate if locked BPM is set
    //    - Loop Restoration: Restore preserved loop from bar indices
    //    - Stem Pre-loading: Pre-load stems in background if available
    //    - Auto-play if requested

    // 9. Update UI
    //    - Highlight active file in list
    //    - Update STEMS button visibility
}
```

### Why Extract It?

**Problems with current implementation**:
1. **Monolithic** - 171 lines doing too many things
2. **Hard to test** - Depends on global state, DOM, wavesurfer instance
3. **Not reusable** - Only works in Library view
4. **Mixed concerns** - UI updates, state management, audio loading all mixed together

**After extraction** (proposed architecture):

```javascript
// NEW: src/services/fileLoader.js
export class FileLoader {
    constructor(dependencies) {
        this.audioFiles = dependencies.audioFiles;
        this.wavesurferFactory = dependencies.wavesurferFactory;
        this.stemManager = dependencies.stemManager;
        this.loopPreserver = dependencies.loopPreserver;
    }

    async loadFile(fileId, options = {}) {
        // 1. Validate file exists
        // 2. Check if already loaded
        // 3. Preserve loop if enabled
        // 4. Destroy old instances
        // 5. Create new wavesurfer
        // 6. Load audio file
        // 7. Setup event handlers
        // 8. Return loaded state

        return {
            file,
            wavesurfer,
            loopState,
            stemState
        };
    }
}

// app.js becomes a THIN WRAPPER:
async function loadAudio(fileId, autoplay = true) {
    const result = await fileLoader.loadFile(fileId, { autoplay });

    // Update app.js state
    currentFileId = result.file.id;
    wavesurfer = result.wavesurfer;
    loopStart = result.loopState.start;
    loopEnd = result.loopState.end;

    // Update UI
    updatePlayerUI(result);
    updateFileListUI(fileId);
}
```

### Benefits:
- **Testable** - FileLoader is a class with injected dependencies
- **Reusable** - Works in Library, Galaxy, Sphere views
- **Maintainable** - Clear separation of concerns
- **Extensible** - Easy to add new features (e.g., crossfade between files)

---

## Phase 7: Waveform Component Extraction (~170 lines)

### What We're Extracting

**Primary Target**: `initWaveSurfer()` function
- **Location**: app.js lines 306-468
- **Size**: ~171 lines
- **Complexity**: High - creates wavesurfer and sets up ALL event listeners

### What `initWaveSurfer()` Currently Does (171 lines):

```javascript
function initWaveSurfer() {
    // 1. Create WaveSurfer Instance (~20 lines)
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#666666',
        progressColor: '#4a9eff',
        // ... 15+ config options
    });

    // 2. Create/Update Parent Player Component (~12 lines)
    if (!parentPlayerComponent) {
        parentPlayerComponent = new PlayerBarComponent({
            playerType: 'parent',
            waveform: wavesurfer
        });
        parentPlayerComponent.init();
    } else {
        parentPlayerComponent.waveform = wavesurfer;
    }

    // 3. Setup Event Listeners (~140 lines)

    // 3a. 'finish' event (~5 lines)
    wavesurfer.on('finish', () => {
        if (isLooping) {
            wavesurfer.play();
        } else {
            nextTrack();
        }
    });

    // 3b. 'pause' event (~4 lines)
    wavesurfer.on('pause', () => {
        Metronome.stopAllMetronomeSounds();
        Metronome.setLastMetronomeScheduleTime(0);
    });

    // 3c. 'play' event (~3 lines)
    wavesurfer.on('play', () => {
        Metronome.setLastMetronomeScheduleTime(0);
    });

    // 3d. 'ready' event (~10 lines)
    wavesurfer.on('ready', () => {
        updatePlayerTime();
        // Re-establish parent-stem sync
        if (Object.keys(stemPlayerWavesurfers).length > 0) {
            setupParentStemSync();
        }
    });

    // 3e. 'audioprocess' event (~75 lines) - LARGEST EVENT HANDLER
    wavesurfer.on('audioprocess', () => {
        updatePlayerTime();

        // Handle clock-quantized jump (~20 lines)
        if (pendingJumpTarget !== null && markersEnabled) {
            // Find if we crossed a beat marker
            // Execute jump if so
        }

        // Handle loop-between-markers (~40 lines)
        if (cycleMode && loopStart !== null && loopEnd !== null) {
            const currentTime = wavesurfer.getCurrentTime();

            // Apply fades at loop boundaries if enabled
            if (loopFadesEnabled) {
                // Fade out before loop end
                // Fade in after loop start
            }

            // Seek back to loop start when we reach loop end
            if (currentTime >= loopEnd) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
            }
        }

        // Schedule metronome clicks (~10 lines)
        if (Metronome.isMetronomeEnabled() && wavesurfer.isPlaying()) {
            // Schedule every 0.5 seconds
        }
    });

    // 3f. 'seeking' event (~5 lines)
    wavesurfer.on('seeking', () => {
        updatePlayerTime();
        Metronome.stopAllMetronomeSounds();
    });

    // 3g. 'error' event (~3 lines)
    wavesurfer.on('error', (error) => {
        console.error('WaveSurfer error:', error);
    });

    // 4. Enable player UI
    document.getElementById('bottomPlayer').classList.remove('disabled');
}
```

### Why Extract It?

**Problems with current implementation**:
1. **Event handlers mixed with initialization** - Hard to read and maintain
2. **Global state dependencies** - References `loopStart`, `loopEnd`, `cycleMode`, etc.
3. **Not reusable** - Hardcoded to parent player only
4. **Complex loop logic** - 75-line `audioprocess` handler doing too much

**After extraction** (proposed architecture):

You already have `src/components/waveform.js` - we'll enhance it:

```javascript
// ENHANCED: src/components/waveform.js
export class WaveformComponent {
    constructor(options) {
        this.container = options.container; // '#waveform' or '#multi-stem-waveform-vocals'
        this.playerType = options.playerType; // 'parent' or 'stem'
        this.stemType = options.stemType; // 'vocals', 'drums', etc. (if stem)
        this.wavesurfer = null;

        // Dependencies (injected)
        this.metronome = options.metronome;
        this.loopManager = options.loopManager;
    }

    create(WaveSurfer, config) {
        // Create wavesurfer instance
        this.wavesurfer = WaveSurfer.create({
            container: this.container,
            ...config
        });

        // Setup all event listeners
        this.setupEventListeners();

        return this.wavesurfer;
    }

    setupEventListeners() {
        this.setupFinishHandler();
        this.setupPauseHandler();
        this.setupPlayHandler();
        this.setupReadyHandler();
        this.setupAudioProcessHandler(); // Complex loop/metronome logic
        this.setupSeekingHandler();
        this.setupErrorHandler();
    }

    setupAudioProcessHandler() {
        this.wavesurfer.on('audioprocess', () => {
            this.updateTime();
            this.handleClockJump();
            this.handleLoopCycle(); // Delegates to loopManager
            this.handleMetronome(); // Delegates to metronome
        });
    }

    handleLoopCycle() {
        // Get loop state from loopManager
        const loopState = this.loopManager.getLoopState();
        if (!loopState.enabled) return;

        const currentTime = this.getCurrentTime();

        // Apply fades if enabled
        if (loopState.fadesEnabled) {
            this.applyLoopFades(currentTime, loopState);
        }

        // Seek back if we reached loop end
        if (currentTime >= loopState.end) {
            this.seekTo(loopState.start / this.getDuration());
        }
    }

    destroy() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
            this.wavesurfer = null;
        }
    }
}

// app.js becomes a THIN WRAPPER:
function initWaveSurfer() {
    // Create parent waveform component if doesn't exist
    if (!parentWaveform) {
        parentWaveform = new WaveformComponent({
            container: '#waveform',
            playerType: 'parent',
            metronome: Metronome,
            loopManager: loopManager
        });
    }

    // Create wavesurfer instance
    wavesurfer = parentWaveform.create(WaveSurfer, {
        waveColor: '#666666',
        progressColor: '#4a9eff',
        // ... config
    });

    // Create parent player bar component
    if (!parentPlayerComponent) {
        parentPlayerComponent = new PlayerBarComponent({
            playerType: 'parent',
            waveform: wavesurfer
        });
        parentPlayerComponent.init();
    }
}
```

### Current Waveform Component Status

Looking at your existing `src/components/waveform.js`, it already has:
- Basic structure (class with constructor)
- Some event handler placeholders

**Phase 7 will**:
1. Move the 171-line `initWaveSurfer()` logic into `WaveformComponent.create()`
2. Break up event handlers into separate methods
3. Extract loop logic into a `LoopManager` service (optional)
4. Extract metronome scheduling into `Metronome` service (already exists)
5. Make it work for BOTH parent and stem players

### Benefits:
- **Reusable** - ONE component class for parent + 4 stems
- **Testable** - Event handlers are methods that can be unit tested
- **Maintainable** - Event handlers separated into focused methods
- **Extensible** - Easy to add new event handlers or modify existing ones

---

## Comparison: Phase 6 vs Phase 7

| Aspect | Phase 6 (File Manager) | Phase 7 (Waveform Component) |
|--------|------------------------|------------------------------|
| **Lines** | ~400 lines total | ~171 lines |
| **Complexity** | Medium-High | High |
| **Main Function** | `loadAudio()` | `initWaveSurfer()` |
| **Target Module** | NEW `FileLoader` class | ENHANCE `WaveformComponent` |
| **Dependencies** | audioFiles, supabase, wavesurfer | WaveSurfer lib, metronome, loop manager |
| **Reusability** | Works across all views | Works for parent + stems |
| **Impact** | Cleans up file lifecycle | Cleans up wavesurfer lifecycle |

---

## Recommended Order

**Option A: Phase 6 First** (File Manager)
- **Pros**: Clears out more lines (~400 vs ~171)
- **Pros**: Easier to test (less event-driven logic)
- **Cons**: File loading still depends on `initWaveSurfer()` being in app.js

**Option B: Phase 7 First** (Waveform Component)
- **Pros**: Creates foundation for Phase 6 (FileLoader can use WaveformComponent)
- **Pros**: More architectural impact (component-based waveform)
- **Cons**: More complex (event handlers, state management)

**Recommendation**: **Phase 7 first, then Phase 6**

**Reasoning**:
1. `loadAudio()` calls `initWaveSurfer()` (line 2185)
2. If we extract `initWaveSurfer()` first, then `loadAudio()` can delegate to `WaveformComponent.create()`
3. This makes Phase 6 cleaner (FileLoader can use WaveformComponent as dependency)

---

## After Phase 6 & 7

**Estimated app.js size**:
- Current: 3,083 lines
- After Phase 7: ~2,912 lines (-171)
- After Phase 6: ~2,512 lines (-400)

**Final**: **~2,512 lines** ✅ (within target range of 2,000-2,500)

**Remaining phases** (optional cleanup):
- Phase 9: Filter UI extraction (~120 lines) → ~2,392 lines
- Phase 10: Misc extractions (~400 lines) → ~1,992 lines

---

## Summary

**Phase 6 (File Manager)**: Extract file lifecycle operations
- Main target: `loadAudio()` function (171 lines)
- Secondary targets: delete, rename, drop, selection (~230 lines)
- Creates: `FileLoader` class (new service)
- Benefits: Testable, reusable file loading across views

**Phase 7 (Waveform Component)**: Extract wavesurfer initialization and event handling
- Main target: `initWaveSurfer()` function (171 lines)
- Enhances: `WaveformComponent` class (existing file)
- Benefits: Reusable waveform for parent + stems, cleaner event handlers

**Both phases** focus on extracting **lifecycle management**:
- Phase 6: File lifecycle (load, destroy, switch files)
- Phase 7: Waveform lifecycle (create, setup events, destroy)

After both phases, app.js will be **~2,512 lines** - right in the target range! 🎯
