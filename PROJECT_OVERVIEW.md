# Audio Library Claude - Quick Start Overview

**Last Updated**: 2025-10-18
**Status**: ✅ Production Ready - V29 Refactoring Complete + Clean Migration
**Branch**: `main`
**Test Server**: `python3 -m http.server 5500` → http://localhost:5500/index.html

---

## 🎯 What This App Does

Multi-view audio library manager with:
- **Upload audio** → Auto-detect BPM, key, instruments, chords
- **Separate stems** → Vocals, drums, bass, other (4 stems)
- **Multi-stem player** → Independent controls per stem
- **Advanced playback** → Loops, markers, metronome, rate/pitch control
- **Tag filtering** → Can-have, must-have, exclude modes
- **3 Views**: Library (working), Galaxy (planned), Sphere (planned)

---

## 📂 Directory Structure (Post-Migration)

```
audio-library-claude/
├── index.html              # Main HTML
├── CLAUDE.md               # Detailed project memory (READ FIRST for architecture)
├── PROJECT_OVERVIEW.md     # This file - quick reference
├── CHANGELOG.txt           # Version history
├── SESSION_HANDOFF_2025-10-18.md  # Latest session handoff
│
├── public/                 # Assets (lib, media, icon)
├── styles/                 # CSS (main, playerBar, stems, views)
├── src/
│   ├── audio/              # Audio processing
│   ├── components/         # 14 UI component modules
│   ├── core/               # app.js (coordinator), viewManager, config
│   ├── services/           # FileLoader, ActionRecorder
│   ├── state/              # PlayerState, LoopState, StemState managers
│   ├── utils/              # Utility functions
│   └── views/              # libraryView, galaxyView, sphereView
│
├── docs/                   # Documentation (organized by category)
│   ├── architecture/       # Code analysis docs
│   ├── refactoring/        # Refactoring progress docs
│   ├── handoffs/           # Session handoff docs
│   └── claude-code-chat-session-logs/
│
└── experiments/            # Legacy/experimental code (deprecated)
```

**🚨 No backup folders** - Git history is the backup system.

---

## 🏗️ Architecture Pattern (V29)

### Core Principle: **Thin Coordinator + Modular Components**

```
app.js (~1900 lines)
  ↓ (coordinates)
  ├── State Managers (PlayerState, LoopState, StemState)
  ├── Components (LoopControls, AdvancedRateMode, etc.)
  ├── Services (FileLoader, ActionRecorder)
  └── Views (Library, Galaxy, Sphere)
```

### State Management
- **PlayerStateManager** (`src/state/playerStateManager.js`) - Volume, rate, mute, shuffle, etc.
- **LoopStateManager** (`src/state/loopStateManager.js`) - Loop start/end, cycle mode, markers
- **StemStateManager** (`src/state/stemStateManager.js`) - Per-stem controls, loops, markers

### Multi-View System
- **ViewManager** (`src/core/viewManager.js`) - Handles view lifecycle (init, update, destroy)
- **Views** share same player state (persistent across view switches)
- **Player bar** always visible at bottom in all views

---

## 🚨 Critical Rules for Adding Code

### ❌ DON'T:
1. Add large functions directly to `app.js`
2. Mutate state directly (use state managers)
3. Create global variables (use state managers)
4. Skip testing before committing

### ✅ DO:
1. Create modules in `src/components/`, `src/state/`, or `src/services/`
2. Use dependency injection (pass state/callbacks to modules)
3. Add thin wrappers in `app.js` (3-7 lines max)
4. Test in browser after every change
5. Commit frequently with clear messages

### Pattern for New Features:
```javascript
// 1. Create module: src/components/myFeature.js
export function myFeature(state, callbacks) {
    // Business logic here (100+ lines)
}

// 2. Add thin wrapper in app.js (3-7 lines)
function handleMyFeature() {
    return MyFeature.myFeature(
        { /* state */ },
        { /* callbacks */ }
    );
}

// 3. Expose to window if needed by HTML
window.handleMyFeature = handleMyFeature;
```

---

## 🔥 Quick Start for New Sessions

### 1. Check Project State
```bash
cd "/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude"
git branch --show-current  # Should show: main (or feature branch)
git status                 # Should be clean
git log --oneline -5       # Recent commits
```

### 2. Read Documentation
- **First Time**: Read `CLAUDE.md` (detailed architecture)
- **Continuing Work**: Read latest handoff in `docs/handoffs/`
- **Understanding Feature**: Check `docs/architecture/APP_JS_AUDIT_2025-10-18.md`

### 3. Start Development
```bash
# Create feature branch
git checkout -b feature-name

# Start local server (REQUIRED for CORS)
python3 -m http.server 5500

# Open in browser
open http://localhost:5500/index.html
```

### 4. Test Checklist
- [ ] Upload file (drag-and-drop or button)
- [ ] File processes (BPM/key detected)
- [ ] Player works (play, pause, seek)
- [ ] Volume/mute works
- [ ] Multi-stem player works (expand stems, independent controls)
- [ ] Tags filter correctly
- [ ] No console errors

---

## 🎵 Key Features Status

### ✅ Working Features
- File upload with auto-processing
- Stem separation (vocals, drums, bass, other)
- Multi-stem player with independent controls
- Tag filtering (can-have, must-have, exclude)
- Loop controls with cycle mode
- Markers (bar/beat) with shift start
- Metronome with sound selection
- Rate/pitch control (basic + advanced)
- Action recording for loops
- BPM lock / Preserve loop across file changes
- Responsive mobile design

### 🚧 In Progress
- Galaxy View (audio-reactive particle visualization)
- Sphere View (3D visualization)

### 🐛 Known Issues
- Legacy stem player (file list expansion waveforms) not working → **Deprecated, not fixing**
- [Add other issues as discovered]

---

## 📖 Important Files to Know

### Core Application
- `src/core/app.js` - Main coordinator (~1900 lines, down from ~6500)
- `src/core/viewManager.js` - Handles view switching (Library, Galaxy, Sphere)
- `index.html` - Main HTML with view tabs and containers

### State Management
- `src/state/playerStateManager.js` - Player state
- `src/state/loopStateManager.js` - Loop state
- `src/state/stemStateManager.js` - Stem state

### Key Components
- `src/components/loopControls.js` - Loop UI and logic
- `src/components/advancedRateMode.js` - Speed/pitch controls
- `src/components/stemLegacyPlayer.js` - Legacy stem waveforms (deprecated)
- `src/services/fileLoader.js` - File loading service
- `src/services/actionRecorder.js` - Loop action recording

### Views
- `src/views/libraryView.js` - File list view (working)
- `src/views/galaxyView.js` - Galaxy visualization (stub)
- `src/views/sphereView.js` - 3D visualization (stub)
- `src/views/fileListRenderer.js` - Renders file list HTML

---

## 🔍 How to Find Things

### "Where is X functionality?"
1. Check `docs/architecture/APP_JS_AUDIT_2025-10-18.md` - Complete app.js breakdown
2. Search in `src/` directory: `grep -r "functionName" src/`
3. Check `app.js` for window exposures (search `window.`)

### "How does X work?"
1. Check state manager in `src/state/`
2. Check component in `src/components/`
3. Read refactoring docs in `docs/refactoring/`

### "What changed recently?"
1. `git log --oneline -10` - Recent commits
2. Check `CHANGELOG.txt` - Version history
3. Check `docs/handoffs/` - Session handoff documents

---

## 🚀 Common Tasks

### Add New Feature
1. Create module: `src/components/myFeature.js`
2. Add thin wrapper in `app.js` (3-7 lines)
3. Expose to window if needed by HTML
4. Test thoroughly
5. Update `CLAUDE.md` and `CHANGELOG.txt`

### Fix Bug
1. Identify which module has the bug (NOT app.js!)
2. Fix in the module
3. Test thoroughly
4. Commit with clear message: `fix: Description of bug fix`

### Refactor Code
1. Read `docs/refactoring/REFACTORING_LESSONS_LEARNED.md`
2. Follow existing patterns (state managers, dependency injection)
3. Extract to module (keep app.js thin)
4. Test after each extraction
5. Document in `docs/refactoring/`

---

## 🌿 Git Workflow

### Starting New Work
```bash
git checkout main
git pull origin main
git checkout -b feature-name  # OR bugfix-name
```

### During Development
```bash
# Commit frequently
git add .
git commit -m "feat: Description

Detailed explanation if needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Completing Work
```bash
git push origin feature-name
gh pr create --title "Feature name" --body "Description"
# Merge PR when ready
```

---

## 📊 Project Metrics

### Code Quality (Post-V29 Refactoring)
- **app.js**: ~1900 lines (was ~6500) ✅
- **Total modules**: 34
- **State managers**: 3
- **Components**: 14
- **Views**: 3 (1 working, 2 planned)

### Repository Health
- ✅ Clean directory (no backup folders)
- ✅ Organized documentation (`docs/`)
- ✅ Complete git history
- ✅ Clean `main` branch

---

## 💡 Key Concepts

### Hybrid State Pattern
- **Local cache**: Variables in `app.js` for quick access (e.g., `audioFiles`, `currentFileId`)
- **State managers**: Centralized state for complex features (Player, Loop, Stem)
- **Why both**: Performance + maintainability

### Dependency Injection
- Modules don't access global state directly
- State and callbacks passed as parameters
- Makes modules testable and reusable

### Multi-View Architecture
- **3 views share same player**: Library, Galaxy, Sphere
- **Player bar persistent**: Always visible at bottom
- **State preserved**: Playback continues when switching views
- **ViewManager handles lifecycle**: init() → update() → destroy()

---

## ⚠️ Common Pitfalls

1. **Adding logic to app.js** → Extract to module instead
2. **Forgetting to test** → Always test in browser before committing
3. **Breaking view switching** → Ensure player state persists across views
4. **Not documenting changes** → Update CLAUDE.md and CHANGELOG.txt
5. **Working directly on main** → Always use feature branches

---

## 📞 Getting Help

### New to the Codebase?
1. Read `CLAUDE.md` (detailed project memory)
2. Read `docs/architecture/COMPREHENSIVE_CODEBASE_ANALYSIS_V30.md`
3. Check latest handoff in `docs/handoffs/`

### Stuck on Implementation?
1. Look at similar existing features
2. Follow existing patterns (state managers, dependency injection)
3. When in doubt: extract to module, use dependency injection

### Something Broke?
```bash
# Revert to last working commit
git log --oneline -10  # Find last working commit hash
git reset --hard [commit-hash]
```

---

## 🎓 Success Stories (V29 Refactoring)

### Before V29:
- ❌ app.js: ~6500 lines (monolithic)
- ❌ No state management (global variables everywhere)
- ❌ Duplicate code (parent + stem versions of same functions)
- ❌ Hard to maintain, test, or add features

### After V29:
- ✅ app.js: ~1900 lines (coordinator)
- ✅ 3 state managers (PlayerState, LoopState, StemState)
- ✅ 14 component modules (reusable, testable)
- ✅ Clean architecture (easy to add features)

**Key Lesson**: Extract early, extract often. Keep app.js thin!

---

## 🚀 Next Steps

### Immediate Priority (2025-10-18)
1. **Galaxy View Integration** - Audio-reactive particle visualization
   - Infrastructure already exists (ViewManager, view tabs)
   - Just needs visualization code added to `galaxyView.js`
2. **Bug Fixes** - Address any critical issues
3. **Sphere View** - 3D visualization (future)

### Future Enhancements
- PWA support (offline mode, add to home screen)
- Playlist management
- Export/share functionality
- Social features (collaborative libraries)

---

## 📝 Handoff Notes

**From SESSION_HANDOFF_2025-10-18.md:**
- ✅ V29 refactoring complete
- ✅ Clean directory migration complete
- ✅ Documentation updated (CLAUDE.md, handoffs)
- ✅ Merged to main and pushed to GitHub
- 🚧 Galaxy View integration ready to start

**Starting Galaxy View work:**
1. Create feature branch: `git checkout -b feature-galaxy-view-integration`
2. Implement audio-reactive visualization in `galaxyView.js`
3. Test view switching (Library ↔ Galaxy)
4. Ensure player persists across views

---

**Remember**: This codebase is clean, modular, and well-documented. Keep it that way! When in doubt, extract to a module and use dependency injection.

**Happy coding!** 🚀
