# Next Session Prompt - Audio Library Project

**Copy and paste this into your next Claude session to continue working on this codebase.**

---

## 📋 Session Context

I'm continuing work on my **Audio Library web application** - a browser-based audio player with multi-stem playback, loop controls, BPM detection, and multiple view modes.

**Branch**: `refactor-v28-player-component-architecture`
**Current State**: app.js at 2,670 lines (within target of 2,000-2,500)

---

## 🎯 Current Status

### ✅ What's Been Accomplished

**Recent Refactoring (Oct 17-18, 2025)**:
1. ✅ Phase 10a: Action Recorder extraction (140 lines removed)
2. ✅ Target achieved: 2,670 lines (was 3,578 - 25% reduction)
3. ✅ Component architecture established
4. ✅ Service layer created (FileLoader, ActionRecorder)
5. ✅ Comprehensive analysis completed

**Key Discovery**: Many stem functions are already thin wrappers! Only ~130-426 lines could realistically be extracted (not ~775 as initially thought).

### 📂 Project Structure

See `PROJECT_FILE_STRUCTURE.txt` for complete directory tree.

**Key Files**:
- `src/core/app.js` - 2,670 lines (main orchestrator)
- `src/components/playerBar.js` - 1,451 lines (player component, used 5x)
- `src/components/stemPlayerManager.js` - 884 lines (stem manager)
- `src/services/fileLoader.js` - 373 lines (file loading service)
- `src/services/actionRecorder.js` - 332 lines (action recorder - NEW!)

**Total**: ~10,800 lines JavaScript across 35 files

---

## 📚 Essential Reading (Start Here!)

**CRITICAL - Read these first**:
1. `NEXT_PHASE_HANDOFF.md` - Current state, recommendations
2. `PHASE_10E_ACTUAL_STATE_ANALYSIS.md` - Detailed function analysis
3. `PROJECT_STRUCTURE_AND_DEPENDENCIES.md` - Complete architecture overview
4. `SESSION_SUMMARY_2025-10-18.md` - Recent session summary

**Architecture Docs**:
- `docs/PLAYER_ARCHITECTURE.md` - Why component-based architecture
- `docs/IMPLEMENTATION_GUIDE_V27D.md` - Technical implementation details

---

## 🎯 What to Work On Next

### Option A: Continue Refactoring (Optional)

If you want to extract more code from app.js:

**Priority 1: Remove Duplicate** (Low risk, 86 lines)
- Delete `setupParentStemSync()` from app.js (line 807-891)
- It's duplicated in stemPlayerManager.js
- Use module version instead

**Priority 2: Extract Core Playback** (Medium value, 130 lines)
- `playAllStems()` - 14 lines
- `pauseAllStems()` - 12 lines
- `destroyMultiStemPlayerWavesurfers()` - 37 lines
- `updateStemAudioState()` - 57 lines
- Move to stemPlayerManager.js

See `PHASE_10E_ACTUAL_STATE_ANALYSIS.md` for complete extraction plan.

### Option B: Bug Fixes & Features (Recommended)

**Architecture is solid - focus on functionality!**

Common areas to improve:
- Bug fixes in player behavior
- New features requested by user
- UI/UX enhancements
- Performance optimizations
- Testing improvements

---

## 🏗️ Architecture Patterns to Follow

### 1. Component-Based
```javascript
// Use PlayerBarComponent for all player instances
const component = new PlayerBarComponent({
    playerType: 'parent',  // or 'stem'
    waveform: wavesurfer
})
```

### 2. Service Layer with Dependency Injection
```javascript
// Pass dependencies in constructor
const service = new ServiceClass({
    dependency1,
    dependency2,
    getterFunction: () => lazyDependency,  // For lazy loading!
    callback: (data) => { /* handle */ }
})
```

### 3. Thin Wrappers for HTML onclick
```javascript
// Keep simple wrappers in app.js for HTML compatibility
function togglePlay(stemType) {
    stemPlayerComponents[stemType]?.playPause()
}
window.togglePlay = togglePlay  // Expose to window
```

### 4. Module Exports
```javascript
// Export pure functions from modules
export function moduleFunction(state, dependencies) {
    // Logic here
}

// Import and use in app.js
import * as Module from './module.js'
Module.moduleFunction(state, deps)
```

---

## ⚠️ Important Reminders

### Before Making Changes

1. **Read relevant docs first** - Check handoff files
2. **Test after changes** - Run `python3 -m http.server 5500`
3. **Commit frequently** - After each logical change
4. **Follow thin wrapper pattern** - Logic in modules, wrappers in app.js

### Critical Files (Be Careful!)

- `src/core/app.js` - Main orchestrator, test thoroughly
- `src/components/playerBar.js` - Used 5x (parent + 4 stems)
- `src/core/playerTemplate.js` - HTML templates (1,326 lines!)

### Known Gotchas

- **Lazy dependencies**: Use getter functions `() => component` not direct references
- **Window scope**: HTML onclick needs `window.functionName = functionName`
- **OLD system**: fileListRenderer.js still uses old stem functions (can't remove)
- **State management**: Keep state in app.js, pass to components/services

---

## 🚀 Quick Start Commands

```bash
# Verify environment
git branch --show-current  # Should be: refactor-v28-player-component-architecture
git status                 # Check for uncommitted changes
wc -l src/core/app.js      # Should be: 2670

# Start development server
python3 -m http.server 5500

# Access app
# http://localhost:5500/index.html

# Common git workflow
git add .
git commit -m "description of changes"
git push
```

---

## 📝 Reporting Back

After making changes, please provide:

1. **What you changed** - Files modified, functions extracted, bugs fixed
2. **Line count update** - New app.js line count if changed
3. **Testing results** - What you tested, any issues found
4. **Commits made** - List of commit hashes and messages
5. **Next steps** - What should be done next

---

## 🎨 Current Features

**Multi-View System**:
- Library View (grid of audio files)
- Galaxy View (visual exploration)
- Sphere View (3D visualization)

**Audio Player**:
- WaveSurfer.js waveform visualization
- Playback rate control with time stretching (Signalsmith)
- Loop controls with cycle mode
- Beat markers synchronized to BPM
- Volume control, mute, solo

**Multi-Stem Player**:
- 4-stem separation (vocals, drums, bass, other)
- Independent playback controls per stem
- Parent-stem synchronization
- Individual stem looping (cycle mode)
- Independent rate control per stem

**File Management**:
- Supabase database integration
- Tag system (create, edit, filter)
- Batch operations
- Upload management
- BPM/Key detection

**Advanced Features**:
- Action recording/playback (NEW!)
- Keyboard shortcuts
- Metronome
- Search/navigation
- Processing modal with progress

---

## 📖 Documentation Map

**Session Handoffs**:
- `NEXT_PHASE_HANDOFF.md` - **START HERE**
- `SESSION_SUMMARY_2025-10-18.md` - Recent work

**Analysis Documents**:
- `PHASE_10E_ACTUAL_STATE_ANALYSIS.md` - Function-by-function analysis
- `PROJECT_STRUCTURE_AND_DEPENDENCIES.md` - Complete architecture
- `APP_JS_ANALYSIS.md` - app.js breakdown
- `STEM_CODE_ANALYSIS.md` - Stem code duplication analysis

**Architecture Guides**:
- `docs/PLAYER_ARCHITECTURE.md` - Component-based design rationale
- `docs/IMPLEMENTATION_GUIDE_V27D.md` - Technical implementation
- `docs/TEMPLATE_SYSTEM_DOCS.md` - playerTemplate.js documentation

**Extraction Plans** (optional):
- `PHASE_10E_EXTRACTION_PLAN.md` - Stem extraction roadmap
- `REFACTORING_ROADMAP.md` - Overall refactoring plan

---

## 🎯 Success Criteria

**Code Quality**:
- ✅ Component-based architecture
- ✅ Service layer separation
- ✅ Thin wrapper pattern
- ✅ Dependency injection

**Metrics**:
- ✅ app.js within 2,000-2,500 lines (current: 2,670)
- ✅ 25% reduction achieved (3,578 → 2,670)
- ✅ Functions delegating to components/services

**Functionality**:
- All features working
- No regression bugs
- Good performance
- Clean UI/UX

---

## 💡 Recommendations

**My recommendation**: The refactoring work is in excellent shape! Consider focusing on:

1. **Bug fixes** - Fix any existing issues
2. **New features** - Implement requested functionality
3. **Testing** - Ensure everything works correctly
4. **Documentation** - Update docs as you add features

Further refactoring is optional and would be diminishing returns (~130-426 lines max vs. effort required).

---

**Ready to start?** Read `NEXT_PHASE_HANDOFF.md` first, then let me know what you'd like to work on!

---

**Last Updated**: October 18, 2025
**Branch**: refactor-v28-player-component-architecture
**Status**: ✅ Refactoring target achieved, architecture solid
