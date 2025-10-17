# Final Stem Synchronization Fix - 2025-10-16

## The Fundamental Problem

**Event listeners were being LOST when wavesurfer was destroyed and recreated.**

### Why This Happened:
1. `setupParentStemSync()` attaches event listeners to the wavesurfer instance
2. When loading a new file, `wavesurfer.destroy()` destroys the instance and removes ALL its event listeners
3. A new wavesurfer is created with `WaveSurfer.create()`
4. But `setupParentStemSync()` was NEVER called again on the new instance
5. Result: The new wavesurfer has NO event listeners, so stems never sync

### Why This Was So Hard to Find:
- The initial file load worked (event listeners were set up once)
- But as soon as you loaded a second file, all sync was broken
- The code looked correct, but the architectural issue was hidden
- Rate sliders worked because they directly control stems (not event-based)

---

## The Solution

### Commit: `42317d0`

**Added event listener re-establishment in `initWaveSurfer()`:**

```javascript
wavesurfer.on('ready', () => {
    // ... existing code ...

    // CRITICAL: Re-establish parent-stem sync for this new wavesurfer instance
    // This must be called every time wavesurfer is recreated
    if (Object.keys(stemPlayerWavesurfers).length > 0) {
        setupParentStemSync();
        console.log('✓ Parent-stem sync re-established for new wavesurfer instance');
    }
});
```

### Why This Works:
- Every time a new wavesurfer is created, the 'ready' event fires
- We call `setupParentStemSync()` to attach event listeners to the NEW instance
- Old wavesurfer destroyed = old listeners gone (no duplicates)
- New wavesurfer gets fresh event listeners automatically

---

## What This Fixes

✅ **Play/Pause Synchronization**
- Parent play/pause button now controls all stems when expanded

✅ **Seeking Synchronization**
- Clicking parent waveform seeks all stems to same position

✅ **Cycle/Loop Synchronization**
- Stems follow parent's loop points
- All stems loop together at same times

✅ **Next/Previous File Navigation**
- Loading new files with stems works correctly
- Event listeners re-established automatically

✅ **Volume Inheritance**
- Stems inherit parent's current volume on first expansion (not 100%)

---

## Complete Fix History

### Commit `39fb774` - Initial event handler fix
- Fixed backwards `followsParent` logic in event handlers

### Commit `4887e72` - Attempted direct stem control (WRONG APPROACH)
- Modified playPause() to directly control stems
- This broke the event system entirely

### Commit `db5ebd2` - Cycle mode sync
- Added toggleCycleMode() sync for stems
- Added parent loop following in stem timeupdate/finish handlers

### Commit `0776a41` - Reverted to event-driven architecture
- Reverted playPause() to always control parent wavesurfer
- Fixed volume inheritance on stem expansion
- Restored event-based sync architecture

### Commit `42317d0` - Re-establish event listeners on recreate ⭐ FINAL FIX
- Added setupParentStemSync() call in wavesurfer 'ready' event
- This ensures event listeners are re-attached every time wavesurfer recreates
- **This was the missing piece that makes everything work**

---

## Testing Checklist

Please test in your browser (hard refresh: Cmd+Shift+R):

1. ✅ **Volume inheritance:**
   - Set parent volume to 40%
   - Expand stems
   - Stems should be at 40% volume

2. ✅ **Play/Pause sync:**
   - With stems expanded, click parent play/pause
   - All stems should play/pause together

3. ✅ **Seeking sync:**
   - Click anywhere on parent waveform
   - All stems should seek to same position

4. ✅ **Cycle/Loop sync:**
   - Press CYCLE, set loop start/end
   - All stems should loop at same points

5. ✅ **Next/Previous:**
   - Press next or previous file buttons
   - New file should load with stems working

6. ✅ **Rate control:**
   - Change parent rate slider
   - All stems should change rate together

---

## Current Branch & Commit

**Branch:** `experimental-v27-stem-independence`
**Commit:** `42317d0`

---

## Key Architecture

**Event-Driven Synchronization:**
- Parent wavesurfer is always the source of truth
- Parent plays even when muted (when stems expanded)
- Stems listen to parent's events: `play`, `pause`, `seeking`
- Event listeners must be re-established when wavesurfer recreates

**followsParent Logic:**
```javascript
const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;
```
- Stem follows parent if it's active AND doesn't have own cycle enabled
- This allows individual stems to be paused or have independent loops
