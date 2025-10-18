# Testing Checklist - Refactor v29 Stem Extraction
**Date**: 2025-10-18
**Branch**: refactor-v29-stem-extraction
**Changes**: Extracted stem player functions, removed dead code

---

## 🎯 What Was Changed

### 1. **Dead Code Removed** (~163 lines)
- ❌ Deleted `setupStemCycleModeClickHandler()`
- ❌ Deleted `updateStemLoopVisuals()`
- ❌ Deleted `updateStemLoopRegion()`
- ✂️ Simplified `toggleStemCycleMode()` (removed fallback logic)

### 2. **Functions Extracted to StemPlayerManager**
- ✅ `playAllStems(stemPlayerWavesurfers)` - Plays all stems in sync
- ✅ `updateMultiStemVolumes(stemPlayerWavesurfers, masterVolume)` - Updates stem volumes

### 3. **Files Modified**
- `src/core/app.js` - Reduced by ~191 lines
- `src/components/stemPlayerManager.js` - Added 2 new functions (+45 lines)

---

## ✅ Critical Tests - MUST PASS

### **Test 1: Multi-Stem Player Expansion/Collapse**
**Location**: Player bar (bottom)
**Steps**:
1. Load any audio file that has stems
2. Click the "▲ STEMS" button
   - ✅ Multi-stem player should expand
   - ✅ Button should change to "▼ STEMS"
   - ✅ Should see 4 waveforms (vocals, drums, bass, other)
3. Click "▼ STEMS" again
   - ✅ Multi-stem player should collapse
   - ✅ Button should change back to "▲ STEMS"

**What This Tests**: Basic UI toggle still works after code removal

---

### **Test 2: Stem Cycle Mode (Loop Controls)**
**Location**: Multi-stem player (when expanded)
**Steps**:
1. Expand multi-stem player
2. For ANY stem (e.g., vocals), click the "🔄 LOOP" button
   - ✅ Button should activate (turn yellow/green)
   - ✅ Should be able to click on waveform to set loop start
   - ✅ Click again to set loop end
   - ✅ Loop should play correctly

**What This Tests**: `toggleStemCycleMode()` still works after removing fallback code

---

### **Test 3: Master Volume → Stem Volumes**
**Location**: Player controls + Multi-stem player
**Steps**:
1. Expand multi-stem player
2. Play any file with stems
3. Adjust the **master volume slider** (main player)
   - ✅ All stem volumes should change proportionally
   - ✅ Console should show volume calculations
   - ✅ Audio should get quieter/louder

**What This Tests**: `updateMultiStemVolumes()` in StemPlayerManager works correctly

---

### **Test 4: Individual Stem Volume Controls**
**Location**: Multi-stem player (when expanded)
**Steps**:
1. Expand multi-stem player
2. Play any file with stems
3. Adjust individual stem volume sliders (e.g., vocals = 50%, drums = 100%)
   - ✅ Each stem should respond to its own slider
   - ✅ Master volume should still affect all stems multiplicatively
   - ✅ Formula: `finalVolume = masterVolume × stemVolume`

**What This Tests**: Master + individual volume logic still works

---

### **Test 5: Play All Stems in Sync**
**Location**: Multi-stem player (auto-triggered when expanding)
**Steps**:
1. Load a file with stems
2. Start playing the main file
3. Expand multi-stem player while playing
   - ✅ All stems should start playing in sync
   - ✅ Play icons should update to "||" (pause icon)
   - ✅ Stems should stay synchronized

**What This Tests**: `playAllStems()` in StemPlayerManager works correctly

---

### **Test 6: Stem Loop Visuals (PlayerBarComponent)**
**Location**: Multi-stem player waveforms
**Steps**:
1. Expand multi-stem player
2. Enable cycle mode for a stem (🔄 LOOP button)
3. Set loop start and end by clicking waveform
   - ✅ Loop region should appear as visual overlay on waveform
   - ✅ Loop status text should update (e.g., "8→16")
   - ✅ Loop should be visible and correctly positioned

**What This Tests**: PlayerBarComponent's loop UI methods work (no reliance on deleted functions)

---

## ⚠️ Edge Cases to Test

### **Edge Case 1: No Stems Available**
- Load a file WITHOUT stems
- ✅ "STEMS" button should be hidden
- ✅ No errors in console

### **Edge Case 2: Volume at 0**
- Set master volume to 0
- Expand stems
- ✅ All stems should be silent
- ✅ No errors about division by zero

### **Edge Case 3: Rapid Toggle**
- Rapidly click "STEMS" button multiple times
- ✅ No crashes or UI glitches
- ✅ State should be consistent after toggling stops

---

## 🐛 Known Issues to Watch For

### **Issue 1: Missing Loop UI**
**Symptom**: Loop region doesn't appear on stem waveform when cycle mode is active
**Cause**: If `PlayerBarComponent.updateLoopVisuals()` isn't being called
**Fix**: Check that `stemPlayerComponents[stemType].toggleCycleMode()` is triggering UI updates

### **Issue 2: Volume Not Updating**
**Symptom**: Changing master volume doesn't affect stem volumes
**Cause**: If `multiStemPlayerExpanded` flag is incorrect
**Fix**: Verify flag is set when expanding stems

### **Issue 3: Console Errors about Missing Functions**
**Symptom**: Errors like "setupStemCycleModeClickHandler is not defined"
**Cause**: Old code still trying to call deleted functions
**Fix**: Search codebase for any remaining references to deleted functions

---

## 🔍 Console Checks

Open browser console (F12) and verify:

1. **No errors on page load**
2. **When expanding stems**, should see:
   ```
   ✓ vocals stem ready
   ✓ drums stem ready
   ✓ bass stem ready
   ✓ other stem ready
   All stems loaded and ready
   ```

3. **When adjusting master volume**, should see:
   ```
   [UPDATE STEM AUDIO] Master volume: 75%
   [UPDATE STEM AUDIO] vocals: master 75% × stem 100% = 75%
   [UPDATE STEM AUDIO] drums: master 75% × stem 100% = 75%
   ...
   ```

4. **No warnings about "No component found"** (fallback code should never execute)

---

## 📊 Performance Checks

- **App.js file size**: Should be ~2,193 lines (down from 2,384)
- **Load time**: No noticeable change
- **Memory usage**: No leaks when toggling stems multiple times

---

## ✅ Sign-Off Checklist

Before committing, confirm:

- [ ] All 6 critical tests pass
- [ ] All 3 edge cases handled correctly
- [ ] Console shows no errors
- [ ] Volume calculations working correctly
- [ ] Loop visuals appearing correctly
- [ ] No references to deleted functions in codebase
- [ ] App.js reduced by ~191 lines

---

## 🚨 If Tests Fail

1. **Check console** for specific error messages
2. **Verify imports** in app.js (should import StemPlayerManager)
3. **Check PlayerBarComponent** has `updateLoopVisuals()` method
4. **Verify `stemPlayerComponents`** array is populated when stems load
5. **Review git diff** to see exactly what changed

---

## 📝 Testing Notes

**Tester**: _________________
**Date**: _________________
**Result**: ☐ PASS  ☐ FAIL
**Notes**:
