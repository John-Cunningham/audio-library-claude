# Parent Cycle Mode Fix - Session Continuation

## Issue
When trying to enable cycle mode on the parent player, the following error occurred:
```
Uncaught ReferenceError: stemCycleModes is not defined
    at Object.toggleCycleMode (app.js:786:17)
    at HTMLDocument.<anonymous> (keyboardShortcuts.js:232:27)
```

This prevented testing whether parent cycle mode affects following stems (Test 9 in STEM_REFACTOR_TEST_PLAN.md).

## Root Cause
The `LoopControls.toggleCycleMode()` function (loopControls.js:42-86) expects `state.stemCycleModes` and `state.stemNextClickSets` to be passed in the state object, but these variables were not defined in app.js and were not being exposed from StemStateManager.

These are per-stem state variables that track:
- `stemCycleModes[stemType]`: Whether cycle mode is active for each stem (true/false)
- `stemNextClickSets[stemType]`: Which loop point to set next ('start' or 'end')

## Fix Applied

### 1. StemStateManager.js - Expose to Window Objects
**File**: `/src/state/stemStateManager.js`

Added window object exposure for cycle mode state (lines 104-115):
```javascript
window.stemCycleModes = {
    vocals: false,
    drums: false,
    bass: false,
    other: false
};
window.stemNextClickSets = {
    vocals: 'start',
    drums: 'start',
    bass: 'start',
    other: 'start'
};
```

### 2. StemStateManager.js - Sync Functions
Updated `syncToWindow()` function to sync cycle mode state (lines 300-308):
```javascript
// Sync cycleMode
if (key === 'cycleMode') {
    window.stemCycleModes[stemType] = value;
}

// Sync nextClickSets
if (key === 'nextClickSets') {
    window.stemNextClickSets[stemType] = value;
}
```

Updated `syncAllToWindow()` to include these properties (lines 319-320):
```javascript
window.stemCycleModes[stemType] = state.stems[stemType].cycleMode;
window.stemNextClickSets[stemType] = state.stems[stemType].nextClickSets;
```

### 3. app.js - Pass Window Objects to LoopControls
**File**: `/src/core/app.js`

Updated `toggleCycleMode()` wrapper function (lines 787-789):
```javascript
const result = LoopControls.toggleCycleMode({
    cycleMode,
    nextClickSets,
    multiStemPlayerExpanded,
    stemCycleModes: window.stemCycleModes,       // ← FIXED
    stemNextClickSets: window.stemNextClickSets, // ← FIXED
    stemLoopStates: window.stemLoopStates
});
```

## What Changed
- **StemStateManager**: Exposed `stemCycleModes` and `stemNextClickSets` via window objects (same pattern as `stemLoopStates` and `stemPlaybackIndependent`)
- **app.js**: Updated `toggleCycleMode()` to read from window objects instead of undefined local variables

## Expected Behavior After Fix

### Parent Cycle Mode Should Now:
1. **Enable/Disable Correctly**: Click "CYCLE" button on parent player without errors
2. **Sync to Stems**: When parent cycle mode is enabled, all stems should also enable cycle mode (unless they have independent loops set)
3. **Set Loop Points**: Click on parent waveform to set loop start/end
4. **Loop Playback**: Parent and all following stems should loop at the set boundaries

## Testing Instructions

### Test 9 from STEM_REFACTOR_TEST_PLAN.md
**What to test**: Parent cycle mode affects following stems

**Steps**:
1. Load a file with stems
2. Click "STEMS" button to expand multi-stem player
3. Enable cycle mode on PARENT player (click "CYCLE" button)
4. **Expected**: ✅ No console errors
5. Set loop points on parent waveform by clicking twice
6. Play the file
7. **Expected**: All stems without independent loops should loop with parent
8. Now enable cycle mode on "vocals" stem and set different loop points
9. **Expected**: Vocals loops independently, other 3 stems loop with parent

### Additional Tests to Verify
- **Test 1**: Parent play/pause controls stems (already passing ✅)
- **Test 2**: Parent seeking syncs stems (already passing ✅)
- **Test 6**: Individual stem cycle modes (already passing ✅)

## Files Modified
1. `/src/state/stemStateManager.js`
   - Added window.stemCycleModes initialization
   - Added window.stemNextClickSets initialization
   - Updated syncToWindow() to sync cycle mode state
   - Updated syncAllToWindow() to include cycle mode state

2. `/src/core/app.js`
   - Updated toggleCycleMode() to pass window objects to LoopControls

## Next Steps
1. **Reload the page**: Cmd+Shift+R / Ctrl+Shift+R to clear cache
2. **Test parent cycle mode**: Follow Test 9 instructions above
3. **If test passes**: Continue with remaining tests from STEM_REFACTOR_TEST_PLAN.md
4. **If test fails**: Report exact error and expected vs. actual behavior

## Architecture Note
This fix maintains the **hybrid state pattern**:
- Per-stem state lives in StemStateManager centralized state
- Exposed via window objects for PlayerBarComponent compatibility
- LoopControls module reads from window objects (not app.js local variables)
- Single source of truth preserved (StemState module)

This enables the multi-view architecture goal while maintaining backward compatibility with existing code.
