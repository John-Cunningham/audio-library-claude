# Next Refactoring Candidates - 2025-10-17

## Current Status
- **app.js**: 5,388 lines
- **Goal**: Reduce to ~5,000 lines (350-400 more lines to extract)
- **Progress**: 82% of 2,000 line reduction goal

---

## TOP CANDIDATES (Recommended Order)

### **1. Batch Operations & Processing Module** ⭐ HIGHEST PRIORITY
**Estimated**: ~300-350 lines
**File**: `src/core/batchOperations.js`
**Complexity**: ⭐⭐ Medium

**Functions to extract:**
- `runSelectedProcessing()` (lines 840-934, ~95 lines) - Railway webhook processing
- `deleteFile()` (lines 4823-4872, ~50 lines) - Single file deletion
- `batchDelete()` (lines 4875-4930, ~55 lines) - Multi-file deletion
- `batchDetect()` (lines 4935-4990, ~55 lines) - BPM/Key detection
- `batchSeparateStems()` (lines 4993-5050, ~60 lines) - Stems separation

**Why extract this:**
✅ Self-contained - minimal dependencies
✅ All functions share common patterns (progress bar, error handling)
✅ Clear boundaries - doesn't touch player/waveform logic
✅ Easy to test - just select files and click buttons
✅ Gets us to our 2,000 line goal!

**Dependencies:**
- Supabase client (passed as callback)
- ProgressBar module (already extracted)
- FileListRenderer.render() (already extracted)
- MiniWaveform.destroy() (already extracted)
- selectedFiles, audioFiles, currentFileId (state getters)

**Callback pattern**:
```javascript
// In batchOperations.js
export function init(callbacks, state) {
    callbacks = {
        loadData,
        renderFiles,
        clearSelection,
        clearPlayer,
        destroyMiniWaveform
    };
    state = {
        getSupabase,
        getAudioFiles,
        getSelectedFiles,
        getCurrentFileId,
        getProcessingFiles
    };
}

export async function deleteFile(fileId) { ... }
export async function batchDelete() { ... }
export async function batchDetect() { ... }
export async function batchSeparateStems() { ... }
export async function runSelectedProcessing(fileIds, options) { ... }
```

**Window exports needed**:
```javascript
window.deleteFile = (id, e) => BatchOperations.deleteFile(id, e);
window.batchDelete = () => BatchOperations.batchDelete();
window.batchDetect = () => BatchOperations.batchDetect();
window.batchSeparateStems = () => BatchOperations.batchSeparateStems();
```

---

### **2. Upload Flow & Preferences Module**
**Estimated**: ~100-120 lines
**File**: `src/core/uploadManager.js`
**Complexity**: ⭐ Low-Medium

**Functions to extract:**
- Processing preferences load/save (lines 746-779, ~35 lines)
- File picker trigger (lines 782-786, ~5 lines)
- File selection handler (lines 789-797, ~10 lines)
- Upload modal opener (lines 800-835, ~35 lines)
- Preference change listeners (lines 771-779, ~10 lines)

**Why extract this:**
✅ Clear functional boundary (upload workflow)
✅ Self-contained localStorage management
✅ Would clean up app.js startup code

**Why NOT to extract yet:**
⚠️ Only ~100 lines (small gain)
⚠️ Tightly coupled to TagEditModal
⚠️ Better to do batch operations first (bigger impact)

**Recommendation**: Extract AFTER batch operations if you want to continue refactoring.

---

### **3. Loop/Cycle Control Functions**
**Estimated**: ~500-800 lines
**File**: `src/components/loopControls.js`
**Complexity**: ⭐⭐⭐⭐ High (DO NOT DO YET)

**Functions include:**
- `toggleCycleMode()`, `toggleLoop()`, `resetLoop()`
- `shiftLoopLeft()`, `shiftLoopRight()`
- `halfLoopLength()`, `doubleLoopLength()`
- `moveStartLeft()`, `moveStartRight()`, `moveEndLeft()`, `moveEndRight()`
- Cycle mode click handlers
- Loop visualization updates

**Why NOT to extract yet:**
❌ Heavily coupled to WaveSurfer instance
❌ Manipulates waveform regions directly
❌ Should wait for player component refactoring
❌ Complex state management (loop positions, cycle mode, etc.)

**Recommendation**: Wait until player component architecture is implemented (see CLAUDE.md).

---

### **4. Stem Player Functions**
**Estimated**: ~1,500-2,000 lines
**File**: Multiple components needed
**Complexity**: ⭐⭐⭐⭐⭐ Very High (DO NOT DO YET)

**Why NOT to extract:**
❌ Core player functionality - needs architectural redesign
❌ CLAUDE.md warns: "If you're about to add significant functionality to app.js, STOP and refactor into components first"
❌ Should follow PlayerBarComponent pattern
❌ Requires understanding of multi-stem architecture

**Recommendation**: This is the BIG refactor mentioned in CLAUDE.md. Save for dedicated session.

---

## RECOMMENDED NEXT STEP

### **Extract Batch Operations Module**

**Why this is the best choice:**
1. **Reaches goal**: ~350 lines extracted = 105% of 2,000 line goal achieved! 🎯
2. **Clean boundaries**: Self-contained functions with clear inputs/outputs
3. **Low risk**: Doesn't touch player, waveform, or complex state
4. **High impact**: Removes 4 major functions + 1 critical webhook handler
5. **Easy to test**: Simple user actions (select files, click button)
6. **Proven pattern**: Uses same callback approach as previous extractions

**Estimated time**: 45-60 minutes total
- Analysis: 10 min
- Extraction: 20 min
- Integration: 15 min
- Testing: 10 min
- Commit: 5 min

**Testing checklist** (after extraction):
1. Select 1 file → Delete → Confirm it's gone
2. Select 3 files → Batch Delete → All deleted
3. Select 2 files → Batch Detect → Progress bar shows → BPM/Key updated
4. Select 1 file → Batch Stems → Progress bar shows → Stems generated
5. Tag modal → Select "Detect BPM/Key" checkbox → Save → Processing runs

---

## After Batch Operations (Optional)

If you want to continue beyond the 2,000 line goal:

### **Next: Upload Manager (~100 lines)**
- Smaller extraction
- Cleans up startup code
- Good practice for future sessions

### **Future: Player Component Architecture (Big Refactor)**
- Requires dedicated planning session
- Follow PLAYER_ARCHITECTURE.md
- Extract loop controls, player functions, stem controls as components
- Target: app.js down to ~2,000 lines (coordinator only)

---

## Module Organization After Batch Operations

```
src/
├── core/
│   ├── app.js                 # 5,038 lines (coordinator only)
│   ├── batchOperations.js     # 350 lines (NEW)
│   ├── fileProcessor.js       # 363 lines
│   └── tagManager.js          # 374 lines
├── components/
│   ├── tagEditModal.js        # 571 lines
│   └── miniWaveform.js        # 143 lines
├── views/
│   ├── fileListRenderer.js    # 627 lines
│   ├── libraryView.js
│   └── galaxyView.js
└── utils/
    ├── progressBar.js         # 136 lines
    └── metronome.js
```

**Total extracted from app.js**: 1,999 lines (99.95% of goal!)

---

## Decision Time

**Recommended**: Extract Batch Operations Module now
- Gets you to 2,000 line goal
- Clean, safe extraction
- Immediate value

**Alternative**: Stop here and fix bugs
- Already achieved 82% of goal
- Codebase is much cleaner
- Can continue later

**Your choice!** What would you like to do?

---

**Created**: 2025-10-17
**Status**: Ready for next extraction
**Recommendation**: Batch Operations Module (350 lines)
