# Quick Testing Guide - Refactor v29
**What Changed**: Removed dead code (~163 lines), extracted stem playback functions

---

## Setup
1. Start server: `python3 -m http.server 5500`
2. Open: http://localhost:5500/index.html
3. Open browser console (F12) - **keep this visible throughout testing**

---

## Quick Tests (5 minutes)

### Test 1: Stem Expansion
1. Load any audio file
2. Click **"▲ STEMS"** button
   - ✅ Multi-stem player expands
   - ✅ See 4 waveforms (vocals, drums, bass, other)
3. Click **"▼ STEMS"** to collapse
   - ✅ Collapses correctly

**If this works, basic UI is intact ✓**

---

### Test 2: Master Volume Controls All Stems
1. Expand stems
2. Play file
3. Move **master volume slider** (main player)
   - ✅ All stems get quieter/louder together
   - ✅ Console shows: `[UPDATE STEM AUDIO] Master volume: X%`
   - ✅ Console shows calculation for each stem

**If this works, extracted volume function works ✓**

---

### Test 3: Play All Stems in Sync
1. Load file with stems
2. Start playing main file
3. Expand multi-stem player **while playing**
   - ✅ All stems start playing immediately
   - ✅ Play buttons change to "||"
   - ✅ Stems stay synchronized

**If this works, extracted playAllStems() works ✓**

---

### Test 4: Loop Controls Still Work
1. Expand stems
2. Click **"🔄 LOOP"** on any stem (e.g., vocals)
   - ✅ Button activates (changes color)
   - ✅ Click waveform to set loop start
   - ✅ Click again to set loop end
   - ✅ Loop plays correctly
   - ✅ Loop region appears on waveform

**If this works, simplified toggleStemCycleMode() works ✓**

---

### Test 5: Individual Stem Volumes
1. Expand stems, play file
2. Adjust individual stem sliders:
   - Set vocals to 50%
   - Set drums to 100%
3. Change master volume
   - ✅ Each stem responds proportionally
   - ✅ Formula works: `finalVolume = masterVolume × stemVolume`

**If this works, volume logic is intact ✓**

---

## Console Check

**Should see**:
```
✓ vocals stem ready
✓ drums stem ready
✓ bass stem ready
✓ other stem ready
All stems loaded and ready
[UPDATE STEM AUDIO] Master volume: 75%
[UPDATE STEM AUDIO] vocals: master 75% × stem 100% = 75%
...
```

**Should NOT see**:
- ❌ "No component found" errors
- ❌ "setupStemCycleModeClickHandler is not defined"
- ❌ "updateStemLoopVisuals is not defined"
- ❌ Any other errors

---

## Quick Pass/Fail

**ALL 5 TESTS PASS + NO CONSOLE ERRORS = ✅ READY TO PROCEED**

**ANY TEST FAILS = ❌ STOP, REPORT WHICH TEST FAILED**

---

## Report Back

Just tell me:
- ✅ "All tests pass" OR
- ❌ "Test X failed: [what happened]"
- Console errors (if any)

Then we'll proceed with the next refactoring phase.
