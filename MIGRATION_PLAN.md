# Migration Plan - Clean Directory Structure

**Branch**: `migration-clean-directory`
**Date**: 2025-10-18
**Goal**: Remove backup files, organize into clean structure

---

## Directory Structure (After Migration)

```
audio-library-claude/
├── .git/                      # Git repository (KEEP)
├── .claude/                   # Claude Code config (KEEP)
├── .gitignore                 # Git ignore file (KEEP)
├── index.html                 # Main production HTML (KEEP)
├── public/                    # Public assets (CREATE NEW)
│   ├── lib/                   # External libraries
│   ├── media/                 # Media files
│   ├── favicon_io/            # Favicons
│   └── icon/                  # App icons
├── styles/                    # CSS files (KEEP, CLEAN)
│   ├── main.css
│   ├── playerBar.css
│   ├── stems.css
│   └── views.css
├── src/                       # Source code (KEEP, CLEAN)
│   ├── audio/
│   ├── components/
│   ├── core/
│   ├── services/
│   ├── state/
│   ├── utils/
│   └── views/
├── docs/                      # Documentation (MOVE ALL .md/.txt HERE)
│   ├── architecture/          # Architecture docs
│   ├── refactoring/           # Refactoring progress docs
│   ├── handoffs/              # Session handoffs
│   └── archive/               # Old documentation
└── experiments/               # Experimental/legacy code (CREATE NEW)
    ├── modal-stem-icon-implementation/
    └── modular-multi-stem/
```

---

## Files to DELETE

### Backup Directories (DELETE ALL)
```
✗ app.js Backups/                          # Old app.js versions (covered by git)
✗ index.html Backups/                      # Old index.html versions (covered by git)
✗ stems.css Backups/                       # Old CSS versions (covered by git)
✗ STABLE_BACKUPS/                          # Manual backups (covered by git)
✗ src/core/app.js Backups/                 # Old app.js versions (covered by git)
✗ src/core/config.js Backups/              # Old config versions (covered by git)
✗ src/core/state.js Backups/               # Old state versions (covered by git)
✗ src/core/utils.js Backups/               # Old utils versions (covered by git)
✗ styles/stems.css Backups/                # Duplicate CSS backups (covered by git)
```

**Reason**: All these are historical versions covered by Git commits. Git history is the backup system.

---

### Old/Unused HTML Files (DELETE)
```
✗ index-cline.html                         # Old Cline version (not current)
✗ index-v31-backup-for-vscode.html         # Old backup (v31)
✗ index-v31-pre-stems.html                 # Old backup (v31 pre-stems)
✗ index_v7.html                            # Very old version (v7)
✗ test-template.html                       # Testing file (not needed)
✗ v31-full-script.js                       # Old monolithic script (not used)
```

**Reason**: Current production file is `index.html`. These are old versions covered by git history.

---

### Old/Unused Documentation Files (DELETE from root)
**Note**: Will move currently useful docs to `docs/` folder

```
✗ Chat Session 1 - Output 2025-10-14-4-49.txt     # Chat logs (not code docs)
✗ Chat Session 1 - Output 2025-10-14-7-38 (post clear).txt  # Chat logs
✗ CHANGELOG_v6_backup.txt                          # Old changelog backup
```

**Reason**: These are chat session logs, not technical documentation. Current CHANGELOG.txt is kept.

---

## Files to MOVE

### Move to `docs/` Folder
All .md and documentation .txt files currently in root:

```
→ docs/architecture/
  - APP_JS_AUDIT_2025-10-18.md
  - APP_JS_COMPREHENSIVE_ANALYSIS.md
  - APP_JS_FUNCTIONAL_BREAKDOWN.md
  - CODEBASE_AUDIT_REFACTORING_PLAN.md
  - COMPREHENSIVE_CODEBASE_ANALYSIS_V30.md
  - PLAYER_REFACTOR_ANALYSIS.md
  - PROJECT_STRUCTURE_AND_DEPENDENCIES.md
  - STEM_CODE_ANALYSIS.md
  - STEM_EXTRACTION_ANALYSIS.md

→ docs/refactoring/
  - ADVANCED_RATE_MODE_EXTRACTION_COMPLETE.md
  - CONTINUE_REFACTORING.md
  - LOOP_STATE_EXTRACTION_COMPLETE.md
  - NEXT_STEPS_V29.md
  - PARENT_CYCLE_MODE_FIX.md
  - PHASE_10E_ACTUAL_STATE_ANALYSIS.md
  - PHASE_10E_EXTRACTION_PLAN.md
  - PHASE_6_7_EXPLANATION.md
  - PHASE_6_COMMIT_MESSAGE.md
  - PHASE_6_FILE_LOADER_SUMMARY.md
  - PHASE_6_MARKER_BUG_FIX.md
  - PHASE_7_WAVEFORM_EXTRACTION_SUMMARY.md
  - PLAYER_STATE_EXTRACTION_COMPLETE.md
  - REFACTORING_ANALYSIS_V29.md
  - REFACTORING_LESSONS_LEARNED.md
  - REFACTORING_ROADMAP.md
  - REFACTORING_V29_COMPLETE.md
  - STEM_PLAYER_EXTRACTION_SUMMARY.md
  - STEM_REFACTOR_TEST_PLAN.md
  - STEM_STATE_EXTRACTION_COMPLETE.md

→ docs/handoffs/
  - Claude Refactor Plan 2025-10-17-10-35.md
  - LOOP_CONTROLS_HANDOFF.md
  - LOOP_CONTROLS_PHASE1_COMPLETE.md
  - NEXT_PHASE_HANDOFF.md
  - NEXT_REFACTORING_CANDIDATES.md
  - NEXT_SESSION_PROMPT.md
  - REFACTORING_HANDOFF_2025-10-17.md
  - REFACTORING_HANDOFF_2025-10-17_EVENING.md
  - SESSION_HANDOFF_2025-10-17.md
  - SESSION_HANDOFF_LOOP_STATE_EXTRACTION.md
  - SESSION_SUMMARY_2025-10-18.md
  - TESTING_CHECKLIST_REFACTOR_V29.md
  - TESTING_INSTRUCTIONS_STEM_STATE.md
  - USER_TESTING_GUIDE_V29.md

→ docs/ (root level)
  - APP_JS_ANALYSIS.md
  - CHANGELOG.txt (KEEP in root AND copy to docs/)
  - CLAUDE.md (KEEP in root - project memory)
  - PROJECT_FILE_STRUCTURE.txt
```

---

### Move to `experiments/` Folder
```
→ experiments/modal-stem-icon-implementation/     # Experimental modal code
→ experiments/modular-multi-stem/                 # Old multi-stem approach
```

**Reason**: These are experimental/legacy implementations, not current production code.

---

### Move to `public/` Folder
```
→ public/lib/              # External libraries (currently lib/)
→ public/media/            # Media files
→ public/favicon_io/       # Favicon files
→ public/icon/             # Icon files
```

**Reason**: Standard web project structure - all public assets in one place.

---

## Files to KEEP (No Changes)

### Root Files
```
✓ .gitignore               # Git configuration
✓ index.html               # Production HTML
✓ CHANGELOG.txt            # Current changelog
✓ CLAUDE.md                # Project memory (important!)
```

### Directories
```
✓ .git/                    # Git repository
✓ .claude/                 # Claude Code config
✓ src/                     # Source code (will clean backups inside)
✓ styles/                  # CSS files (will clean backups inside)
```

---

## Import Path Updates Required

After moving files to `public/`, these imports in `index.html` need updating:

**Current**:
```html
<script src="lib/signalsmith-stretch.umd.js"></script>
```

**New**:
```html
<script src="public/lib/signalsmith-stretch.umd.js"></script>
```

**Files to check**:
- index.html (favicon, icon, lib references)
- Any CSS files referencing media/ or icon/

---

## Summary Statistics

### DELETE
- 9 backup directories
- 6 old HTML/JS files
- 3 chat log files
- **Total**: ~18 items removed

### MOVE
- ~50 documentation files → `docs/`
- 2 experimental directories → `experiments/`
- 4 asset directories → `public/`
- **Total**: ~56 items reorganized

### KEEP (Production)
- 1 HTML file (index.html)
- 4 CSS files (styles/)
- ~80 JS modules (src/)
- 3 config files (.gitignore, CLAUDE.md, CHANGELOG.txt)
- **Total**: ~88 production files

---

## Execution Steps

1. ✓ Create `docs/` subdirectories (architecture, refactoring, handoffs)
2. ✓ Create `experiments/` directory
3. ✓ Create `public/` directory
4. ✓ Move documentation files to `docs/`
5. ✓ Move experimental code to `experiments/`
6. ✓ Move assets to `public/`
7. ✓ Delete all backup directories
8. ✓ Delete old HTML/JS files
9. ✓ Delete chat log files
10. ✓ Update import paths in index.html
11. ✓ Test application works
12. ✓ Commit to migration branch

---

## Questions for User

1. **Keep `docs/` folder in `src/`?** Currently planning to put `docs/` at root level alongside `src/`. Is this correct?

2. **Delete chat logs?** These files are large and not technical documentation:
   - `Chat Session 1 - Output 2025-10-14-4-49.txt` (715 KB)
   - `Chat Session 1 - Output 2025-10-14-7-38 (post clear).txt` (906 KB)

3. **Keep `modal-stem-icon-implementation/`?** Contains docs about processing modal implementation. Move to `experiments/` or keep?

4. **Keep `modular-multi-stem/`?** Contains old multi-stem approach. Move to `experiments/` or delete?

---

## Safety Notes

- **Git history preserves everything** - nothing is truly lost
- **Migration branch** - can abandon and start over if needed
- **Main branch untouched** - still has complete original structure
- **Test before commit** - verify app works after migration
