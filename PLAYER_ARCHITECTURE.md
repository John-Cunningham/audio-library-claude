# Player Architecture - Master Design Document

**CRITICAL**: This document defines the player architecture. ALL code changes to player-related files MUST follow this design.

**Status**: Planning Phase → Refactoring to Component Architecture
**Current State**: Monolithic `app.js` with standalone functions (TEMPORARY)
**Target State**: Reusable `PlayerBarComponent` across all views

---

## Architecture Vision

### Multi-View System
The application has 3 main views:
- **Library View** (current implementation)
- **Galaxy View** (planned)
- **Sphere View** (planned)

### Player Persistence
**Option A - Selected**: Same player bar at bottom, persistent across all views
- Parent player stays at bottom (always visible)
- Stems view available in ALL views
- Views only change main content area above player
- Player state persists when switching views

### Stem Player Availability
**Answer**: If stems are expanded in one view, they show in ALL views
- Stems are a global feature, not view-specific
- Switching views preserves stem expansion state

---

## State Management

### Global State (Shared Across Views)
**Answer**: YES - Global state across all views
- If vocals are muted in Library view, they're muted in Galaxy view
- Player state is application-level, not view-level
- State lives in central state management (will use existing `state.js`)

### Parent-Stem Relationship
**Answer**: NOT always 1 parent + 4 stems
- Sometimes: parent with NO stems (regular audio file)
- Sometimes: parent with 4 stems (vocals, drums, bass, other)
- Sometimes: multiple files loaded (playlist)
- Stems view is optional, activated by clicking STEMS button

---

## Component Architecture

### File Structure (Target)
```
src/
├── components/
│   ├── playerBar.js          ← PlayerBarComponent class
│   └── waveform.js           ← WaveformComponent class
├── core/
│   ├── app.js                ← Main app logic (coordinate views/state)
│   ├── state.js              ← Global state management
│   ├── playerTemplate.js     ← HTML generation for player controls
│   ├── config.js
│   ├── utils.js
│   └── metronome.js
└── views/
    ├── libraryView.js
    ├── galaxyView.js
    └── sphereView.js
```

### PlayerBarComponent Design

**Question Answered**: YES, component should use `playerTemplate.js`

```javascript
// components/playerBar.js
import { generateStemPlayerBar } from '../core/playerTemplate.js';
import { state } from '../core/state.js';

export class PlayerBarComponent {
    constructor(options = {}) {
        this.playerType = options.playerType; // 'parent' or 'stem'
        this.stemType = options.stemType;     // 'vocals', 'drums', 'bass', 'other' (if stem)
        this.waveform = null;

        // Use playerTemplate.js to generate HTML
        if (this.playerType === 'stem') {
            this.html = generateStemPlayerBar(
                this.stemType,
                options.displayName,
                options.initialRate,
                options.initialBPM
            );
        }

        // Component has its own state that syncs with global state
        this.loopStart = null;
        this.loopEnd = null;
        this.cycleMode = false;
        // etc...
    }

    init() {
        this.setupControls();
        this.bindEvents();
    }

    // All control logic here
    toggleMarkers() { /* ... */ }
    setMarkerFrequency(freq) { /* ... */ }
    // etc...
}
```

### Usage Across Views

```javascript
// In any view (libraryView.js, galaxyView.js, sphereView.js):
import { PlayerBarComponent } from '../components/playerBar.js';

// Create parent player (bottom bar)
const parentPlayer = new PlayerBarComponent({
    playerType: 'parent'
});

// Create stem players when needed
const stemPlayers = {
    vocals: new PlayerBarComponent({
        playerType: 'stem',
        stemType: 'vocals',
        displayName: 'Vocals',
        initialRate: 1.0,
        initialBPM: '120'
    }),
    // ... other stems
};
```

---

## Current State (TEMPORARY)

### What Exists Now
- ✅ `app.js`: ~6500 lines with ALL player logic as standalone functions
- ✅ `playerTemplate.js`: Template system for HTML generation (DONE)
- ❌ `components/playerBar.js`: Exists but NOT used (orphaned from previous session)
- ❌ `components/waveform.js`: Exists but NOT used

### Problem
All player code is in `app.js` as standalone functions:
- Parent functions: `toggleMarkers()`, `setMarkerFrequency()`, etc.
- Stem functions: `toggleStemMarkers(stemType)`, `setStemMarkerFrequency(stemType, freq)`, etc.
- ~3000 lines currently, will grow to ~4500 lines

**This violates the reusability requirement** - can't use in Galaxy/Sphere views without duplicating code.

---

## Refactoring Plan

### Phase 1: Complete Current Implementation (In Progress)
**Status**: Template system done, marker functions done, need ~1450 more lines

**Continue in `app.js`** to complete features:
- ✅ Template expansion (DONE)
- ✅ Per-stem state objects (DONE)
- ✅ Marker functions (DONE)
- ⏳ Metronome functions (~150 lines)
- ⏳ Loop manipulation functions (~400 lines)
- ⏳ Loop mode functions (~200 lines)
- ⏳ Recording functions (~250 lines)
- ⏳ Display update functions (~200 lines)
- ⏳ Waveform integration (~150 lines)
- ⏳ Window exports (~50 lines)

**Reason**: Don't break working code mid-feature. Finish functionality first.

### Phase 2: Create Refactoring Roadmap (Next)
**Create**: `REFACTORING_ROADMAP.md` with step-by-step plan:
1. Extract parent player functions into `ParentPlayerController`
2. Extract stem player functions into `StemPlayerController`
3. Update `PlayerBarComponent` to use controllers
4. Update `app.js` to instantiate components
5. Test in Library view
6. Enable in Galaxy/Sphere views
7. Remove old standalone functions

### Phase 3: Execute Refactoring (Future Session)
**When**: After all features are working in current approach
**How**: Follow roadmap in separate branch
**Verify**: All views work before merging

---

## Critical Rules

### DO:
1. ✅ Read this document before touching ANY player code
2. ✅ Follow the Target Architecture when refactoring
3. ✅ Use `playerTemplate.js` for ALL HTML generation
4. ✅ Keep global state in `state.js`
5. ✅ Make components reusable across views
6. ✅ Test across ALL views before committing

### DO NOT:
1. ❌ Add more standalone functions to `app.js` after Phase 1 complete
2. ❌ Duplicate player logic across views
3. ❌ Create view-specific player implementations
4. ❌ Break working features during refactoring
5. ❌ Commit without testing in Library view minimum
6. ❌ Ignore this document

---

## Function Pattern (Current Implementation)

**Parent Function** (in app.js):
```javascript
function toggleMarkers() {
    markersEnabled = !markersEnabled;
    updateMarkersButton();
    renderMarkers();
}
```

**Stem Function** (in app.js):
```javascript
function toggleStemMarkers(stemType) {
    stemMarkersEnabled[stemType] = !stemMarkersEnabled[stemType];
    updateStemMarkersButton(stemType);
    renderStemMarkers(stemType);
}
```

**Target Component Method** (future):
```javascript
class PlayerBarComponent {
    toggleMarkers() {
        this.markersEnabled = !this.markersEnabled;
        this.updateMarkersButton();
        this.renderMarkers();
    }
}
```

---

## Template System Integration

### Current (CORRECT):
- `playerTemplate.js` generates HTML with onclick handlers
- Handlers call functions in `app.js`: `onclick="toggleStemMarkers('vocals')"`
- Functions exist in `app.js` and exported to `window`

### Target (After Refactoring):
- `playerTemplate.js` generates HTML (same)
- `PlayerBarComponent` creates instance from template
- Component methods handle events (remove onclick, use addEventListener)
- No window exports needed

---

## Migration Path

### Step 1: Current (Don't Break)
```javascript
// app.js
function toggleStemMarkers(stemType) { /* ... */ }
window.toggleStemMarkers = toggleStemMarkers;

// Template generates:
<button onclick="toggleStemMarkers('vocals')">MARKS</button>
```

### Step 2: Refactored (Future)
```javascript
// PlayerBarComponent
class PlayerBarComponent {
    init() {
        this.markersBtn = this.container.querySelector('.markers-btn');
        this.markersBtn.addEventListener('click', () => this.toggleMarkers());
    }

    toggleMarkers() { /* ... */ }
}

// Template generates (same HTML, but component binds events):
<button class="markers-btn">MARKS</button>
```

---

## Questions for Future Sessions

Before making ANY player changes, answer these:

1. **Does this change affect ONLY Library view or ALL views?**
   - If ALL views → use component approach
   - If Library only → you're doing it wrong

2. **Is this feature reusable across Parent AND Stem players?**
   - Yes → should be in PlayerBarComponent
   - No → might need separate logic, document why

3. **Have you read `PLAYER_ARCHITECTURE.md`?**
   - No → STOP and read it
   - Yes → proceed following the rules

4. **Are you adding to the monolithic `app.js`?**
   - Yes, Phase 1 → OK, but document in TODO for refactoring
   - Yes, Phase 2+ → WRONG, refactor first
   - No, using components → Correct

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All player features work in Library view
- ✅ Template system generates complete player bars
- ✅ Parent + 4 stems all functional
- ✅ All controls (markers, metronome, loop manipulation, etc.) working

### Phase 2 Complete When:
- ✅ `REFACTORING_ROADMAP.md` created
- ✅ All functions mapped to component methods
- ✅ Migration plan tested on one feature

### Phase 3 Complete When:
- ✅ `PlayerBarComponent` fully functional
- ✅ Works in Library view
- ✅ Works in Galaxy view
- ✅ Works in Sphere view
- ✅ Old standalone functions removed from `app.js`
- ✅ `app.js` reduced to <2000 lines (coordination only)

---

**Last Updated**: 2025-10-15
**Current Phase**: Phase 1 (Complete features in app.js)
**Next Phase**: Phase 2 (Create refactoring roadmap)
