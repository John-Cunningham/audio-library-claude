# Audio Library - Unified Application

A modular audio library application that combines advanced playback features, multi-stem control, and visualization capabilities.

## Features

- **Advanced Playback**: Full-featured audio player with loop controls, markers, and precise seeking
- **Multi-Stem Support**: Independent control over drums, bass, vocals, and other stems
- **Independent Time/Pitch**: Adjust speed and pitch separately using Signalsmith Stretch
- **Beat-Aligned Navigation**: Snap to beats and bars for precise musical editing
- **Multiple Views**: Switch between library and visualizer views
- **Gapless Looping**: Perfect loops for DJ-style playback and practice

## Setup

### Prerequisites
- Modern web browser (Chrome, Edge, Firefox recommended)
- Local HTTP server (required for ES6 modules and CORS)

### Running Locally

1. Clone or download this repository

2. Start a local server from the project directory:
   ```bash
   # Python 3
   python3 -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000

   # Node.js (http-server)
   npx http-server -p 8000
   ```

3. Open in browser:
   ```
   http://localhost:8000/
   ```

### Why Local Server?
The Signalsmith Stretch library uses ES6 modules, which require CORS-enabled loading. Opening the HTML file directly (`file://`) will cause CORS errors.

## Project Structure

```
audio-library-claude/
├── index.html                # Main entry point
├── src/
│   ├── core/                # Core functionality
│   ├── components/          # Reusable UI components
│   ├── views/               # Page views
│   ├── audio/               # Audio processing
│   └── utils/               # Helper functions
├── lib/                     # External libraries
├── styles/                  # CSS stylesheets
└── docs/                    # Documentation
```

## Architecture

Built with vanilla JavaScript using ES6 modules for a clean, framework-free architecture:

- **Event-Driven**: Components communicate through custom events
- **Modular**: Each feature is a separate, testable module
- **State Management**: Centralized state for predictable behavior
- **Web Audio API**: Low-level audio control for precise timing

## Technologies

- **WaveSurfer.js v7**: Waveform visualization
- **Signalsmith Stretch**: High-quality time/pitch shifting
- **Supabase**: Backend database and file storage
- **Web Audio API**: Browser-native audio processing

## Development

### Making Changes

1. Create a snapshot commit before starting work
2. Make your changes
3. Test thoroughly in the browser
4. Commit working changes with descriptive message
5. Update SESSION_LOG.txt

See `.claude/PROJECT_MEMORY.md` for detailed workflow.

### Key Files

- `src/core/state.js` - Global state management
- `src/components/playerBar.js` - Main player controls
- `src/components/stemPlayer.js` - Individual stem players
- `src/audio/signalsmith.js` - Time/pitch shifting wrapper

## Testing

Test these key features after changes:

1. **Playback**: Play, pause, seek, volume
2. **Markers**: Beat visualization, snap-to-beat seeking
3. **Loops**: Set loop points, gapless playback
4. **Stems**: Expand interface, independent controls
5. **Time/Pitch**: Adjust speed/pitch separately
6. **Views**: Switch between library and visualizer

## Known Issues

See `PROJECT_REQUIREMENTS.md` for current status and planned improvements.

## License

[Specify license]

## Credits

Built by merging features from:
- audio-library-app (library view and loop controls)
- stems-viewer-v9 (multi-stem Signalsmith integration)
- Audio-Sphere-Visualizer (visualizer and UI elements)
