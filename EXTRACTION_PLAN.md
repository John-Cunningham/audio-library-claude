# PlayerBarComponent Extraction Plan

**Goal**: Move all player control logic from `app.js` into `PlayerBarComponent`
**Based on**: FUNCTION_INVENTORY.md analysis
**Status**: Planning → Ready to Execute

---

## Overview

We will extract **~95 functions** from `app.js` into `PlayerBarComponent`:
- 45 Parent player control functions
- 50 Stem player control functions

### Key Principle: ONE Component, Multiple Instances

```javascript
// Create ONE parent player
const parentPlayer = new PlayerBarComponent({
    playerType: 'parent'
});

// Create FOUR stem players (same component class!)
const stemPlayers = {
    vocals: new PlayerBarComponent({ playerType: 'stem', stemType: 'vocals' }),
    drums: new PlayerBarComponent({ playerType: 'stem', stemType: 'drums' }),
    bass: new PlayerBarComponent({ playerType: 'stem', stemType: 'bass' }),
    other: new PlayerBarComponent({ playerType: 'stem', stemType: 'other' })
};
```

---

## Current State Analysis

### Existing PlayerBarComponent (1,073 lines)
Already has some logic from previous sessions:
- Constructor with playerType/stemType
- Loop state management (loopStart, loopEnd, cycleMode)
- Some marker methods (shiftBarStartLeft/Right, setMarkerFrequency)
- Sync methods (syncLoopStateToGlobal)
- Template integration

### Missing from Component (in app.js)
- ~40 player control functions still in app.js
- ~50 stem-specific functions
- Metronome integration
- Rate/pitch controls
- Recording functionality
- Volume/mute controls
- Waveform event handlers

---

## Extraction Strategy

### Phase 2A: Core Player Controls (Week 1 Day 1-2)
Extract basic playback controls that work for BOTH parent and stem:

**Functions to extract:**
```
playPause()              → this.playPause()
setVolume(value)         → this.setVolume(value)
toggleMute()             → this.toggleMute()
setPlaybackRate(rate)    → this.setPlaybackRate(rate)
updatePlayerTime()       → this.updatePlayerTime()
toggleLoop()             → this.toggleLoop()
toggleShuffle()          → this.toggleShuffle()
```

**Pattern:**
```javascript
// OLD (app.js)
function playPause() {
    if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
    } else {
        wavesurfer.play();
    }
}
window.playPause = playPause;

// NEW (PlayerBarComponent)
class PlayerBarComponent {
    playPause() {
        if (this.wavesurfer.isPlaying()) {
            this.wavesurfer.pause();
        } else {
            this.wavesurfer.play();
        }
    }
}
```

### Phase 2B: Marker System (Week 1 Day 3)
Extract marker functions (already partially done):

**Functions to extract:**
```
toggleMarkers()          → this.toggleMarkers()
setMarkerFrequency(freq) → this.setMarkerFrequency(freq) [DONE]
shiftBarStartLeft()      → this.shiftBarStartLeft() [DONE]
shiftBarStartRight()     → this.shiftBarStartRight() [DONE]
addBarMarkers(file)      → this.addBarMarkers(file)
findNearestMarkerToLeft  → this.findNearestMarkerToLeft(clickTime)
```

**Status**: Mostly done, need to verify completeness

### Phase 2C: Loop/Cycle Mode (Week 1 Day 4)
Extract loop manipulation functions:

**Functions to extract (20+ functions):**
```
toggleCycleMode()        → this.toggleCycleMode()
resetLoop()              → this.resetLoop()
updateLoopVisuals()      → this.updateLoopVisuals()
updateLoopRegion()       → this.updateLoopRegion()
shiftLoopLeft/Right()    → this.shiftLoopLeft/Right()
halfLoopLength()         → this.halfLoopLength()
doubleLoopLength()       → this.doubleLoopLength()
moveStartLeft/Right()    → this.moveStartLeft/Right()
moveEndLeft/Right()      → this.moveEndLeft/Right()
toggleImmediateJump()    → this.toggleImmediateJump()
toggleLoopFades()        → this.toggleLoopFades()
togglePreserveLoop()     → this.togglePreserveLoop()
toggleBPMLock()          → this.toggleBPMLock()
```

### Phase 2D: Advanced Features (Week 1 Day 5)
Extract recording, metronome, rate/pitch:

**Functions to extract:**
```
// Metronome (wrapper)
toggleMetronome()        → this.toggleMetronome()
setMetronomeSound(sound) → this.setMetronomeSound(sound)

// Recording
toggleRecordActions()    → this.toggleRecordActions()
recordAction()           → this.recordAction()
playRecordedActions()    → this.playRecordedActions()

// Rate/Pitch (placeholders)
toggleRateMode()         → this.toggleRateMode()
setSpeed/setPitch()      → this.setSpeed/setPitch()
```

### Phase 2E: Stem-Specific Functions (Week 2 Day 1-2)
Extract ~50 stem functions and make them work with playerType logic:

**Pattern for stem functions:**
```javascript
// OLD (app.js) - Separate function per stem
function toggleStemMarkers(stemType) {
    stemMarkersEnabled[stemType] = !stemMarkersEnabled[stemType];
    updateStemMarkersButton(stemType);
    renderStemMarkers(stemType);
}

// NEW (PlayerBarComponent) - Same method, instance-aware
class PlayerBarComponent {
    toggleMarkers() {
        this.markersEnabled = !this.markersEnabled;
        this.updateMarkersButton();
        this.renderMarkers();
        // Works for both parent and stem!
    }
}
```

**Key insight**: Most stem functions become the SAME methods as parent functions, just called on stem instances!

**Stem functions to consolidate:**
```
toggleStemMarkers(stemType)         → stemPlayer.toggleMarkers()
setStemMarkerFrequency(stemType)    → stemPlayer.setMarkerFrequency(freq)
shiftStemBarStartLeft(stemType)     → stemPlayer.shiftBarStartLeft()
toggleStemCycleMode(stemType)       → stemPlayer.toggleCycleMode()
updateStemLoopVisuals(stemType)     → stemPlayer.updateLoopVisuals()
handleStemRateChange(stemType)      → stemPlayer.setPlaybackRate(rate)
toggleStemRateLock(stemType)        → stemPlayer.toggleRateLock()
```

### Phase 2F: Event System Migration (Week 2 Day 3)
Replace `window` exports with event-based system:

**OLD (onclick handlers):**
```html
<button onclick="toggleMarkers()">MARKS</button>
```

**NEW (event listeners in component):**
```javascript
class PlayerBarComponent {
    init() {
        this.markersBtn = this.container.querySelector('.markers-btn');
        this.markersBtn.addEventListener('click', () => this.toggleMarkers());
    }
}
```

**Benefits:**
- No window pollution
- Encapsulated logic
- Easier testing
- Clear dependencies

---

## Detailed Extraction Steps

### Step 1: Read Current PlayerBarComponent
```bash
# Review what's already there
cat src/components/playerBar.js | grep "class PlayerBarComponent" -A 50
```

### Step 2: Create Component State Map
Map app.js state variables to component properties:

**app.js → PlayerBarComponent:**
```javascript
// Global variables → Instance properties
wavesurfer               → this.wavesurfer
markersEnabled           → this.markersEnabled
markerFrequency          → this.markerFrequency
loopStart/End            → this.loopStart/End [DONE]
cycleMode                → this.cycleMode [DONE]
barStartOffset           → this.barStartOffset [DONE]
currentRate              → this.currentRate
isMuted                  → this.isMuted
volumeBeforeMute         → this.volumeBeforeMute

// Stem-specific state → Instance properties
stemWavesurfers[type]    → this.wavesurfer (for stem instances)
stemMarkersEnabled[type] → this.markersEnabled (for stem instances)
// etc.
```

### Step 3: Extract Functions One by One
For each function:
1. Copy function from app.js
2. Convert to class method in PlayerBarComponent
3. Replace global state with `this.*`
4. Update any cross-function calls
5. Test the method
6. Remove from app.js
7. Update window exports

**Example transformation:**
```javascript
// BEFORE (app.js)
let markersEnabled = true;
function toggleMarkers() {
    markersEnabled = !markersEnabled;
    updateMarkersButton();
    renderMarkers();
}

// AFTER (PlayerBarComponent)
class PlayerBarComponent {
    constructor() {
        this.markersEnabled = true;
    }

    toggleMarkers() {
        this.markersEnabled = !this.markersEnabled;
        this.updateMarkersButton();
        this.renderMarkers();
    }

    updateMarkersButton() {
        // ... implementation
    }

    renderMarkers() {
        // ... implementation
    }
}
```

### Step 4: Update app.js to Use Components
```javascript
// app.js - Create component instances
parentPlayerComponent = new PlayerBarComponent({
    playerType: 'parent',
    containerId: 'parent-player-bar'
});

// Initialize
parentPlayerComponent.init();

// OLD way (remove):
window.toggleMarkers = toggleMarkers;

// NEW way (if still needed for compatibility):
window.toggleMarkers = () => parentPlayerComponent.toggleMarkers();
```

### Step 5: Update Templates (if needed)
**Option A**: Keep onclick handlers for now (compatibility)
```html
<button onclick="window.parentPlayer.toggleMarkers()">MARKS</button>
```

**Option B**: Full event listener migration (preferred long-term)
```html
<button class="markers-btn" data-action="toggleMarkers">MARKS</button>
```

---

## Testing Strategy

### Unit Tests (Per Function)
As we extract each function:
1. Test parent player functionality
2. Test stem player functionality (same method!)
3. Verify state updates correctly
4. Check UI updates

### Integration Tests
After each phase:
1. Load file in library view
2. Test all extracted controls work
3. Test stems expand/collapse
4. Test parent-stem sync
5. Switch files, verify state persists

### Regression Tests
Before merging:
1. Full manual test of ALL features
2. Test across different files
3. Test edge cases (no stems, corrupted files, etc.)
4. Performance check (no slowdowns)

---

## Success Criteria

### Phase 2A Complete:
- ✅ Core playback controls work
- ✅ Parent player fully functional
- ✅ No functionality lost

### Phase 2B Complete:
- ✅ Marker system fully extracted
- ✅ Parent markers work
- ✅ Stem markers work (same methods!)

### Phase 2C Complete:
- ✅ Loop/cycle mode fully extracted
- ✅ All 20+ loop functions work
- ✅ Parent loops work
- ✅ Stem loops work independently

### Phase 2D Complete:
- ✅ Metronome integration works
- ✅ Recording system works
- ✅ Rate/pitch controls work

### Phase 2E Complete:
- ✅ All stem functions consolidated
- ✅ No duplicate stem-specific functions
- ✅ Same component works for parent + stems

### Phase 2F Complete:
- ✅ Window exports minimized or removed
- ✅ Event listeners replace onclick where possible
- ✅ Clean, testable code

### Final Success:
- ✅ PlayerBarComponent is fully self-contained
- ✅ Works for parent player
- ✅ Works for 4 stem players (same component!)
- ✅ No logic remains in app.js
- ✅ Reusable across Library/Galaxy/Sphere views
- ✅ All tests pass
- ✅ Ready for multi-view support

---

## Risk Mitigation

### Risks:
1. **Breaking parent-stem sync** during extraction
2. **Lost state** when converting global → instance
3. **Template compatibility** issues with onclick handlers
4. **Performance degradation** with event listeners

### Mitigation:
1. ✅ Extract parent functions FIRST, test thoroughly
2. ✅ Verify stem sync after each phase
3. ✅ Keep window exports temporarily for compatibility
4. ✅ Test performance after each major change
5. ✅ Commit frequently with working states
6. ✅ Have rollback plan (git revert)

---

## Next Steps

1. **Read current PlayerBarComponent** - Understand what's there
2. **Start Phase 2A** - Extract core playback controls
3. **Test continuously** - Don't break working code
4. **Document changes** - Update SESSION_LOG.txt
5. **Commit frequently** - Working state after each function group

---

**Created**: 2025-10-17
**Status**: Ready to begin Phase 2A
**Expected Duration**: 2-3 days per phase (5 phases = 2 weeks)
