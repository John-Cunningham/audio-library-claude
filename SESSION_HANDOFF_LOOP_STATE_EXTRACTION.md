# Session Handoff: Loop State Extraction to LoopStateManager

**Date**: 2025-10-18
**Branch**: refactor-v29-stem-extraction
**Status**: Ready to begin Phase 1 of refactoring plan
**Previous Work**: Stem state extraction completed successfully (all tests passing)

---

## Context

You are continuing a refactoring effort to extract state from app.js into dedicated state manager modules. This follows the **successful completion** of stem state extraction (StemStateManager), which reduced app.js by 162 lines and enabled multi-view architecture for stem players.

---

## What Was Just Completed ✅

### Stem State Extraction (COMPLETE)
- **Created**: `/src/state/stemStateManager.js` (413 lines)
- **Extracted**: 162 lines of stem state from app.js
- **Pattern**: Hybrid state management (local cache + centralized state)
- **Result**: All 13 critical tests passing, no regressions
- **Benefits**: Ready for multi-view architecture (stems persist across Library/Galaxy/Sphere)

**Commits**:
- `b8d44c8` - docs: Stem state extraction completion summary
- `cac0638` - fix: Parent play/pause should control stems with independent loops
- `0a7a86a` - fix: Parent cycle mode - expose stemCycleModes and stemNextClickSets via window

**Documentation**: See `STEM_STATE_EXTRACTION_COMPLETE.md`

---

## Current Task: Loop State Extraction 🎯

### Objective
Extract all loop/cycle-related state from app.js to a new `LoopStateManager` module.

### Why This Matters
1. **Biggest impact**: ~325 lines removed from app.js
2. **Multi-view architecture**: Loop settings persist across Library ↔ Galaxy ↔ Sphere view switches
3. **Clear separation**: Loop state belongs in dedicated manager, not app orchestrator
4. **Same proven pattern**: Follow StemStateManager approach (hybrid state)

### What to Extract

**Loop State Variables** (lines 70-90 in app.js):
```javascript
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

**Total**: 17 loop-related state variables

---

## Implementation Plan

### Step 1: Create LoopStateManager Module
**File**: `/src/state/loopStateManager.js`

**Template** (follow StemStateManager pattern):

```javascript
/**
 * Loop State Manager
 *
 * Centralized state management for loop/cycle mode system
 * Enables multi-view architecture (Library, Galaxy, Sphere)
 *
 * Created: 2025-10-18
 * Pattern: Hybrid state (local cache + centralized state)
 */

// Default state
const state = {
    // Core loop state
    loopStart: null,
    loopEnd: null,
    cycleMode: false,
    nextClickSets: 'start',

    // Loop modes
    immediateJump: 'off',
    pendingJumpTarget: null,
    seekOnClick: 'off',

    // UI state
    loopControlsExpanded: false,

    // Loop options
    loopFadesEnabled: false,
    fadeTime: 0.015,

    // Preservation
    preserveLoopOnFileChange: true,
    preservedLoopStartBar: null,
    preservedLoopEndBar: null,
    preservedCycleMode: false,
    preservedPlaybackPositionInLoop: null,

    // BPM lock
    bpmLockEnabled: false,
    lockedBPM: null
};

// Getters
export function getLoopStart() { return state.loopStart; }
export function getLoopEnd() { return state.loopEnd; }
export function getCycleMode() { return state.cycleMode; }
// ... etc for all 17 variables

// Setters
export function setLoopStart(value) { state.loopStart = value; }
export function setLoopEnd(value) { state.loopEnd = value; }
export function setCycleMode(value) { state.cycleMode = value; }
// ... etc for all 17 variables

// Convenience getters
export function hasActiveLoop() {
    return state.loopStart !== null && state.loopEnd !== null;
}

export function getLoopDuration() {
    return hasActiveLoop() ? state.loopEnd - state.loopStart : 0;
}

export function getLoopState() {
    return {
        start: state.loopStart,
        end: state.loopEnd,
        cycleMode: state.cycleMode,
        nextClickSets: state.nextClickSets
    };
}

export function getPreservedLoopState() {
    return {
        startBar: state.preservedLoopStartBar,
        endBar: state.preservedLoopEndBar,
        cycleMode: state.preservedCycleMode,
        playbackPosition: state.preservedPlaybackPositionInLoop
    };
}

// Reset
export function reset() {
    state.loopStart = null;
    state.loopEnd = null;
    state.cycleMode = false;
    state.nextClickSets = 'start';
    // ... reset all
}

export function clearLoop() {
    state.loopStart = null;
    state.loopEnd = null;
}

// Debug
export function debugPrintState() {
    console.group('🔁 Loop State Manager');
    console.log('Loop:', state.loopStart, '→', state.loopEnd);
    console.log('Cycle Mode:', state.cycleMode);
    console.log('Immediate Jump:', state.immediateJump);
    console.log('BPM Lock:', state.bpmLockEnabled, state.lockedBPM);
    console.groupEnd();
}
```

### Step 2: Update app.js with Hybrid Pattern

**Add import** (line 27):
```javascript
import * as LoopState from '../state/loopStateManager.js';
```

**Replace state variables** with local cache + sync functions:
```javascript
// Initialize local cache from LoopState
let loopStart = LoopState.getLoopStart();
let loopEnd = LoopState.getLoopEnd();
let cycleMode = LoopState.getCycleMode();
// ... etc for all 17

// Sync functions (update both cache and LoopState)
function syncLoopStartToState(value) {
    loopStart = value;
    LoopState.setLoopStart(value);
}

function syncLoopEndToState(value) {
    loopEnd = value;
    LoopState.setLoopEnd(value);
}

function syncCycleModeToState(value) {
    cycleMode = value;
    LoopState.setCycleMode(value);
}
// ... etc for all 17
```

### Step 3: Update All Write Points

**Find all places that modify loop state** and wrap with sync functions:

Example:
```javascript
// BEFORE
loopStart = clickTime;

// AFTER
syncLoopStartToState(clickTime);
```

**Known write points** (search for these):
- `loopStart =`
- `loopEnd =`
- `cycleMode =`
- `nextClickSets =`
- `immediateJump =`
- `seekOnClick =`
- `loopControlsExpanded =`
- `loopFadesEnabled =`
- `fadeTime =`
- `preserveLoopOnFileChange =`
- `preservedLoopStartBar =`
- `preservedLoopEndBar =`
- `preservedCycleMode =`
- `preservedPlaybackPositionInLoop =`
- `bpmLockEnabled =`
- `lockedBPM =`
- `pendingJumpTarget =`

### Step 4: Update FileLoader Service

FileLoader currently manages loop state via callbacks. Update to use LoopState:

**In FileLoader.js**, look for:
- `getLoopState()` callback
- `setLoopState()` callback
- `getPreservedLoopBars()` callback
- `setPreservedLoopBars()` callback

Update to read from/write to LoopState instead of app.js variables.

### Step 5: Update ActionRecorder Service

ActionRecorder manages loop actions. Update loop state access:

**In ActionRecorder.js**, look for:
- `loopActions` object
- `setLoopStart`, `setLoopEnd`, `setCycleMode`, `restoreLoop` functions

Update to use LoopState API.

### Step 6: Testing

Run through loop functionality tests:
1. Enable cycle mode (parent player)
2. Set loop start/end by clicking waveform
3. Loop playback works
4. Immediate jump modes work
5. BPM lock works
6. Loop preservation across file changes works
7. Keyboard shortcuts for loop manipulation work
8. No console errors

---

## Key Files to Modify

### Create New:
1. `/src/state/loopStateManager.js` - NEW module (~350 lines)

### Modify Existing:
1. `/src/core/app.js` - Add import, replace variables, add sync functions (~325 lines net reduction)
2. `/src/services/fileLoader.js` - Update loop state callbacks
3. `/src/services/actionRecorder.js` - Update loop action handlers

### Reference (Don't Modify):
1. `/src/components/loopControls.js` - Pure functions, no changes needed
2. `/src/components/waveform.js` - May access loop state via window objects

---

## Critical Documents to Reference

### MUST READ BEFORE STARTING:
1. **`STEM_STATE_EXTRACTION_COMPLETE.md`** - Shows the successful pattern to follow
2. **`CODEBASE_AUDIT_REFACTORING_PLAN.md`** - Full context and plan
3. **`CLAUDE.md`** - Project architecture rules and workflow
4. **`PLAYER_ARCHITECTURE.md`** - Component-based architecture principles

### Reference During Work:
1. `/src/state/stemStateManager.js` - Template for state manager pattern
2. `/src/core/app.js` - Current implementation (lines 70-90, 806-1087)
3. `/src/services/fileLoader.js` - Loop state callback integration

---

## Success Criteria

### Technical:
- [ ] LoopStateManager module created (~350 lines)
- [ ] All 17 loop state variables extracted from app.js
- [ ] Hybrid state pattern implemented (local cache + sync functions)
- [ ] app.js reduced by ~325 lines (2,052 → ~1,727)
- [ ] FileLoader updated to use LoopState
- [ ] ActionRecorder updated to use LoopState
- [ ] No duplicate state (single source of truth)

### Functional:
- [ ] All loop functionality works (cycle mode, loop playback, etc.)
- [ ] Keyboard shortcuts work (shift loop, move markers, etc.)
- [ ] BPM lock works
- [ ] Loop preservation across file changes works
- [ ] Immediate jump modes work
- [ ] No console errors
- [ ] No regressions

### Architecture:
- [ ] Multi-view ready (loop state persists across view switches)
- [ ] Clean API (getters/setters for all state)
- [ ] Well-documented (JSDoc comments)
- [ ] Follows same pattern as StemStateManager

---

## Expected Timeline

- **Step 1** (Create module): 30 minutes
- **Step 2** (Update app.js): 45 minutes
- **Step 3** (Update write points): 30 minutes
- **Step 4** (FileLoader): 15 minutes
- **Step 5** (ActionRecorder): 15 minutes
- **Step 6** (Testing): 30 minutes

**Total**: ~3 hours

---

## Potential Issues & Solutions

### Issue 1: Window Object Access
**Problem**: WaveformComponent may access loop state via window objects.

**Solution**: Expose loop state to window objects if needed (same as StemState):
```javascript
window.loopStart = state.loopStart;
window.loopEnd = state.loopEnd;
// etc
```

### Issue 2: FileLoader Callback Hell
**Problem**: FileLoader has many loop state callbacks.

**Solution**: Replace callbacks with direct LoopState imports in FileLoader:
```javascript
// In fileLoader.js
import * as LoopState from '../state/loopStateManager.js';

// Replace this.config.getLoopState() with:
const loopState = LoopState.getLoopState();
```

### Issue 3: ActionRecorder Integration
**Problem**: ActionRecorder has loop action handlers that modify state.

**Solution**: Update handlers to use LoopState setters:
```javascript
// In actionRecorder.js
import * as LoopState from '../state/loopStateManager.js';

setLoopStart: (data) => {
    if (LoopState.getCycleMode()) {
        LoopState.setLoopStart(data.loopStart);
        LoopState.setLoopEnd(null);
        LoopState.setNextClickSets('end');
    }
}
```

---

## Git Workflow

### Before Starting:
```bash
git status  # Verify on refactor-v29-stem-extraction branch
git add -A
git commit -m "checkpoint: Before loop state extraction"
```

### After Each Major Step:
```bash
git add -A
git commit -m "wip: Loop state extraction - [step description]"
```

### When Complete:
```bash
git add -A
git commit -m "refactor: Extract loop state to LoopStateManager

Extracted 17 loop state variables from app.js to new LoopStateManager module.
Follows same hybrid state pattern as StemStateManager.

Changes:
- Created LoopStateManager.js with clean API (~350 lines)
- Updated app.js with local cache + sync functions (~325 lines removed)
- Updated FileLoader to use LoopState API
- Updated ActionRecorder to use LoopState API

Testing: All loop functionality verified working, no regressions."
```

---

## Testing Checklist

After implementation, verify:

### Loop Functionality:
- [ ] Enable cycle mode on parent player (no errors)
- [ ] Click waveform to set loop start
- [ ] Click waveform to set loop end
- [ ] Loop region displays correctly
- [ ] Playback loops correctly
- [ ] Clear loop works
- [ ] Reset loop works

### Loop Modes:
- [ ] Immediate jump ON works (jumps immediately)
- [ ] Immediate jump CLOCK works (quantized jump)
- [ ] Seek on click works
- [ ] Loop fades work (if enabled)

### Loop Manipulation (Keyboard Shortcuts):
- [ ] Shift loop left (Cmd+Left)
- [ ] Shift loop right (Cmd+Right)
- [ ] Half loop length (Cmd+Down)
- [ ] Double loop length (Cmd+Up)
- [ ] Move start marker left (Shift+Left)
- [ ] Move start marker right (Shift+Right)
- [ ] Move end marker left (Shift+Down)
- [ ] Move end marker right (Shift+Up)

### Preservation:
- [ ] BPM lock works across file changes
- [ ] Loop preservation works (when enabled)
- [ ] Loop preservation disabled works (loop clears on file change)

### Integration:
- [ ] Action recording captures loop actions
- [ ] Action playback restores loop state
- [ ] FileLoader preserves loop state correctly
- [ ] No console errors anywhere

---

## Example: First Write Point Update

**Find in app.js** (around line 810):
```javascript
function resetLoop() {
    const result = LoopControls.resetLoop();
    loopStart = result.loopStart;      // ← BEFORE
    loopEnd = result.loopEnd;          // ← BEFORE
    cycleMode = result.cycleMode;      // ← BEFORE
    nextClickSets = result.nextClickSets;  // ← BEFORE
    updateLoopVisuals();
}
```

**Update to**:
```javascript
function resetLoop() {
    const result = LoopControls.resetLoop();
    syncLoopStartToState(result.loopStart);      // ← AFTER
    syncLoopEndToState(result.loopEnd);          // ← AFTER
    syncCycleModeToState(result.cycleMode);      // ← AFTER
    syncNextClickSetsToState(result.nextClickSets);  // ← AFTER
    updateLoopVisuals();
}
```

---

## After Completion

1. **Test thoroughly** (run through testing checklist)
2. **Commit changes** with detailed message
3. **Update documentation**:
   - Create `LOOP_STATE_EXTRACTION_COMPLETE.md` (similar to stem version)
   - Update `CODEBASE_AUDIT_REFACTORING_PLAN.md` (mark Phase 1 complete)
4. **Report results**:
   - Lines removed from app.js
   - Tests passing
   - Any issues encountered

---

## Next Session After This

If Phase 1 completes successfully, next steps are:

**Phase 2**: Extract player state to PlayerStateManager (~200 lines)
**Phase 3**: Clean up window object exposure with WindowBridge (~180 lines)
**Phase 4**: Remove advanced rate mode placeholders (~76 lines)

**Target**: app.js down to ~1,270 lines (from 2,052)

---

## Quick Start Commands

```bash
# Navigate to project
cd "/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude"

# Verify branch
git branch --show-current  # Should be: refactor-v29-stem-extraction

# Check current state
git status

# Create checkpoint
git add -A && git commit -m "checkpoint: Before loop state extraction"

# Start local server for testing
python3 -m http.server 5500
# Open: http://localhost:5500/index.html
```

---

**Start Here**: Create `/src/state/loopStateManager.js` following the StemStateManager pattern shown above.

**Remember**: Read `STEM_STATE_EXTRACTION_COMPLETE.md` first to understand the successful pattern!

**Good luck!** 🚀
