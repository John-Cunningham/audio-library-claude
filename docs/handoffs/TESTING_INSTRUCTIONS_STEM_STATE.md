# Testing Instructions - Stem State Extraction

**What Changed**: Extracted 162 lines of stem state declarations from app.js to new StemStateManager module. Updated all 65 references to use hybrid sync pattern (local cache + centralized state).

**Why Test**: Verify stem player functionality still works correctly after major refactoring.

**Time Required**: 10-15 minutes

---

## Prerequisites

1. **Start Local Server**:
   ```bash
   cd "/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude"
   python3 -m http.server 5500
   ```

2. **Open Browser**: http://localhost:5500/index.html

3. **Open Browser Console**: Press F12 or Cmd+Option+I (Mac)

4. **Load a File**: Select any audio file from your library that has stems available

---

## Test Suite

### ✅ Test 1: Basic Stem Player Expansion/Collapse

**What to Test**: Multi-stem player UI toggle

**Steps**:
1. Click "Show Stems" button in main player
2. Verify multi-stem player expands and shows 4 stem bars (vocals, drums, bass, other)
3. Click "Hide Stems" button
4. Verify multi-stem player collapses

**Expected Result**:
- ✅ Stems expand/collapse smoothly
- ✅ No console errors
- ✅ Button text changes between "Show Stems" / "Hide Stems"

**What This Tests**: `syncExpandedToState()` function working correctly

---

### ✅ Test 2: Stem Loading and Ready Count

**What to Test**: Stem files load correctly and ready count increments

**Steps**:
1. With multi-stem player expanded, load a different file with stems
2. Watch browser console for loading messages
3. Observe ready counter (if visible in UI)

**Expected Result**:
- ✅ Each stem loads without errors
- ✅ Ready count increments from 0 → 4
- ✅ All 4 stem waveforms render
- ✅ No console errors about "undefined wavesurfer" or "null components"

**What This Tests**: `syncReadyCountToState()`, `syncWavesurfersToState()`, `syncComponentsToState()` working correctly

---

### ✅ Test 3: Stem Playback Synchronization

**What to Test**: All stems play in sync with parent

**Steps**:
1. Expand multi-stem player
2. Ensure all 4 stems are "active" (green play button, not grayed out)
3. Click play on main player
4. Observe all stem waveforms

**Expected Result**:
- ✅ All 4 stems play simultaneously
- ✅ All waveforms scroll in sync
- ✅ No audio glitches or dropouts
- ✅ Playback position matches across all stems

**What This Tests**: `stemPlayerWavesurfers` state properly maintained and accessible

---

### ✅ Test 4: Individual Stem Controls

**What to Test**: Per-stem volume, mute, solo controls

**Steps**:
1. With stems playing:
   - **Volume**: Adjust vocals volume slider → verify vocals volume changes
   - **Mute**: Click mute button on drums → verify drums silent
   - **Solo**: Click solo button on bass → verify only bass audible
2. Stop playback
3. Start playback again
4. Verify mute/solo states persist

**Expected Result**:
- ✅ Volume changes apply immediately
- ✅ Mute/solo buttons work correctly
- ✅ States persist after stop/play
- ✅ No console errors about missing state

**What This Tests**: Per-stem state (managed by PlayerBarComponent) accessible via window objects from StemStateManager

---

### ✅ Test 5: Stem Rate Controls

**What to Test**: Independent rate control for stems

**Steps**:
1. Expand multi-stem player
2. Click "Lock" button on vocals rate control to unlock it
3. Adjust vocals rate slider (e.g., set to 0.5x)
4. Play all stems
5. Verify vocals plays at half speed while others play normal speed

**Expected Result**:
- ✅ Unlock button works (changes visual state)
- ✅ Rate slider becomes active when unlocked
- ✅ Vocals plays at different rate than other stems
- ✅ No sync issues or crashes

**What This Tests**: Per-stem rate state managed by PlayerBarComponent, accessed via StemState

---

### ✅ Test 6: Parent BPM Detection

**What to Test**: Parent file BPM stored correctly

**Steps**:
1. Load a file with known BPM (check metadata or use test file)
2. Open browser console
3. Type: `StemState.getCurrentParentFileBPM()`
4. Verify BPM value matches file

**Expected Result**:
- ✅ BPM value returned correctly
- ✅ Value matches file's actual BPM
- ✅ Local variable `currentParentFileBPM` also updated

**What This Tests**: `syncParentBPMToState()` function working correctly

---

### ✅ Test 7: Stem Preload Flag

**What to Test**: Preload flag set correctly

**Steps**:
1. Load a file with stems
2. Wait for all stems to load
3. Open browser console
4. Type: `StemState.isPreloaded()`
5. Verify returns `true`
6. Load a different file
7. Immediately type: `StemState.isPreloaded()`
8. Verify returns `false` (until stems load)

**Expected Result**:
- ✅ Returns `true` when stems loaded
- ✅ Returns `false` when loading new file
- ✅ Local variable `stemsPreloaded` syncs correctly

**What This Tests**: `syncPreloadedToState()` function working correctly

---

### ✅ Test 8: Stem Loop Controls

**What to Test**: Loop state persistence

**Steps**:
1. Expand multi-stem player
2. Click "Loop Controls" button on vocals
3. Set loop start/end points by clicking waveform
4. Enable loop (toggle loop button)
5. Play vocals stem
6. Verify loop plays correctly

**Expected Result**:
- ✅ Loop controls UI appears
- ✅ Loop markers set correctly
- ✅ Loop playback works
- ✅ Loop state accessible via `window.stemLoopStates.vocals`

**What This Tests**: Per-stem loop state managed by PlayerBarComponent, exposed via StemStateManager

---

### ✅ Test 9: Stem Markers

**What to Test**: Bar markers on stem waveforms

**Steps**:
1. Expand multi-stem player
2. Click "Markers" button on drums
3. Verify bar markers appear on drums waveform
4. Change marker frequency (e.g., "Every 2 Bars")
5. Verify markers update

**Expected Result**:
- ✅ Markers toggle on/off
- ✅ Marker frequency changes work
- ✅ Markers align with audio grid
- ✅ No console errors about missing state

**What This Tests**: Per-stem marker state managed correctly

---

### ✅ Test 10: File Switching (State Reset)

**What to Test**: State resets correctly when switching files

**Steps**:
1. Expand multi-stem player
2. Set up complex state:
   - Mute vocals
   - Solo drums
   - Set loop on bass
   - Unlock rate on other
3. Load a different file
4. Expand multi-stem player
5. Verify all stems reset to default state (no mutes, solos, loops, rate locks)

**Expected Result**:
- ✅ All stem states reset to defaults
- ✅ No leftover mute/solo/loop states
- ✅ New file's stems load correctly
- ✅ No console errors

**What This Tests**: State cleanup and reset logic working correctly

---

### ✅ Test 11: Auto-Play on Ready

**What to Test**: Auto-play flag works correctly

**Steps**:
1. Load a file without stems expanded
2. Start playing parent file
3. While playing, click "Show Stems"
4. Observe stems loading
5. Verify stems auto-play when ready (sync with parent)

**Expected Result**:
- ✅ Stems load in background
- ✅ Once loaded, stems automatically start playing
- ✅ Stems sync with parent playback position
- ✅ `StemState.getAutoPlayOnReady()` returns `true` during this process

**What This Tests**: `syncAutoPlayToState()` function and auto-play logic

---

### ✅ Test 12: Console State Inspection

**What to Test**: Debug helper function works

**Steps**:
1. Expand multi-stem player
2. Set up various states (mute, solo, loop, etc.)
3. Open browser console
4. Type: `StemState.debugPrintState()`
5. Review console output

**Expected Result**:
- ✅ Function prints formatted state tree
- ✅ Shows all stem states (vocals, drums, bass, other)
- ✅ Values match current UI state
- ✅ Useful for debugging

**What This Tests**: Debug utilities and state accessibility

---

### ✅ Test 13: Window Object Compatibility

**What to Test**: Legacy window object exposure still works

**Steps**:
1. Open browser console
2. Type: `window.stemPlaybackIndependent`
3. Verify returns object with 4 stem states
4. Type: `window.stemLoopStates`
5. Verify returns object with 4 loop states
6. Type: `window.currentParentFileBPM`
7. Verify returns current BPM

**Expected Result**:
- ✅ All window objects accessible
- ✅ Values match StemState values
- ✅ PlayerBarComponent can access these objects
- ✅ Legacy code compatibility maintained

**What This Tests**: Window object sync and backward compatibility

---

### ✅ Test 14: Multi-View Readiness (Future)

**What to Test**: State structure ready for multi-view architecture

**Steps**:
1. Expand multi-stem player
2. Set up complex state (mutes, loops, markers, etc.)
3. Open browser console
4. Type: `StemState.getState()`
5. Verify all state stored in centralized location

**Expected Result**:
- ✅ All stem state accessible via StemState API
- ✅ State independent of app.js local variables
- ✅ Ready for Galaxy/Sphere view integration

**What This Tests**: Architecture readiness for multi-view system

---

## Common Issues and Solutions

### Issue: Stems Don't Load
**Solution**:
- Check Supabase connection (browser console network tab)
- Verify file has stems in database
- Check CORS settings for local server

### Issue: Console Error "Cannot read property 'X' of undefined"
**Solution**:
- Likely missing sync function call
- Report to Claude with specific error message and line number

### Issue: Stem State Doesn't Persist
**Solution**:
- Verify sync functions called correctly
- Check browser console for StemState errors
- Use `StemState.debugPrintState()` to inspect current state

### Issue: Playback Desync
**Solution**:
- Verify all stems use same WaveSurfer.js version
- Check sample rates match
- Ensure no independent rate locks active

---

## Success Criteria

**ALL tests should pass with NO console errors.**

If any test fails:
1. Note which test failed
2. Copy exact error message from console
3. Note what behavior occurred vs. expected
4. Report to Claude with details

---

## After Testing

### If All Tests Pass ✅
1. **Commit Changes**:
   ```bash
   git add .
   git commit -m "refactor: Extract stem state to StemStateManager - TESTED & WORKING"
   ```

2. **Update NEXT_STEPS_V29.md** to mark this phase complete

3. **Optional**: Run additional user workflows to verify real-world usage

### If Tests Fail ❌
1. **Do NOT commit**
2. **Report failures to Claude** with:
   - Test number that failed
   - Expected vs. actual behavior
   - Console errors (copy full stack trace)
   - Steps to reproduce

3. **Claude will fix issues** and provide updated testing instructions

---

## Technical Notes

### Hybrid State Pattern Used
```javascript
// Initialize from StemState (single source of truth)
let multiStemPlayerExpanded = StemState.isExpanded();

// Sync helper (updates both local cache and StemState)
function syncExpandedToState(value) {
    multiStemPlayerExpanded = value;  // Local cache (performance)
    StemState.setExpanded(value);     // Centralized state (persistence)
}

// Usage when state changes
syncExpandedToState(true);
```

**Benefits**:
- Fast local reads (performance)
- Centralized state (multi-view architecture)
- Single source of truth (StemState module)
- Backward compatible (window object exposure)

### Files Modified
- `/src/state/stemStateManager.js` - NEW (162 lines)
- `/src/core/app.js` - Modified (added sync functions, updated 6 write points)

### Lines of Code Impact
- **Before**: app.js = 2,168 lines
- **After**: app.js = 2,006 lines (-162 lines)
- **Added**: stemStateManager.js = 413 lines (includes state + API + docs)
- **Net Change**: +251 lines total (but app.js is 162 lines lighter)

---

**Questions?** Report issues to Claude with specific test number and error details.
