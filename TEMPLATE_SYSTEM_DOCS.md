# Template System Documentation
## Audio Library Claude - Version 26 Refactoring

**Date**: 2025-10-15
**Branch**: experimental-v26-refactor
**Status**: ✅ Complete (Phases 1-4)
**Git Commits**: 5485e83, 41354b3, b92b04e, caaf22d

---

## Overview

The template/factory system is a major architectural improvement that eliminates HTML duplication across the 5 audio players (1 parent + 4 stems) by defining all player controls once in a centralized schema and auto-generating HTML based on context.

### Before Refactoring
- ~300 lines of duplicated HTML across 4 stem players
- Manual synchronization of control names and IDs
- High risk of inconsistencies between players
- Difficult to add or modify controls

### After Refactoring
- ✅ Single source of truth for all control definitions
- ✅ 15 control schemas auto-generate for parent and stem players
- ✅ Context-aware generation (adapts based on playerType)
- ✅ 3 lines of code to generate complete stem player
- ✅ Eliminated ~300 lines of duplicated code

---

## Architecture

### File Structure
```
src/core/
├── playerTemplate.js      # Template system (556 lines)
│   ├── controlDefinitions  # 15 control schemas
│   ├── generatePlayerHTML() # Generic generation
│   ├── generateStemPlayerBar() # Complete stem bars
│   └── Helper functions
└── app.js                  # Uses templates
    └── Import generateStemPlayerBar()
```

### Control Definitions Schema

Each control has the following properties:

```javascript
{
    id: 'playPause',              // Unique identifier
    type: 'button',               // button | slider | text | container
    showIn: ['parent', 'stem'],   // Which player types show this
    row: 'main',                  // main | rate
    order: 1,                     // Sort order within row
    htmlId: (ctx) => ...,         // DOM element ID (context-aware)
    tag: 'button',                // HTML tag name
    classes: (ctx) => ...,        // CSS classes (context-aware)
    innerHTML: (ctx) => ...,      // Inner HTML (context-aware)
    attributes: (ctx) => ({...})  // Additional attributes (context-aware)
}
```

### Context Object

The `ctx` object provides player-specific information:

```javascript
{
    playerType: 'parent' | 'stem',
    stemType: 'vocals' | 'drums' | 'bass' | 'other',
    initialRate: 1.0,           // For stem BPM display
    initialBPM: '120'           // For stem BPM display
}
```

---

## Control Definitions (15 Total)

### Main Row Controls

1. **playPause** - Play/Pause button
   - Parent: Large circular button with icon
   - Stem: Smaller rectangular button with play/pause icon

2. **mute** - Mute button
   - Parent: "🔇 Mute" text button
   - Stem: "🔊" icon button

3. **loop** - Loop button
   - Both: "LOOP" text button

4. **waveform** - Waveform display container
   - Parent: 80px height, bordered
   - Stem: 50px height, styled container

5. **volumeSlider** - Volume slider
   - Parent: Range 0-398 (for dB precision)
   - Stem: Range 0-100 (percentage)

6. **volumeDisplay** - Volume percentage display
   - Parent: Shows percentage + dB (e.g., "100% (+0.0 dB)")
   - Stem: Shows percentage only (e.g., "100%")

7. **fileName** - File name display
   - Parent: Shows "No file selected" initially
   - Stem: Shows stem type (VOCALS, DRUMS, etc.)

8. **timeDisplay** - Current time / duration display
   - Parent: Shows "0:00 / 0:00"
   - Stem: Shows "0:00 / 0:00" per stem

### Rate Row Controls

9. **rateLock** - Lock stem rate to parent (stem only)
   - Shows lock icon and "LOCK" text
   - Only appears in stem players

10. **ratePreset05** - 0.5x speed button
    - Both: Sets playback to half speed

11. **ratePreset1** - 1x speed button
    - Both: Resets to normal speed

12. **ratePreset2** - 2x speed button
    - Both: Sets playback to double speed

13. **rateSlider** - Playback rate slider
    - Parent: Range 0.025-4.0 (decimal precision)
    - Stem: Range 50-200 (percentage-based)

14. **rateDisplay** - Rate display
    - Parent: Shows rate (e.g., "1.0x")
    - Stem: Shows rate + BPM (e.g., "1.00x @ 120 BPM")

---

## Function Names by Player Type

### Parent Player Functions
```javascript
playPause()           // Toggle play/pause
toggleMute()          // Toggle mute
toggleLoop()          // Toggle loop
setVolume(value)      // Set volume (0-398)
resetVolume()         // Reset to 100%
setPlaybackRate(rate) // Set rate (0.025-4.0)
resetRate()           // Reset to 1.0x
```

### Stem Player Functions
```javascript
toggleMultiStemPlay(stemType)              // Toggle stem play/pause
toggleMultiStemMute(stemType)              // Toggle stem mute
toggleMultiStemLoop(stemType)              // Toggle stem loop
handleMultiStemVolumeChange(stemType, val) // Set stem volume (0-100)
toggleStemRateLock(stemType)               // Lock/unlock stem rate
setStemRatePreset(stemType, rate)          // Set stem rate preset
handleStemRateChange(stemType, val)        // Set stem rate (50-200%)
```

---

## Key Differences: Parent vs Stem

| Feature | Parent | Stem |
|---------|--------|------|
| Volume Range | 0-398 (for dB precision) | 0-100 (percentage) |
| Rate Range | 0.025-4.0 (decimal) | 50-200 (percentage) |
| Rate Display | "1.0x" | "1.00x @ 120 BPM" |
| Volume Display | "100% (+0.0 dB)" | "100%" |
| Waveform Height | 80px | 50px |
| Rate Lock | N/A | Has lock button |
| Play Icon | ▶ | \|\| (pause by default) |

---

## Usage Examples

### Generate Parent Player HTML
```javascript
import { generatePlayerHTML } from './playerTemplate.js';

const parentHTML = generatePlayerHTML('parent');
// Returns HTML with all parent controls in 2 rows
```

### Generate Single Stem Player Bar
```javascript
import { generateStemPlayerBar } from './playerTemplate.js';

const vocalsHTML = generateStemPlayerBar(
    'vocals',           // stemType
    'track_vocals.mp3', // displayName
    1.0,                // initialRate
    '120.5'             // initialBPM
);
// Returns complete stem player bar with nested structure
```

### Generate All 4 Stems
```javascript
const stemTypes = ['vocals', 'drums', 'bass', 'other'];
const stemHTMLs = stemTypes.map(type =>
    generateStemPlayerBar(type, type.toUpperCase(), 1.0, '---')
);
```

---

## Template-Generated HTML Structure

### Stem Player Bar Structure
```html
<div class="stem-player-bar" id="stem-player-vocals">
    <!-- Top Row: Main Controls -->
    <div class="stem-player-main-row">
        <div class="stem-player-controls">
            <button>▶</button>  <!-- Play/Pause -->
            <button>🔊</button>  <!-- Mute -->
            <button>LOOP</button> <!-- Loop -->
        </div>

        <div class="stem-player-waveform">
            <!-- WaveSurfer renders here -->
        </div>

        <div class="stem-player-info">
            <div class="stem-player-filename">VOCALS</div>
            <div class="stem-player-time">0:00 / 0:00</div>
        </div>

        <div class="stem-player-volume">
            <span>🔊</span>
            <input type="range" min="0" max="100" value="100" />
            <span>100%</span>
        </div>
    </div>

    <!-- Bottom Row: Rate Controls -->
    <div class="stem-player-rate-row">
        <button class="stem-lock-btn locked">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">LOCK</span>
        </button>

        <div class="stem-rate-presets">
            <button>0.5x</button>
            <button>1x</button>
            <button>2x</button>
        </div>

        <div class="stem-rate-control">
            <label>Rate:</label>
            <input type="range" min="50" max="200" value="100" />
            <span>1.00x @ 120 BPM</span>
        </div>
    </div>
</div>
```

---

## Implementation Details

### Context-Aware Generation

Controls adapt their properties based on context:

```javascript
// Example: Volume slider adapts max value
attributes: (ctx) => ({
    type: 'range',
    min: '0',
    max: ctx.playerType === 'parent' ? '398' : '100',
    value: '100'
})
```

### Null ID Handling

Some controls don't need individual IDs (e.g., rate preset buttons):

```javascript
htmlId: (ctx) => ctx.playerType === 'parent'
    ? 'ratePreset1'
    : null  // No ID needed for stem presets
```

The template system filters out null IDs during generation.

### Undefined Attribute Filtering

Attributes with `undefined` values are automatically filtered:

```javascript
attributes: (ctx) => ({
    onclick: 'doSomething()',
    ondblclick: ctx.playerType === 'parent' ? 'resetValue()' : undefined
})
// Stem players won't have ondblclick attribute
```

---

## Code Reduction Metrics

### Before Template System
```
app.js stem generation: ~75 lines per stem
Total for 4 stems: ~300 lines
Plus parent player HTML: ~50 lines (still hardcoded)
Total duplicated code: ~350 lines
```

### After Template System
```
playerTemplate.js: 556 lines (defines all controls once)
app.js stem generation: 3 lines total
Parent player HTML: ~50 lines (still hardcoded, Phase 7)
Net reduction: ~300 lines eliminated
```

### Maintainability Improvement
- **Before**: Change requires editing 4-5 locations
- **After**: Change requires editing 1 location
- **Consistency**: Guaranteed by single source of truth

---

## Testing Results

### Phase 3.3 - Parent Player Testing
✅ All 10 parent controls tested and working:
1. Load file - player works normally
2. Play/Pause button - controls playback
3. Volume slider - adjusts volume (0-398 range)
4. Mute button - mutes/unmutes
5. Loop button - toggles loop
6. Rate presets (0.5x/1x/2x) - changes playback rate
7. Rate slider (0.025-4.0) - adjusts rate smoothly
8. Double-click rate/volume sliders - resets to defaults
9. File name and time display - updates during playback
10. All parent-only controls work correctly

### Phase 4.4 - Stem Player Testing
✅ All stem controls tested and working:
- All 4 stem player bars display correctly
- Individual stem controls (Play/Pause, Mute, Loop, Volume, Rate)
- Rate lock button functioning
- Rate presets (0.5x/1x/2x) working
- Rate slider with BPM display working
- Parent-stem synchronization intact
- No console errors
- Template-generated HTML identical to previous hardcoded version

---

## Future Enhancements

### Phase 6: Code Modularization (Deferred)
- Split app.js into smaller modules (keyboard.js, playerControls.js, etc.)
- Better code organization and maintainability
- Separate effort from template refactoring

### Phase 7: Advanced Parent Controls (Deferred)
- Add Markers section to template (frequency selector, shift controls)
- Add Metronome section to template
- Add Cycle/Loop section to template (15+ controls)
- Simplify loop controls (remove expand/collapse buttons)
- Split markers into 2 rows

### Additional Ideas
- Dark/Light theme support in template
- Custom control layouts via configuration
- Plugin system for adding new control types
- Visual editor for control definitions

---

## Troubleshooting

### Issue: Controls not appearing
- Check `showIn` array includes correct playerType
- Verify `row` property is 'main' or 'rate'
- Check `order` for correct positioning

### Issue: Function not defined
- Verify function name matches app.js implementation
- Check onclick attribute uses correct function name
- Ensure parent vs stem function names are correct

### Issue: Element ID conflicts
- Check htmlId function returns unique IDs
- Verify stem IDs include stemType (e.g., `stem-volume-vocals`)
- Use null for controls that don't need IDs

### Issue: Styles not applying
- Verify CSS classes match stems.css definitions
- Check class names are context-aware (parent vs stem)
- Ensure classes property returns correct string

---

## Version History

- **v26a** (Phase 1-3): Template system created and validated with parent player
- **v26b** (Phase 4): Stem players refactored to use template system
- **Future**: Phase 6 (modularization), Phase 7 (advanced controls)

---

## References

- Main implementation: `src/core/playerTemplate.js`
- Usage example: `src/core/app.js:2317-2320`
- Test suite: `test-template.html`
- Styling: `styles/stems.css`
- Changelog: `CHANGELOG.txt` (Version 26a, 26b)

---

**End of Documentation**
