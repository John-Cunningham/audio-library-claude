# Audio Library Claude - Project Memory

## Quick Start Workflow

At the start of each session:

1. **Check repo & setup**
   ```bash
   pwd
   ls -la .git
   git branch --show-current
   git status --porcelain
   git remote -v
   ls -la SESSION_LOG.txt
   ```

2. **Create snapshot before editing**
   ```bash
   git add .
   git commit -m "Snapshot before Claude: [task description]"
   # git push  (only if remote exists)
   ```

3. **Append session header to SESSION_LOG.txt** (REDACT secrets)

4. **Make edits and test**
   - Edit files as needed
   - Test in browser (use local server for Signalsmith Stretch)
   - Verify functionality

5. **Finalize**
   - If working: commit with format below and push if remote exists
   - If broken: do NOT commit, recover and document in log

## Commit Message Formats
- Snapshot: `Snapshot before Claude: [task description]`
- Final success: `Claude: [what changed and why] - WORKING`
- Session log update: `Update session log`

## Session Log Template
```
================================================================================
SESSION: [YYYY-MM-DD] - [HH:MM:SS]
================================================================================
USER PROMPT:
[Exact prompt verbatim — REDACT secrets]

SNAPSHOT COMMIT: [hash]

CHANGES PLANNED:
- [What you'll modify]

---

CHANGES MADE:
- [file]: [what changed]

FILES MODIFIED:
- [list files]

FINAL COMMIT: [hash]
RESULT: ✅ SUCCESS or ❌ FAILED

TESTING NOTES:
- [what was tested, environment, edge cases]

================================================================================
```

## Project-Specific Notes

### Testing Requirements
- **Local Server Required**: Signalsmith Stretch needs CORS-enabled local server
- **Test Command**: `python3 -m http.server 8000` (or similar)
- **Test URL**: `http://localhost:8000/`
- **Browser**: Test in Chrome/Edge (best Web Audio API support)

### Key Files to Test
1. Player controls (play/pause/seek)
2. Waveform display and markers
3. Loop functionality (gapless looping)
4. Stems interface (expand/collapse)
5. Time/pitch controls (independent)
6. View switcher (state persistence)

### Important Dependencies
- **Supabase**: Database connection (credentials in code)
- **WaveSurfer.js v7**: CDN or local copy
- **Signalsmith Stretch**: Local library in `lib/signalsmith-stretch/`
- **Web Audio API**: Browser support required

### Architecture Decisions
- **Modular ES6**: All JS files use ES6 modules
- **No Framework**: Vanilla JS for simplicity
- **Event-Driven**: Components communicate via custom events
- **Single HTML**: Main entry point, dynamically loads views

### Common Issues & Solutions
1. **CORS Error with Signalsmith**
   - Solution: Run local server, don't open file:// directly

2. **Markers Misaligned**
   - Cause: Waveform zoom enabled
   - Solution: Keep zoom disabled

3. **Loop Gap**
   - See STEMS_VIEWER_V10_HANDOFF.md for optimization strategies
   - Use pre-scheduling approach

4. **Stems Not Loading**
   - Check Supabase connection
   - Verify file URLs are accessible
   - Check browser console for errors

## Rules
- **DO**: Create snapshot, log sessions, redact secrets, test before committing
- **DO NOT**: Commit broken code, skip snapshots, log secrets, break working features

## Recovery Commands
- Restore uncommitted changes: `git restore .`
- Reset to snapshot: `git reset --hard [snapshot-hash]`
- View diff: `git diff [snapshot-hash] HEAD`

## Next Session Auto-Load
This PROJECT_MEMORY.md will be automatically loaded at the start of future sessions.
