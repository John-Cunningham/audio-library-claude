# Next Session - Audio Library Claude Refactoring

## Repository & Branch
```bash
cd "/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude"
git branch  # Should show: experimental-v27-stem-independence
git log --oneline -5  # See recent work
```

**Current Working Commit**: `36bb2ab` - All features tested and working

## What We Accomplished This Session

### ✅ Completed Work

1. **Fixed Cycle Mode** (commits 98bfe56, 2b1919f, d7db221, 3f87483)
   - Moved waveform click handler into PlayerBarComponent
   - Exposed loop/cycle state via `window.cycleMode`, `window.loopStart`, etc.
   - Added hover preview for cycle mode (blue indicator while setting loop)
   - Works WITH and WITHOUT markers enabled
   - Works on files with and without beatmap data

2. **Fixed Beatmap Normalization Bug** (commit 838c1b6) **CRITICAL**
   - Music.ai sometimes detects pickup beats (anacrusis), causing duplicate bar markers
   - **Fix**: Shift ALL beatNums by `(firstBeatNum - 1)` to maintain relative spacing
   - Eliminates visual jumps when using shift function
   - Smooth transitions across all fractional shift values (0.25, 0.5, 0.75, 1.0)

3. **Added Shift+Arrow Nudging** (commits d80ddfc, 36bb2ab)
   - For files WITHOUT beatmap: Nudge loop points by 0.01 seconds
   - For files WITH beatmap: Jump to next/previous marker (existing behavior)
   - **Mapping**:
     - Shift+Left: Move START left
     - Shift+Right: Move START right
     - Shift+Up: Move END right
     - Shift+Down: Move END left

4. **Debug Logging Added**
   - Console shows original Music.ai beatmap data
   - Shows normalization shift calculations
   - Shows filtered beats for each frequency
   - Helps diagnose beatmap data quality issues

### 📋 Session Documentation
- Updated `SESSION_LOG.txt` with all work
- Documented commits and testing results
- Noted current working commit for easy revert

## Architecture Overview

### Component-Based Player (In Progress)
We're refactoring from monolithic `app.js` (6500 lines) to component-based architecture:

**Current State**:
- ✅ `PlayerBarComponent` created in `src/components/playerBar.js`
- ✅ Parent player using component instance
- ✅ Marker controls working (toggle, frequency, shift)
- ✅ Cycle mode working (with hover preview)
- ❌ Stem players NOT YET using components (still standalone functions)
- ❌ Other controls NOT YET in component (transport, rate, volume, metronome)

**Target Architecture**:
```
PlayerBarComponent (ONE class, instantiated 5 times)
├── Parent player instance
├── Vocals stem instance
├── Drums stem instance
├── Bass stem instance
└── Other stem instance
```

### Multi-View Requirement
**CRITICAL**: Player MUST work across all 3 views:
- Library View (file browser) - ✅ Currently working
- Galaxy View (visual exploration) - ⚠️ User has working version in different worktree
- Sphere View (3D visualization) - ❌ Not yet implemented

**See**: `CLAUDE.md` and `PLAYER_ARCHITECTURE.md` for full architecture rules

## Priority Tasks for Next Session

### 1. Stem Player Component Instantiation (HIGHEST PRIORITY)
**Goal**: Make each stem player use PlayerBarComponent

**Why**: Core architecture foundation needed before Galaxy View merge

**Steps**:
1. Find `preloadMultiStemWavesurfers()` in app.js
2. Create 4 stem PlayerBarComponent instances:
   ```javascript
   const stemPlayerComponents = {
       vocals: new PlayerBarComponent({
           playerType: 'stem',
           stemType: 'vocals',
           waveform: stemPlayerWavesurfers.vocals
       }),
       // ... drums, bass, other
   };
   ```
3. Hook up window wrappers for stem functions (`toggleStemMarkers()`, etc.)
4. Test: Each stem has independent markers, controls
5. Implement parent-stem coordination:
   - Parent play/pause controls ALL stems
   - If 2 stems muted, only 2 playing stems pause when parent pauses
   - When parent plays, only previously-playing stems resume

**Files to modify**:
- `src/core/app.js` (instantiation, window wrappers)
- `src/components/playerBar.js` (may need stem-specific methods)

### 2. Refactor Keyboard Shortcuts (MEDIUM PRIORITY)
**Goal**: Move keyboard handlers from scattered app.js code into organized module

**Approach**: Option A (Quick win, 30 min)
1. Create `src/utils/keyboardShortcuts.js`
2. Move all keyboard event listeners there
3. Have shortcuts call window wrapper functions
4. Import and initialize in app.js once

**Why**: Makes shortcuts modular, sets up for view-specific shortcuts later

**Files to create/modify**:
- `src/utils/keyboardShortcuts.js` (new)
- `src/core/app.js` (remove scattered keyboard code, import module)

### 3. Restore Script/Webhook Buttons (MEDIUM PRIORITY)
**Goal**: Fix BPM analysis and stem generation webhooks

**User needs**:
- STEMS button: If no stems exist, ask "Generate stems?" → trigger webhook
- Edit Files button: Check boxes for BPM, key, instruments → trigger analysis webhook

**Files to investigate**:
- Search for webhook/STEMS button code in app.js
- May need to restore deleted webhook handler functions

### 4. Galaxy View Merge (AFTER #1 and #2)
**Goal**: Merge user's Galaxy View worktree changes

**Why**: Validates that component refactoring is portable across views

**Approach**:
1. User has working Galaxy View in different worktree
2. Need to merge that work into this branch
3. Ensure PlayerBarComponent works in both Library and Galaxy views
4. Test switching between views without player breaking

## Known Issues & Limitations

### Music.ai Beatmap Data Quality
Some files have incorrect beatmap data:
- First beat detected too late (e.g., 0.78s instead of 0.05s)
- This is a **data issue**, not a code issue
- User will re-analyze these files later
- Code handles this gracefully now (no crashes)

### Files Modified This Session
- `src/components/playerBar.js` - Added click handler, hover preview, debug logging, beatmap fix
- `src/core/app.js` - Exposed loop/cycle state, added nudge logic
- `SESSION_LOG.txt` - Documented all work

## Testing Checklist (For Next Session)

Before starting new work, verify current functionality:

✅ **Markers**:
- [ ] Load file with beatmap → markers appear
- [ ] Toggle MARKS button → markers disappear/reappear
- [ ] Change frequency dropdown → markers update
- [ ] Shift buttons → markers shift smoothly (no jumps at whole numbers)

✅ **Cycle Mode**:
- [ ] Press C → cycle mode ON
- [ ] Click waveform once → sets loop start
- [ ] Move mouse → blue preview follows mouse
- [ ] Click again → sets loop end, blue region appears

✅ **Snap-to-Marker**:
- [ ] Markers ON, cycle mode OFF → clicks snap to nearest marker
- [ ] Markers OFF → clicks don't snap (normal WaveSurfer behavior)

✅ **Shift+Arrow Nudging**:
- [ ] File with NO beatmap, cycle mode ON
- [ ] Set loop points by clicking twice
- [ ] Shift+Left/Right → nudges START by 0.01s
- [ ] Shift+Up/Down → nudges END by 0.01s

## Commit Naming Convention

Follow pattern from `CLAUDE.md`:
```bash
git commit -m "Claude: [what changed] - [WORKING/IN PROGRESS]"
```

Examples:
- `Claude: Instantiate stem player components - WORKING`
- `Claude: Refactor keyboard shortcuts into module - IN PROGRESS`

**IMPORTANT**: Commit after each round of changes for easy reversion

## Resources

**Key Documentation**:
- `CLAUDE.md` - Project memory, architecture rules, workflow
- `PLAYER_ARCHITECTURE.md` - Why components, multi-view design
- `SESSION_LOG.txt` - Complete history of all sessions
- `VERSION_27D_PROGRESS_SUMMARY.md` - Implementation status

**Server**:
```bash
python3 -m http.server 5500
# Open: http://localhost:5500/index.html
```

## Questions to Ask User

When starting next session:

1. **Priority confirmation**: "Should I start with stem player component instantiation, or would you prefer to work on keyboard shortcuts/webhooks first?"

2. **Galaxy View merge**: "Do you want to merge your Galaxy View worktree changes now, or wait until stem components are done?"

3. **Testing**: "Before I start, should I verify all current functionality is working (cycle mode, markers, shift, nudge)?"

## Final Notes

- All work is in branch `experimental-v27-stem-independence`
- Current commit `36bb2ab` is stable and tested
- Use `git log --oneline` to see commit history
- Use `git show [commit]` to see what changed in a commit
- Use `git reset --hard [commit]` to revert if needed

**Good luck with the next session!** 🚀
