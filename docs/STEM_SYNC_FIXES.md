# Stem Synchronization Fixes - 2025-10-16

## Problems Fixed

### 1. Parent Play/Pause Button Not Controlling Stems When Expanded
**Problem**: When stems are expanded, clicking the parent play/pause button only controlled the parent wavesurfer (which is muted). Stems continued playing independently.

**Solution**: Modified `playPause()` function (app.js:5348-5419) to detect if stems are expanded:
- If stems collapsed: control parent wavesurfer (original behavior)
- If stems expanded: directly control all active stems
- Uses `followsParent` logic: `stemPlaybackIndependent[type] && !loopState.enabled`
- Updates both stem play/pause icons and parent button icon

**Commit**: `4887e72`

---

### 2. Stems Not Following Parent Cycle/Loop
**Problem**: When parent has a cycle/loop enabled, stems ignore it and play straight through to the end.

**Solution A**: Modified `toggleCycleMode()` function (app.js:4283-4330) to sync stem cycle modes:
- When parent cycle enabled: enable cycle mode for all stems (if expanded)
- When parent cycle disabled: disable cycle mode for all stems (if expanded)

**Solution B**: Modified stem `timeupdate` event handler (app.js:2841-2871) to check if stem should follow parent's loop:
- If `followsParent = true`: use parent's `loopStart`/`loopEnd`
- If `followsParent = false`: use stem's own loop points
- Same logic applied to stem `finish` event handler (app.js:2873-2890)

**Commit**: `db5ebd2`

---

## Testing Checklist

### Basic Play/Pause with Stems Expanded
1. ✅ Load a file with stems
2. ✅ Click STEMS button to expand stems
3. ⚠️ Click parent play/pause button → All active stems should play/pause together
4. ⚠️ Parent button icon should reflect stem state (▶ or ⏸)

### Cycle Mode with Stems Expanded
1. ⚠️ Load a file with stems
2. ⚠️ Click STEMS button to expand stems
3. ⚠️ Click CYCLE button on parent
4. ⚠️ Set loop start and end by clicking waveform
5. ⚠️ Press play → All stems should loop at parent's loop points
6. ⚠️ Stems should NOT play past loop end
7. ⚠️ All stem CYCLE buttons should be active (synced with parent)

### Individual Stem Controls
1. ⚠️ Pause one stem individually → That stem should stop following parent
2. ⚠️ Parent play/pause should NOT affect manually paused stem
3. ⚠️ Enable cycle on one stem individually → That stem uses its own loop, not parent's

### Stems Collapsed Behavior
1. ⚠️ With stems collapsed, parent play/pause should control parent wavesurfer only
2. ⚠️ Parent cycle/loop should work on parent player only
3. ⚠️ Expanding stems while playing should mute parent and unmute stems seamlessly

---

## Key Logic

### followsParent Logic
```javascript
const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;
```

A stem "follows parent" if:
1. It's marked as active (`stemPlaybackIndependent[type] = true`)
2. AND it doesn't have its own cycle/loop enabled (`loopState.enabled = false`)

### Where This Logic Is Applied
- `playPause()` function - controls stems when expanded
- Parent `play` event handler - resumes stems
- Parent `pause` event handler - pauses stems
- Parent `seeking` event handler - syncs stem positions
- Stem `timeupdate` handler - follows parent's loop points
- Stem `finish` handler - loops back using parent's loop

---

## Files Modified

- `src/core/app.js`:
  - `playPause()` function (lines 5348-5419)
  - `toggleCycleMode()` function (lines 4283-4330)
  - Stem `timeupdate` event handler (lines 2841-2871)
  - Stem `finish` event handler (lines 2873-2890)

---

## Commits

1. `39fb774` - Initial fix for stem pause/resume sync (event handlers)
2. `4887e72` - Fix playPause() to control stems when expanded
3. `db5ebd2` - Fix cycle/loop control for stems

---

## Known Issues / Next Steps

- Browser testing incomplete (Supabase connection issue in this session)
- User needs to verify all test scenarios manually
- If stems still don't follow parent after these fixes, check console logs for:
  - `followsParent` value for each stem
  - `stemPlaybackIndependent[type]` state
  - `loopState.enabled` for each stem
  - Parent `cycleMode`, `loopStart`, `loopEnd` values
