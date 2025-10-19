# Galaxy View Extraction Plan

**Created:** 2025-10-19
**Branch:** `feature-galaxy-view-integration`
**Status:** IN PROGRESS - Phase 1
**Approach:** Modified Option C - Clean extraction from reference visualizer

---

## Executive Summary

**Problem:** Current Galaxy View implementation (~2700 lines) has critical bugs:
- Search functionality completely broken (no console logging, no filtering)
- Performance regression in Library View (slow/laggy)
- Duplicate functionality (player, Supabase, UI panels)
- Not properly integrated with main codebase architecture

**Solution:** Extract clean galaxy visualization core from reference file and rebuild as proper module following existing architecture patterns.

**Timeline:** 2 sessions (4-6 hours total)

---

## Why This Approach?

| Approach | Clean Code | Integration | Time | Risk |
|----------|-----------|-------------|------|------|
| **A: Continue fixing** | ❌ Keeps messy code | ❌ Band-aids | 4-5 sessions | ⚠️ High |
| **B: Refactor current** | ⚠️ Some cleanup | ⚠️ Still buggy base | 2-3 sessions | ⚠️ Medium |
| **C: Extract + integrate** | ✅ Clean modular | ✅ Proper architecture | 2 sessions | ✅ Low |

**User's Priority:** "clean maintainable code and proper view integration"

---

## Source Files

### Reference File (EXTRACT FROM):
```
/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-visualizer-cline-refactor/views/visualizer-galaxy.html
```
- **Size:** 6984 lines
- **What to extract:** Galaxy visualization core (~2000 lines)
- **What to skip:** Player, Supabase, UI panels (already in main codebase)

### Integration Guide (FOLLOW):
```
/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-visualizer-cline-refactor/GALAXY-INTEGRATION-GUIDE.md
```
- **Size:** 888 lines
- **Content:** Comprehensive extraction and integration instructions
- **Architecture:** Recommends single-page with ES6 module pattern

### Target Codebase (INTEGRATE INTO):
```
/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude/
```
- **Current:** Modular architecture with state managers
- **Pattern:** Dependency injection, thin wrappers, component modules

---

## Phase 1: Extract Galaxy Core (Session 1 - TODAY)

### Step 1: Create New Module File

**File:** `/src/views/galaxyView.js`
**Pattern:** ES6 class following existing architecture
**Size:** ~500 lines (vs current 2700)

**Class Structure:**
```javascript
export class GalaxyView {
    constructor(container, options = {}) {
        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particleSystem = null;

        // State
        this.audioFiles = [];
        this.currentFileId = null;
        this.isActive = false;

        // Audio reactivity
        this.audioAmplitude = 0;

        // Dependencies (injected)
        this.playerStateManager = options.playerStateManager;
        this.onFileClick = options.onFileClick;
    }

    // Core methods
    init(audioFiles) { }
    show() { }
    hide() { }
    destroy() { }
    updateAudioData(frequencies) { }
}
```

### Step 2: Extract Core Functions

**From `visualizer-galaxy.html`, extract:**

1. ✅ **Three.js Scene Setup** (lines ~1100-1400)
   - `initScene()` - Scene, camera, renderer, lighting
   - Post-processing setup (EffectComposer, bloom)
   - Stars background

2. ✅ **Particle System** (lines ~2400-2900)
   - `createParticles()` - InstancedMesh creation
   - `calculateFilePosition()` - Position calculation (BPM/key/tags)
   - `getColorForFile()` - Color coding logic
   - `detectFrequentTags()` - Category detection

3. ✅ **Animation Loop** (lines ~3000-3300)
   - `animate()` - Main render loop
   - Orbital motion logic
   - Audio reactivity application

4. ✅ **Camera Controls** (lines ~1200-1300, ~3000-3200)
   - `onKeyDown()`, `onKeyUp()` - WASD movement
   - `onMouseMove()` - Mouse look
   - `updateMovement()` - Velocity integration
   - Pointer lock handling

5. ✅ **Interaction** (lines ~1800-2000)
   - `onClick()` - Raycasting for particle clicks
   - Tooltip rendering
   - Crosshair targeting

6. ✅ **Audio Reactivity** (lines ~160-200)
   - Frequency data parsing
   - Bass/mids/highs calculation
   - Particle pulse logic

**SKIP these functions** (already in main codebase):
- ❌ `loadData()` - Supabase queries
- ❌ `loadAndPlayFile()` - WaveSurfer integration
- ❌ `populateFileList()` - UI rendering
- ❌ `savePreset()`, `loadPreset()` - Preset system
- ❌ All stem player functions

### Step 3: Integration Points

**Wire up to existing systems:**

1. **Player State Manager** (`src/state/playerStateManager.js`)
   ```javascript
   // Get currently playing file
   const currentFileId = playerStateManager.getCurrentFile();

   // Highlight in galaxy
   galaxyView.setCurrentFile(currentFileId);
   ```

2. **Supabase Data** (existing `audioFilesData` array)
   ```javascript
   // Pass existing data to galaxy
   galaxyView.init(audioFilesData);
   ```

3. **Audio Analysis** (add to existing player setup)
   ```javascript
   // Broadcast frequency data to galaxy
   function updateVisualization() {
       analyser.getByteFrequencyData(dataArray);
       if (galaxyView.isActive) {
           galaxyView.updateAudioData(dataArray);
       }
   }
   ```

4. **File Click Events**
   ```javascript
   galaxyView.on('fileClick', (file) => {
       // Use existing player loading logic
       loadAndPlayFile(file.id);
   });
   ```

### Step 4: HTML Updates

**Add to `index.html`:**
```html
<!-- Galaxy View Container (hidden by default) -->
<div id="galaxy-view-container" class="view" style="display: none;">
    <!-- Three.js canvas will be injected here -->
</div>

<!-- Tab buttons -->
<button onclick="showLibraryView()">Library</button>
<button onclick="showGalaxyView()">Galaxy</button>
```

**Add to `app.js`:**
```javascript
import { GalaxyView } from './views/galaxyView.js';

// Initialize galaxy view
const galaxyView = new GalaxyView('galaxy-view-container', {
    playerStateManager: playerStateManager,
    onFileClick: (file) => loadAndPlayFile(file.id)
});

// Tab switching
window.showLibraryView = () => {
    galaxyView.hide();
    document.getElementById('library-view').style.display = 'block';
};

window.showGalaxyView = () => {
    document.getElementById('library-view').style.display = 'none';
    galaxyView.show();
};
```

### Step 5: Testing Checklist

- [ ] Galaxy view initializes without errors
- [ ] Particles render (4000+ particles visible)
- [ ] Camera controls work (WASD, mouse look)
- [ ] Pointer lock activates on click
- [ ] Tab switching works (Library ↔ Galaxy)
- [ ] Currently playing file highlighted
- [ ] Particles pulse to audio
- [ ] Clicking particle loads file in player
- [ ] Performance is good (60 FPS)

---

## Phase 2: Shared State Manager (Session 2)

### Step 1: Create View State Manager

**File:** `/src/state/viewStateManager.js`
**Purpose:** Centralized state for search, filters, selected file
**Pattern:** Similar to `playerStateManager.js`

**Class Structure:**
```javascript
export class ViewStateManager {
    constructor() {
        // Search state
        this.searchQuery = '';
        this.searchResults = [];

        // Filter state
        this.canHaveTags = new Set();
        this.mustHaveTags = new Set();
        this.excludeTags = new Set();

        // Selection state
        this.selectedFileId = null;

        // Callbacks for view updates
        this.callbacks = [];
    }

    // Search methods
    setSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.notifyViews();
    }

    getSearchQuery() {
        return this.searchQuery;
    }

    // Filter methods
    addCanHaveTag(tag) {
        this.canHaveTags.add(tag);
        this.notifyViews();
    }

    // ... similar for mustHave, exclude

    clearAllFilters() {
        this.canHaveTags.clear();
        this.mustHaveTags.clear();
        this.excludeTags.clear();
        this.notifyViews();
    }

    // Selection methods
    setSelectedFile(fileId) {
        this.selectedFileId = fileId;
        this.notifyViews();
    }

    // View registration
    registerView(callback) {
        this.callbacks.push(callback);
    }

    notifyViews() {
        const state = this.getState();
        this.callbacks.forEach(cb => cb(state));
    }

    getState() {
        return {
            searchQuery: this.searchQuery,
            canHaveTags: Array.from(this.canHaveTags),
            mustHaveTags: Array.from(this.mustHaveTags),
            excludeTags: Array.from(this.excludeTags),
            selectedFileId: this.selectedFileId
        };
    }
}
```

### Step 2: Connect Library View

**Update Library View to use shared state:**
```javascript
// Register Library View with state manager
viewStateManager.registerView((state) => {
    // Update search field
    if (searchInput.value !== state.searchQuery) {
        searchInput.value = state.searchQuery;
    }

    // Update filter buttons
    updateFilterButtons(state);

    // Refilter file list
    filterFileList(state);
});

// When user types in search
searchInput.addEventListener('input', (e) => {
    viewStateManager.setSearch(e.target.value);
});

// When user clicks tag filter
tagElement.addEventListener('click', () => {
    viewStateManager.addCanHaveTag(tag);
});
```

### Step 3: Connect Galaxy View

**Update Galaxy View to use shared state:**
```javascript
// In GalaxyView constructor
this.viewStateManager = options.viewStateManager;

// Register Galaxy View with state manager
viewStateManager.registerView((state) => {
    // Update particle visibility based on search/filters
    this.applyFilters(state);
    this.recreateParticles();
});

// Method to apply filters
applyFilters(state) {
    this.audioFiles.forEach(file => {
        let visible = true;

        // Apply search filter
        if (state.searchQuery) {
            const nameMatch = file.name.toLowerCase().includes(state.searchQuery);
            const tagsMatch = file.tags?.some(tag =>
                tag.toLowerCase().includes(state.searchQuery)
            );
            visible = nameMatch || tagsMatch;
        }

        // Apply tag filters
        if (visible && state.mustHaveTags.length > 0) {
            visible = state.mustHaveTags.every(tag => file.tags?.includes(tag));
        }

        if (visible && state.excludeTags.length > 0) {
            visible = !state.excludeTags.some(tag => file.tags?.includes(tag));
        }

        if (visible && state.canHaveTags.length > 0) {
            visible = state.canHaveTags.some(tag => file.tags?.includes(tag));
        }

        file._hidden = !visible;
    });
}
```

### Step 4: Testing Checklist

- [ ] Search in Library View updates Galaxy View
- [ ] Search in Galaxy View updates Library View
- [ ] Tag filters apply to both views
- [ ] Selected file syncs between views
- [ ] No duplicate processing (better performance)
- [ ] State persists when switching views

---

## Success Criteria

### Functional Requirements
- ✅ Galaxy View shows 4000+ particles representing audio files
- ✅ FPS-style camera controls (WASD + mouse look)
- ✅ Particles pulse to currently playing audio
- ✅ Clicking particle loads file in global player
- ✅ Tab switching between Library and Galaxy views
- ✅ Search/filters work in both views
- ✅ Currently playing file highlighted in both views

### Architecture Requirements
- ✅ Clean modular code (~500 lines vs 2700)
- ✅ Follows existing patterns (state managers, components)
- ✅ Uses dependency injection
- ✅ No duplicate functionality
- ✅ Reuses existing player, Supabase, UI components

### Performance Requirements
- ✅ 60 FPS with 4000+ particles
- ✅ No lag when switching views
- ✅ Search/filter operations < 100ms
- ✅ Library View performance restored (no longer slow/laggy)

---

## File Checklist

### New Files Created
- [ ] `/src/views/galaxyView.js` - Galaxy visualization module
- [ ] `/src/state/viewStateManager.js` - Shared view state
- [x] `/docs/GALAXY_VIEW_EXTRACTION_PLAN.md` - This plan document

### Files Modified
- [ ] `/index.html` - Add galaxy view container, tab buttons
- [ ] `/src/core/app.js` - Initialize galaxy view, wire up state
- [ ] `/src/views/fileListRenderer.js` - Connect to viewStateManager
- [ ] `/styles/views.css` - Add galaxy view styles

### Files Removed (After successful extraction)
- [ ] `/src/views/galaxyView.js` (old buggy version)
- [ ] `/src/views/galaxyView-controls.js` (duplicate functionality)
- [ ] `/src/views/galaxyOptionsMenu.html` (UI panels - move to shared)

---

## Rollback Plan

If extraction fails or introduces new bugs:

```bash
# Restore to pre-extraction state
git restore .
git clean -fd

# Or revert specific files
git restore src/views/galaxyView.js
git restore index.html
git restore src/core/app.js
```

**Commit Strategy:**
1. Commit before extraction: "Snapshot before galaxy view extraction"
2. Commit after Phase 1: "Phase 1: Extract galaxy core module"
3. Commit after Phase 2: "Phase 2: Add view state manager"

---

## Current Status

### Completed
- [x] Analysis of reference visualizer
- [x] Review of integration guide
- [x] Decision to use Modified Option C
- [x] Plan document created

### In Progress
- [ ] Phase 1: Extract galaxy core module

### Pending
- [ ] Phase 2: Shared state manager
- [ ] Testing and bug fixes
- [ ] Documentation updates
- [ ] PR creation

---

## Session Handoff Notes

**For Next Session:**

1. **If Phase 1 incomplete:**
   - Read this plan: `/docs/GALAXY_VIEW_EXTRACTION_PLAN.md`
   - Check git status: `git status`
   - Continue extraction from visualizer-galaxy.html
   - Follow Step 2 of Phase 1

2. **If Phase 1 complete:**
   - Test galaxy view basic functionality
   - Begin Phase 2: View State Manager
   - Focus on search/filter integration

3. **If bugs encountered:**
   - Check reference file for correct implementation
   - Review integration guide troubleshooting section
   - Use git diff to see what changed
   - Can rollback if needed

**Key Files to Reference:**
- This plan: `/docs/GALAXY_VIEW_EXTRACTION_PLAN.md`
- Reference visualizer: `/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-visualizer-cline-refactor/views/visualizer-galaxy.html`
- Integration guide: `/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-visualizer-cline-refactor/GALAXY-INTEGRATION-GUIDE.md`
- Current implementation: `/src/views/galaxyView.js` (to be replaced)

---

**Last Updated:** 2025-10-19 (Session 1 - Plan created, extraction beginning)
