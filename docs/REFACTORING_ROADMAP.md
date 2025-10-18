# Refactoring Roadmap - v28 Player Component Architecture

**Branch:** `refactor-v28-player-component-architecture`
**Goal:** Break up monolithic `app.js` into reusable components for multi-view support
**Status:** Planning → In Progress

---

## Current Problems

### 1. Monolithic app.js (7,037 lines)
- **305KB file** - unmanageable
- Contains library view + player + file browser + everything
- Violates single responsibility principle
- Can't reuse player in Galaxy/Sphere views without duplicating code

### 2. Mixed Concerns
```javascript
// app.js contains ALL of these mixed together:
- Library view UI code
- File browser code
- Parent player controls
- Stem player controls
- Waveform management
- State management
- Event handlers
- Utility functions
```

### 3. Global Function Pollution
- 100+ functions exported to `window` object
- Hard to track dependencies
- Difficult to test
- Tight coupling between components

---

## Target Architecture

### File Structure
```
src/
├── components/
│   ├── playerBar.js          ← PlayerBarComponent (reusable player)
│   ├── waveform.js           ← WaveformComponent (visualization)
│   └── processingModal.js    ← Modal component (already done)
├── core/
│   ├── app.js                ← App coordinator (<2000 lines)
│   ├── state.js              ← Global state management
│   ├── playerTemplate.js     ← HTML templates (already done)
│   ├── config.js
│   ├── utils.js
│   └── metronome.js
└── views/
    ├── libraryView.js        ← Library-specific UI
    ├── galaxyView.js         ← Galaxy visualization
    └── sphereView.js         ← 3D sphere view
```

### Responsibility Separation

**app.js (Coordinator - ~2000 lines)**
- Initialize application
- Coordinate views (Library/Galaxy/Sphere)
- Manage global state
- Handle view switching
- Route events between components

**components/playerBar.js (PlayerBarComponent)**
- All player controls (play/pause/loop/markers/etc.)
- Parent player logic
- Stem player logic (same component, different instance)
- Waveform integration
- Reusable across ALL views

**views/libraryView.js (Library View)**
- File browser UI
- File list rendering
- Tag editing
- Library-specific features
- Uses PlayerBarComponent (doesn't own it)

**views/galaxyView.js (Galaxy View)**
- Visual exploration UI
- Uses PlayerBarComponent (same instance as Library)

**views/sphereView.js (Sphere View)**
- 3D visualization
- Uses PlayerBarComponent (same instance)

---

## Refactoring Strategy

### Phase 1: Analyze & Map (Current Phase)
✅ Identify all functions in app.js
✅ Categorize by responsibility:
  - Player control functions
  - Library view functions
  - File browser functions
  - State management
  - Utility functions

### Phase 2: Extract PlayerBarComponent
**Goal:** Move all player logic into reusable component

**Steps:**
1. Analyze existing `components/playerBar.js` (1,073 lines)
2. Identify what's missing from app.js
3. Extract parent player functions → component methods
4. Extract stem player functions → component methods
5. Update template integration
6. Remove `window` exports, use event system instead
7. Test player in isolation

**Functions to Move:**
```javascript
// Parent player controls
toggleMarkers()
setMarkerFrequency()
shiftBarStartLeft/Right()
toggleMetronome()
toggleCycleMode()
handlePlay/Pause()
// ... ~50+ functions

// Stem player controls
toggleStemMarkers(stemType)
setStemMarkerFrequency(stemType, freq)
// ... ~50+ stem-specific functions
```

### Phase 3: Extract Library View
**Goal:** Move library-specific code to `views/libraryView.js`

**Steps:**
1. Create `LibraryViewComponent` class
2. Extract file browser functions
3. Extract file list rendering
4. Extract tag editing UI
5. Extract library-specific event handlers
6. Keep only view coordination in app.js

**Functions to Move:**
```javascript
renderFileList()
handleFileClick()
updateFileDisplay()
handleTagEdit()
filterFiles()
sortFiles()
// ... ~30+ functions
```

### Phase 4: Refactor app.js to Coordinator
**Goal:** Reduce app.js to <2000 lines

**Responsibilities:**
```javascript
class App {
    constructor() {
        this.state = new State();
        this.player = new PlayerBarComponent();
        this.views = {
            library: new LibraryViewComponent(),
            galaxy: new GalaxyViewComponent(),
            sphere: new SphereViewComponent()
        };
        this.currentView = 'library';
    }

    init() {
        this.player.init();
        this.setupViewSwitching();
        this.bindGlobalEvents();
    }

    switchView(viewName) {
        this.views[this.currentView].hide();
        this.views[viewName].show();
        this.currentView = viewName;
        // Player stays persistent!
    }
}
```

### Phase 5: Enable Multi-View Support
**Goal:** Same player works across all views

**Steps:**
1. Implement view switching in app.js
2. Test player persistence when switching views
3. Verify global state works across views
4. Test stems expansion persists across views

---

## Implementation Order

### Week 1: Player Component Extraction
- [ ] Day 1: Map all player functions in app.js
- [ ] Day 2: Extract parent player methods to PlayerBarComponent
- [ ] Day 3: Extract stem player methods to PlayerBarComponent
- [ ] Day 4: Replace window exports with event system
- [ ] Day 5: Test player component in isolation

### Week 2: Library View Extraction
- [ ] Day 1: Create LibraryViewComponent skeleton
- [ ] Day 2: Extract file browser logic
- [ ] Day 3: Extract file list rendering
- [ ] Day 4: Extract tag editing
- [ ] Day 5: Test library view with new player component

### Week 3: App Coordinator Refactor
- [ ] Day 1: Refactor app.js to coordinator pattern
- [ ] Day 2: Implement view switching infrastructure
- [ ] Day 3: Test view switching with persistent player
- [ ] Day 4: Clean up old code, remove duplication
- [ ] Day 5: Final testing, merge to main

---

## Migration Pattern

### Current (app.js standalone function):
```javascript
function toggleMarkers() {
    markersEnabled = !markersEnabled;
    updateMarkersButton();
    renderMarkers();
}
window.toggleMarkers = toggleMarkers;

// Template calls it:
<button onclick="toggleMarkers()">MARKS</button>
```

### Target (PlayerBarComponent method):
```javascript
class PlayerBarComponent {
    constructor() {
        this.markersEnabled = false;
    }

    init() {
        this.markersBtn = this.container.querySelector('.markers-btn');
        this.markersBtn.addEventListener('click', () => this.toggleMarkers());
    }

    toggleMarkers() {
        this.markersEnabled = !this.markersEnabled;
        this.updateMarkersButton();
        this.renderMarkers();
    }
}

// Template generates clean HTML:
<button class="markers-btn">MARKS</button>
```

### Benefits:
- ✅ No window pollution
- ✅ Encapsulated state
- ✅ Testable in isolation
- ✅ Reusable across views
- ✅ Clear dependencies

---

## Testing Strategy

### Unit Testing
- Test PlayerBarComponent methods independently
- Test LibraryViewComponent methods independently
- Mock dependencies

### Integration Testing
- Test player + library view together
- Test view switching
- Test state persistence

### Manual Testing Checklist
- [ ] Load file in library view
- [ ] Play/pause works
- [ ] Markers work (parent + stems)
- [ ] Loop/cycle works
- [ ] Stems expand/collapse
- [ ] Switch to galaxy view
- [ ] Player still works
- [ ] State persists (mute/volume/etc)
- [ ] Switch back to library view
- [ ] Everything still works

---

## Risk Mitigation

### Risks:
1. **Breaking existing features** during refactoring
2. **Lost functionality** when moving code
3. **Regression bugs** not caught until later

### Mitigation:
1. ✅ Work in separate branch
2. ✅ Commit frequently with descriptive messages
3. ✅ Test after every major change
4. ✅ Keep backup of working app.js
5. ✅ Don't merge until 100% working

---

## Success Criteria

### Phase 2 Complete When:
- ✅ PlayerBarComponent has all player logic
- ✅ Works for parent player
- ✅ Works for stem players (4 instances)
- ✅ No functionality lost
- ✅ Tests pass

### Phase 3 Complete When:
- ✅ LibraryViewComponent has all library logic
- ✅ File browser works
- ✅ Tag editing works
- ✅ No functionality lost

### Phase 4 Complete When:
- ✅ app.js < 2000 lines
- ✅ Only coordination code remains
- ✅ All views work
- ✅ Player works across all views

### Final Success:
- ✅ Can switch between Library/Galaxy/Sphere views
- ✅ Player persists and works in all views
- ✅ Global state works across views
- ✅ Stem expansion persists across views
- ✅ Code is maintainable and follows best practices
- ✅ No duplicated logic
- ✅ Easy to add new views in future

---

## Next Steps

1. **Start Phase 2:** Map all player functions in app.js
2. **Create function inventory:** Document what goes where
3. **Begin extraction:** Move functions one by one
4. **Test continuously:** Don't break working code

---

**Created:** 2025-10-17
**Status:** Ready to begin Phase 2
**Expected Completion:** 3 weeks
