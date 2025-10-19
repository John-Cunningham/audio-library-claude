# 🌌 Galaxy View Test - COMPLETELY ISOLATED

## What This Is

This is a **standalone test environment** for the new Galaxy View replacement. It does NOT touch or modify your main application files in any way.

## Files in This Test Directory

```
experiments/visualizer-extraction/
├── test-galaxy-view.html       # Standalone test page (NEW)
├── galaxyViewReplacement.js    # The new Galaxy View code (NEW)
├── galaxyOptionsMenu.html      # Options menu UI (NEW)
└── TEST_INSTRUCTIONS.md        # This file (NEW)
```

## Your Main App Status

✅ **Your main app is UNTOUCHED:**
- `index.html` - Not modified
- `src/core/app.js` - Not modified
- `src/views/galaxyView.js` - Original, unchanged

## How to Test

### Method 1: Open Directly
1. Open this file in your browser:
   ```
   file:///Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude/experiments/visualizer-extraction/test-galaxy-view.html
   ```

### Method 2: Use Local Server (Recommended)
1. Start a local server from the project root:
   ```bash
   cd /Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude
   python3 -m http.server 5501
   ```

2. Open in browser:
   ```
   http://localhost:5501/experiments/visualizer-extraction/test-galaxy-view.html
   ```

   Note: Using port 5501 so it doesn't conflict with your main app on port 5500

## Test Features

The test page includes:
- **File Upload** - Load your own audio files
- **Demo Files** - Quick test with fake data
- **File List** - Click files to play them
- **Galaxy View** - The exact visualizer from your original
- **Options Menu** - Full controls at bottom right

## Controls

- **Click in space** - Lock pointer for FPS navigation
- **WASD** - Move around
- **Mouse** - Look around (when locked)
- **Shift** - Sprint
- **Click particles** - Play that audio file
- **ESC** - Unlock pointer

## How It Works

This test page:
1. Creates its own `window.audioFiles` array
2. Creates its own `window.wavesurfer` instance
3. Loads the `galaxyViewReplacement.js` module
4. Provides a simple UI to load and play files
5. **Does NOT interact with your main app at all**

## When You're Ready to Integrate

If you like what you see and want to use this in your main app, follow the `DROP_IN_GUIDE.md` for integration instructions. But for now, this is just a safe test environment.

## Different URLs = Different Apps

- **Your main app**: http://localhost:5500/index.html
- **This test**: http://localhost:5501/experiments/visualizer-extraction/test-galaxy-view.html

They're completely separate and won't interfere with each other!