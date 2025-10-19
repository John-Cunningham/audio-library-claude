# Stem State Extraction - Complete Test Plan

**Goal**: Verify all stem player functionality works exactly as it did before the refactoring.

**What Changed**: Extracted per-stem state from `app.js` to `StemStateManager` module and fixed access patterns to use window objects.

---

## Test Environment Setup

1. **Start local server**: `python3 -m http.server 5500`
2. **Open browser**: http://localhost:5500/index.html
3. **Open browser console**: Press F12 or Cmd+Option+I (Mac)
4. **Load a file with stems**: Click on any file that has stem files available

---

## Critical Tests (Must Pass)

### Test 1: Parent Play/Pause Controls Stems
**What to test**: Parent play/pause button controls all stems

**Steps**:
1. Load a file with stems
2. Click the "STEMS" button to expand multi-stem player
3. Click the main "Play" button (▶) on the parent player
4. **Expected**: All 4 stems should start playing in sync
5. Click the main "Pause" button (⏸) on the parent player
6. **Expected**: All 4 stems should pause

**What this tests**: `setupParentStemSync()` is working correctly

---

### Test 2: Parent Seeking Syncs Stems
**What to test**: Clicking on parent waveform seeks all stems

**Steps**:
1. With stems expanded and playing
2. Click somewhere on the parent waveform to seek to a different time
3. **Expected**: All 4 stems should seek to the same position
4. If playing, all stems should continue playing from new position

**What this tests**: Parent seeking event handler is working

---

### Test 3: Parent Rate Changes Affect Stems
**What to test**: Changing parent playback rate changes stem rates (when locked)

**Steps**:
1. With stems expanded
2. Drag the parent rate slider to 0.5x or 2.0x
3. **Expected**: All stem rates should change to match
4. **Expected**: All stems continue playing at new rate

**What this tests**: Rate synchronization is working

---

### Test 4: Individual Stem Play/Pause
**What to test**: Each stem can be played/paused independently

**Steps**:
1. With stems expanded
2. Click the play/pause button (▶/||) on the "vocals" stem
3. **Expected**: Only vocals should toggle play/pause
4. Other stems should not be affected

**What this tests**: PlayerBarComponent instance control is working

---

### Test 5: Individual Stem Volume Control
**What to test**: Each stem has independent volume control

**Steps**:
1. With stems expanded and playing
2. Drag the "vocals" volume slider
3. **Expected**: Only vocals volume should change
4. Other stems should maintain their volume

**What this tests**: Per-stem volume control is working

---

### Test 6: Individual Stem Cycle Mode (Loop)
**What to test**: Each stem can have its own independent loop

**Steps**:
1. With stems expanded
2. Click "CYCLE" button on "vocals" stem to enable cycle mode
3. Click on vocals waveform twice to set loop start and end points
4. Play the vocals stem
5. **Expected**: Vocals should loop between the set points
6. **Expected**: Other stems should NOT loop (unless they have their own loops set)

**What this tests**: Per-stem loop state is working correctly

---

### Test 7: Individual Stem Rate Lock/Unlock
**What to test**: Stems can have independent playback rates

**Steps**:
1. With stems expanded
2. Click the "LOCK" button on "drums" stem to unlock it
3. Change the drums rate slider to 0.5x
4. Change the parent rate to 2.0x
5. **Expected**: Drums should play at 0.5x (independent)
6. **Expected**: Other stems should play at 2.0x (following parent)

**What this tests**: Per-stem rate independence is working

---

### Test 8: Master Volume Controls All Stems
**What to test**: Parent volume slider affects all stems proportionally

**Steps**:
1. With stems expanded and playing
2. Set vocals volume to 50%, drums to 75%, bass to 100%, other to 25%
3. Change parent volume slider from 100% to 50%
4. **Expected**: All stems should reduce volume by 50%
   - Vocals: 50% → 25%
   - Drums: 75% → 37.5%
   - Bass: 100% → 50%
   - Other: 25% → 12.5%

**What this tests**: `updateMultiStemVolumes()` is working correctly

---

### Test 9: Parent Cycle Mode Affects Following Stems
**What to test**: When parent has a loop, all stems without independent loops follow it

**Steps**:
1. With stems expanded
2. Enable cycle mode on PARENT player
3. Set loop points on parent waveform
4. Play
5. **Expected**: All stems without independent loops should loop with parent
6. Now enable cycle mode on "vocals" stem and set different loop points
7. **Expected**: Vocals loops independently, other 3 stems loop with parent

**What this tests**: Loop following logic is working

---

### Test 10: Stem Markers
**What to test**: Each stem can have independent bar markers

**Steps**:
1. With stems expanded
2. Click "MARKERS" button on "bass" stem
3. **Expected**: Bar markers should appear on bass waveform
4. Change marker frequency (e.g., "Every 2 Bars")
5. **Expected**: Bass markers should update
6. **Expected**: Other stems' markers should NOT be affected

**What this tests**: Per-stem marker state is working

---

### Test 11: Stem Mute/Solo
**What to test**: Stems can be muted or soloed (via PlayerBarComponent)

**Steps**:
1. With stems expanded and playing
2. Click the mute button on "vocals" (🔊 should change to 🔇)
3. **Expected**: Vocals should be silent
4. Click the solo button on "drums"
5. **Expected**: Only drums should be audible, all others silent
6. Click solo again to disable
7. **Expected**: All stems return to normal (vocals still muted)

**What this tests**: PlayerBarComponent mute/solo functionality

---

### Test 12: File Switching Resets State
**What to test**: Loading a new file properly resets stem state

**Steps**:
1. With stems expanded, set up complex state:
   - Vocals: looped, rate unlocked at 0.5x
   - Drums: muted
   - Bass: solo enabled
2. Load a DIFFERENT file with stems
3. **Expected**: All stem states should reset to defaults
4. **Expected**: No leftover loops, mutes, solos, or rate locks

**What this tests**: State cleanup is working correctly

---

### Test 13: Expanding/Collapsing Stems
**What to test**: Stems can be hidden/shown without losing state

**Steps**:
1. Expand stems, set vocals volume to 50%
2. Start playing
3. Click "STEMS" button to collapse
4. **Expected**: Stems should become inaudible (parent plays)
5. Click "STEMS" button to expand again
6. **Expected**: Stems should resume with same state (vocals still at 50%)

**What this tests**: Expand/collapse preserves state

---

## Advanced Tests (Should Also Pass)

### Test 14: Multiple Stems with Independent Loops
**Steps**:
1. Set different loop regions on vocals and drums
2. Play both with their loops enabled
3. **Expected**: Each loops at its own boundary points

---

### Test 15: Console State Debugging
**Steps**:
1. With stems expanded and various states set
2. In browser console, type: `StemState.debugPrintState()`
3. **Expected**: Should print complete stem state tree
4. Verify values match what you see in the UI

---

### Test 16: Window Object Compatibility
**Steps**:
1. In browser console, type: `window.stemPlaybackIndependent`
2. **Expected**: Should return object with vocals, drums, bass, other properties
3. Type: `window.stemLoopStates`
4. **Expected**: Should return loop states for all 4 stems

---

## Success Criteria

**All tests must pass with NO console errors**

If ANY test fails:
1. Note which test number failed
2. Copy the exact error from browser console
3. Describe expected vs actual behavior
4. Report back for debugging

---

## Known Working Functionality (From Previous Commits)

Based on your description, all of the following should work:

✅ Individual stem cycle/loop controls
✅ Parent play/pause controlling all stems
✅ Parent rate changes affecting stems
✅ Parent seeking syncing all stems
✅ Individual stem volume controls
✅ Individual stem play/pause buttons
✅ Individual stem rate lock/unlock
✅ Individual stem markers
✅ Parent cycle mode affecting following stems
✅ Master volume affecting all stems proportionally

If ANY of these don't work, the refactoring has broken something.

---

## Fixes Applied

1. **setupParentStemSync()**: Now reads from `window.stemPlaybackIndependent` and `window.stemLoopStates`
2. **initializeMultiStemPlayerWavesurfers()**: Same fix for window object access
3. **preloadMultiStemWavesurfers()**: Fixed audioprocess event handler to read loop state from `window.stemLoopStates`
4. **initializeMultiStemPlayerWavesurfers()**: Fixed timeupdate and finish handlers to read from window objects

---

## Next Steps

1. Reload the page completely (Cmd+Shift+R / Ctrl+Shift+R)
2. Run through all Critical Tests (1-13)
3. Report results - either "All tests pass" or specific failures
4. If all pass, we're done! If any fail, we'll debug.
