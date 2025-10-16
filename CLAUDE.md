# Audio Library Claude - Project Memory

**Project**: Audio Library Manager with Multi-View Support
**Branch**: experimental-v27-stem-independence
**Localhost**: http://localhost:5500/index.html

---

## 🚨 CRITICAL ARCHITECTURE RULES

### 1. FOLLOW REFACTORING BEST PRACTICES
**Follow general best practices for refactoring code with the goal of reusing components and functions across page views.**

If you're about to add significant functionality to `app.js`, **STOP** and refactor into components first.

### 2. MULTI-VIEW REQUIREMENT
This app has **3 views** that share the same player:
- **Library View** (file browser)
- **Galaxy View** (visual exploration)
- **Sphere View** (3D visualization)

**The player MUST be reusable across all views.**

If your solution only works in one view, it's wrong.

### 3. COMPONENT-BASED PLAYER
Player code belongs in **components**, not monolithic `app.js`:
- ✅ `src/components/playerBar.js` - PlayerBarComponent class
- ✅ `src/components/waveform.js` - WaveformComponent class
- ❌ NOT standalone functions scattered in app.js

**ONE component, instantiated 5 times** (parent + 4 stems).

---

## 🔴 BEFORE Touching Player Code

**READ THIS FIRST**: `PLAYER_ARCHITECTURE.md`

This file explains:
- Why components, not monolithic functions
- How to make player work across all views
- 3-phase refactoring plan

**Files requiring this read**:
- `src/core/app.js` (player section)
- `src/core/playerTemplate.js`
- `src/components/playerBar.js`
- `src/components/waveform.js`

---

## Workflow

### Session Start
```bash
# 1. Verify git repo and branch
pwd
ls -la .git
git remote -v  # Should show: audio-library-claude
git branch --show-current  # Current: experimental-v27-stem-independence (may vary)
git status

# 2. Create snapshot before editing
git add .
git commit -m "Snapshot before Claude: [task description]"
```

**Note**: User may start sessions in different branches. Always check current branch.

### After Each Round of Changes
```bash
# Commit working changes (enables easy reversion)
git add .
git commit -m "Claude: [what changed] - [WORKING/IN PROGRESS]"
```

**Update SESSION_LOG.txt** after each round with:
- What was changed
- Which files were modified
- Commit hash
- Testing notes

### Testing
- **Local server**: `python3 -m http.server 5500`
- **URL**: http://localhost:5500/index.html
- **Test ALL views**: Library, Galaxy, Sphere (when implemented)

### Session End
```bash
# Final commit if working
git commit -m "Claude: [summary] - WORKING"

# If broken - restore to last working commit
git restore .
# or
git reset --hard [last-working-commit-hash]
```

---

## Key Architecture Points

### Current State (WRONG - Being Fixed)
- ❌ `app.js` has ~6500 lines with all player logic
- ❌ Standalone functions: `toggleMarkers()`, `toggleStemMarkers(stemType)`, etc.
- ❌ Not reusable across views

### Target State (CORRECT)
- ✅ `PlayerBarComponent` class with all logic
- ✅ Instantiate once per player (parent + stems)
- ✅ Works in Library, Galaxy, Sphere views
- ✅ `app.js` only coordinates views/state (<2000 lines)

### Player Requirements
- Fixed bottom bar (persistent across view switches)
- Global state (mute in one view = mute in all views)
- Parent player + optional stem players (4 max)
- Template system (`playerTemplate.js`) generates HTML

---

## Common Issues

### CORS with Signalsmith Stretch
Run local server, don't open `file://` directly

### Stems Not Loading
Check Supabase connection and browser console

### Markers Misaligned
Keep waveform zoom disabled

---

## Detailed Documentation

**For specifics, see**:
- `PLAYER_ARCHITECTURE.md` - Full architecture design (READ FIRST for player work)
- `VERSION_27D_PROGRESS_SUMMARY.md` - Current implementation status
- `IMPLEMENTATION_GUIDE_V27D.md` - Technical implementation details
- Session handoff docs in root - Continue previous work

---

## Critical Reminders

**Before adding ANY player code**:
1. Is this component-based or monolithic? (Must be component-based)
2. Does it work in all views? (Must be reusable)
3. Have you read `PLAYER_ARCHITECTURE.md`? (Must read first)

**If you're adding functions directly to app.js instead of components, YOU ARE DOING IT WRONG.**

---

**Last Updated**: 2025-10-15
