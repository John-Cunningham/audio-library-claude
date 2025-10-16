# Session Handoff: Version 27d - Full Template Implementation

**Date**: 2025-10-15
**Branch**: experimental-v27-stem-independence
**Current Status**: Ready to implement full template system for stem players
**Localhost**: http://localhost:5500/index.html

---

## CRITICAL: What You Must Do

**USER'S REQUIREMENT**:
"Take what we currently have existing for the player bar at the very bottom of the screen, all of the buttons from the transport buttons to the sliders to the markers to the shift buttons to the cycle buttons, everything, and continue our process of refactoring and converting that to where we could essentially load that five times: one for the player bar, and then another for when the stems button was activated."

**THIS IS NOT** adding features step-by-step (cycle, then markers, then shift, etc.)

**THIS IS**: Generate 4 complete player bars with ALL parent functionality using the template system RIGHT NOW.

---

## What Was Already Done

### Phase 1-3: ✅ COMPLETE
- Independent playback per stem
- Independent rate control per stem (with lock system)
- Basic loop state per stem

### Phase 4: ✅ COMPLETE (with bug fix)
- Independent cycle mode per stem
- Waveform click handlers for loop selection
- Auto-play when loop end is set
- **BUG FIX**: Removed bidirectional sync that made parent follow stems
- Stems with loops now ignore parent pause/seek (truly independent)

### Git Status:
- Last commit: `a3f7748` - Phase 4 cycle mode with independence fix
- Backup before full template: `app_v27d_before_full_template.js`

---

## Architecture: Option 2 (What User Wants)

**5 identical players** reading from same template:
- 1 parent player (plays mixed file)
- 4 stem players (play individual stems)

**Each player has**:
- ✅ Own WaveSurfer instance
- ✅ Own state (cycle mode, loop points, markers, etc.)
- ✅ Full set of controls (transport, markers, shift, cycle, metronome, loop manipulation, etc.)

**Parent acts as MODIFIER** (not master):
- Parent rate × Stem rate = Final stem rate (multiplicative)
- Parent volume × Stem volume = Final stem volume
- Parent does NOT control timeline of independent stems
- Stems with active loops = independent (ignore parent pause/seek)
- Stems without loops = follow parent timeline

---

## Template System (Version 26 - Already Exists)

Located in: `src/core/playerTemplate.js`

**Current template includes** (INCOMPLETE):
- ✅ Play/Pause, Mute, Loop buttons
- ✅ Waveform, Volume slider/display
- ✅ Rate presets (0.5x/1x/2x), Rate slider/display
- ✅ File name, Time display
- ✅ Rate lock button (stems only)

**MISSING from template** (must add):
- ❌ Marker controls (MARKS button, frequency selector, shift start buttons)
- ❌ Metronome (button + sound selector dropdown)
- ❌ Cycle button + SEEK button + CLEAR button
- ❌ Loop status display
- ❌ Expand loop button (▼)
- ❌ Loop manipulation buttons (shift left/right, expand/shrink, half/double, jump, fade, preserve, BPM lock, record/play)
- ❌ Fade time slider
- ❌ Transport buttons (Previous, Next, Shuffle) - parent only

---

## Parent Player Full Control Structure

From `index.html` lines 1174-1343:

### Row 1: Waveform
- Full-width waveform container
- STEMS button (overlaid top-right)

### Row 2: All Controls (left to right)

**1. Transport Controls** (parent only):
- Previous, Play/Pause, Next, Loop, Shuffle buttons
- Volume slider + display underneath

**2. Rate Controls**:
- Label: "Rate:"
- Preset buttons: 0.5x, 1x, 2x
- Rate slider + display

**3. File Info**:
- Filename display
- Time display (current / duration)

**4. Marker Controls**:
- MARKS button (toggles markers on/off)
- Frequency selector dropdown (Every 8 bars, 4 bars, 2 bars, bar, half bar, beat)
- Shift controls:
  - Label: "Shift:"
  - ◀ button (shift bar 1 to previous marker)
  - Offset display (number)
  - ▶ button (shift bar 1 to next marker)

**5. Metronome Controls**:
- Metronome button (⏱)
- Sound selector dropdown (Clk, Bep, Wod, Cow)

**6. Loop/Cycle Controls**:
- CYCLE button
- SEEK button (shown when cycle mode on)
- CLEAR button (shown when cycle mode on)
- Loop status display (e.g., "7.4s (4 Bars)")
- Expand button ▼ (shown when loop set)
- Collapsible loop controls container:
  - ◄ Shift loop left
  - ► Shift loop right
  - ◄S Move start left (expand left)
  - E► Move end right (expand right)
  - ½ Half loop length
  - 2× Double loop length
  - JMP Jump mode toggle
  - FADE Loop fades toggle
  - Fade time slider + display (1-250ms)
  - KEEP Preserve loop on file change
  - BPM LOCK Lock BPM across files
  - RECORD Record loop actions
  - PLAY Play recorded actions

---

## Per-Stem State Objects Needed

**Already exist**:
```javascript
stemPlaybackIndependent = {vocals: false, drums: false, ...}
stemIndependentRates = {vocals: 1.0, drums: 1.0, ...}
stemRateLocked = {vocals: true, drums: true, ...}
stemLoopStates = {
    vocals: {enabled: false, start: null, end: null},
    ...
}
stemCycleModes = {vocals: false, drums: false, ...}
stemNextClickSets = {vocals: 'start', drums: 'start', ...}
```

**Need to add**:
```javascript
// Markers
stemMarkersEnabled = {vocals: true, drums: true, ...}
stemMarkerFrequency = {vocals: 'bar', drums: 'bar', ...}
stemCurrentMarkers = {vocals: [], drums: [], ...}
stemBarStartOffset = {vocals: 0, drums: 0, ...}

// Metronome
stemMetronomeEnabled = {vocals: false, drums: false, ...}
stemMetronomeSound = {vocals: 'click', drums: 'click', ...}

// Loop/Cycle
stemSeekOnClick = {vocals: 'off', drums: 'off', ...}
stemImmediateJump = {vocals: 'off', drums: 'off', ...}
stemLoopControlsExpanded = {vocals: false, drums: false, ...}
stemLoopFadesEnabled = {vocals: false, drums: false, ...}
stemFadeTime = {vocals: 15, drums: 15, ...}
stemPreserveLoop = {vocals: false, drums: false, ...}
stemBPMLock = {vocals: false, drums: false, ...}
stemRecordingActions = {vocals: false, drums: false, ...}
stemRecordedActions = {vocals: [], drums: [], ...}

// Preserved loop positions (for file changes)
stemPreservedLoopStartBar = {vocals: null, drums: null, ...}
stemPreservedLoopEndBar = {vocals: null, drums: null, ...}
```

---

## Implementation Steps (In Order)

### Step 1: Add all missing controls to playerTemplate.js

Extend `controlDefinitions` object with:
- `markers` button
- `markerFrequencySelect` dropdown
- `shiftLabel` span
- `shiftStartLeft` button
- `barStartOffsetDisplay` span
- `shiftStartRight` button
- `metronomeBtn` button
- `metronomeSound` dropdown
- `cycleBtn` button
- `seekOnClickBtn` button (conditional display)
- `clearLoopBtn` button (conditional display)
- `loopStatus` span
- `expandLoopBtn` button (conditional display)
- All loop manipulation buttons (shiftLeft, shiftRight, moveStartLeft, moveEndRight, half, double, jump, fade, fadeSlider, fadeDisplay, preserve, bpmLock, record, play)
- Transport buttons (previous, next, shuffle) - parent only

**Important**: Use context-aware generation:
- `showIn: ['parent']` for parent-only controls (transport buttons)
- `showIn: ['parent', 'stem']` for shared controls (markers, metronome, cycle, etc.)
- Use `stemType` in function names: `toggleStemMarkers('vocals')` not `toggleMarkers()`

### Step 2: Create per-stem state objects

In `app.js` around line 2255, add all the state objects listed above.

### Step 3: Create per-stem function wrappers

For EVERY parent player function that controls a feature, create a stem version:

**Example pattern**:
```javascript
// Parent function (already exists)
function toggleMarkers() {
    markersEnabled = !markersEnabled;
    updateMarkers();
}

// Stem version (create this)
function toggleStemMarkers(stemType) {
    stemMarkersEnabled[stemType] = !stemMarkersEnabled[stemType];
    updateStemMarkers(stemType);
}
```

**Functions to create stem versions for**:
- Markers: `toggleStemMarkers`, `setStemMarkerFrequency`, `shiftStemBarStartLeft`, `shiftStemBarStartRight`, `updateStemMarkers`
- Metronome: `toggleStemMetronome`, `setStemMetronomeSound`
- Cycle: `toggleStemCycleMode` (already exists ✅), `toggleStemSeekOnClick`, `clearStemLoopKeepCycle`
- Loop manipulation: `shiftStemLoopLeft`, `shiftStemLoopRight`, `moveStemStartLeft`, `moveStemEndRight`, `halfStemLoopLength`, `doubleStemLoopLength`
- Loop modes: `toggleStemImmediateJump`, `toggleStemLoopFades`, `setStemFadeTime`, `toggleStemPreserveLoop`, `toggleStemBPMLock`
- Recording: `toggleStemRecordActions`, `playStemRecordedActions`
- Display updates: `updateStemLoopVisuals`

### Step 4: Wire up stem waveforms

Each stem WaveSurfer needs:
- Marker rendering (use per-stem markers array)
- Loop region overlay (green/blue like parent)
- Click handlers for cycle mode (already exists ✅)
- Metronome sync (if stem metronome enabled)

### Step 5: Generate complete stem player HTML

When `toggleMultiStemPlayer()` is called and expanding:
- Call `generateStemPlayerBar(stemType, displayName, initialRate, initialBPM)` for each stem
- This should generate HTML with ALL controls (not just current minimal set)
- The template system will handle context-aware generation

### Step 6: Expose all stem functions to window

At bottom of `app.js`, add:
```javascript
// Stem marker functions
window.toggleStemMarkers = toggleStemMarkers;
window.setStemMarkerFrequency = setStemMarkerFrequency;
// ... (all other stem functions)
```

### Step 7: Update CSS for loop controls

In `styles/stems.css`, add styles for:
- Loop manipulation buttons container
- Collapsible loop controls (hidden by default, shown when expanded)
- Marker controls layout
- Metronome controls layout

### Step 8: Test

When implementation is complete, ask user to test:
1. Load file with stems, click STEMS
2. Verify all 4 stems have complete player bars with all controls
3. Test markers per stem (different frequencies)
4. Test cycle mode per stem (already working)
5. Test metronome per stem
6. Test loop manipulation per stem
7. Test parent rate affecting stems multiplicatively
8. Verify stems with loops stay independent from parent

---

## Key Architecture Principles

1. **Template-driven**: All HTML generated from `playerTemplate.js`
2. **Context-aware**: Template uses `playerType` and `stemType` to generate correct IDs/functions
3. **Per-stem state**: Every parent state variable has a stem equivalent (object with keys: vocals, drums, bass, other)
4. **Function naming**: Parent: `toggleMarkers()`, Stem: `toggleStemMarkers(stemType)`
5. **Independence**: Stems with active loops ignore parent pause/seek
6. **Multiplicative**: Parent rate/volume multiply with stem values

---

## Files to Modify

1. **src/core/playerTemplate.js** - Add all missing controls (massive expansion)
2. **src/core/app.js** - Add per-stem state + per-stem functions (thousands of lines)
3. **styles/stems.css** - Add styles for new controls
4. **CHANGELOG.txt** - Document Version 27d completion

---

## Common Pitfalls to Avoid

1. **Don't** make stems follow parent if they have active loops
2. **Don't** use shared state (each stem needs own state)
3. **Don't** forget to expose stem functions to window
4. **Don't** hardcode HTML (use template system)
5. **Do** test one feature at a time (markers first, then metronome, etc.)

---

## When Uncertain

- Look at parent function implementation as reference
- Copy logic, adapt for per-stem state
- Use `stemType` parameter everywhere
- Console.log liberally for debugging

---

## Success Criteria

✅ 4 stem player bars visible when STEMS clicked
✅ Each stem has ALL parent controls
✅ Markers work independently per stem
✅ Cycle mode works independently per stem (already ✅)
✅ Metronome works independently per stem
✅ Loop manipulation works per stem
✅ Parent rate multiplies with stem rates
✅ Stems with loops ignore parent pause/seek

---

**Ready to implement. This is a large task (~2000+ lines of code). Work systematically through Steps 1-8. Only ask user for testing when complete.**
