# Audio Library - Unified Application

## Project Goal
Create a unified audio library application that merges features from multiple existing implementations into a single, modular, maintainable codebase.

## Source Files
- **Library View**: `index-v3-loop-markers-v31.html` (most complete player with loop markers)
- **Stems Functionality**: `stems-viewer-v9.html` (multi-stem player with Signalsmith Stretch)
- **Galaxy View**: `mobile_v37.html` (visualizer interface)
- **Reference**: Audio Sphere index.html (rate controls with semitone buttons)

## Core Features

### 1. Library View (Default)
- Grid/list display of audio files from Supabase
- File metadata display (BPM, key, duration)
- Search and filter functionality
- Click file to load into player

### 2. Main Player Bar
**Location**: Fixed at bottom of screen

**Controls** (from index-v3-loop-markers-v31.html):
- Play/Pause
- Previous/Next file
- Restart
- Loop toggle
- Markers toggle + frequency selector (every 8 bars, 4 bars, 2 bars, 1 bar, half bar, beat)
- Edit Loop mode + Seek toggle
- Rate controls:
  - Preset buttons: 0.5x, 1x, 2x
  - Slider: 0.025x - 4.0x
  - +/- semitone buttons (from Audio Sphere)
- Volume slider
- Time display (current / total)

**Waveform Display**:
- Visual waveform with progress cursor
- Beat/bar markers (configurable frequency)
- Loop region visualization (blue overlay)
- Click to seek (with beat-snapping when markers enabled)
- Non-zoomable (to keep markers aligned)

### 3. Stems Interface
**Trigger**: Stems button on main player bar
- Shows when current file has stems available
- Highlighted when viewing a stem or parent file with stems

**Behavior**: Expands upward from player bar, revealing 4 stem slots (drums, bass, other, vocals)

**Each Stem Player Has**:
- Individual play/pause
- Prev/Next stem (with shuffle mode)
- Mute button
- Loop toggle
- Edit Loop + Seek (independent from parent)
- Individual rate/pitch controls:
  - Speed: 0.5x, 1x, 2x buttons + slider
  - Pitch: -12, 0, +12 buttons + slider (semitones)
- Volume slider
- Waveform with markers
- Time display

**Parent Controls**:
- Master controls affect all stems globally
- Parent player waveform visible at bottom
- Parent audio muted (only stems audible)
- Sync all stems to parent timeline

**Time/Pitch Technology**:
- Signalsmith Stretch library (via AudioWorklet)
- Independent time and pitch control
- Low-latency, high-quality stretching
- Note: Requires local server for CORS (module imports)

### 4. Page View System
**Views**:
- Library View (default - file grid + player)
- Galaxy View (3D visualizer from mobile_v37)

**View Switcher**:
- Consistent UI element (dropdown or expandable menu)
- Same location across all views
- Content can vary per view
- Smooth transitions

**View Persistence**:
- Currently playing file persists across view changes
- Player state maintained (position, volume, rate, etc.)
- Stems state maintained if active

### 5. Beat/Bar Marker System
**Data Source**: Beatmap stored in Supabase (array of `{time, beatNum}`)

**Features**:
- Visual markers on waveforms (red bars, orange beats)
- Configurable frequency display
- Beat-aligned seeking (snaps to nearest visible marker)
- Works with tempo-stretched audio
- Markers adjust position based on playback rate

**Loop Integration**:
- Loop start/end points snap to markers
- Loop regions show as blue overlay
- Edit mode for setting loop boundaries
- Individual loops per player (parent + 4 stems)

### 6. Cycle Mode (from index-v3-loop-markers-v31.html)
- Retain cycle mode functionality
- Per-slot looping when switching files
- Maintains playback state across file changes

## Technical Architecture

### Directory Structure
```
audio-library-claude/
├── index.html                 # Main entry point
├── .claude/
│   ├── PROJECT_MEMORY.md      # Session workflow
│   └── ...
├── SESSION_LOG.txt            # Session history
├── src/
│   ├── core/
│   │   ├── supabase.js       # Supabase client & queries
│   │   ├── audioContext.js   # Web Audio API setup
│   │   └── state.js          # Global state management
│   ├── components/
│   │   ├── playerBar.js      # Main player controls
│   │   ├── waveform.js       # Waveform display component
│   │   ├── stemPlayer.js     # Individual stem player
│   │   ├── stemsInterface.js # Expandable stems container
│   │   ├── markers.js        # Beat/bar marker rendering
│   │   ├── loopControls.js   # Loop management
│   │   └── viewSwitcher.js   # Page view navigation
│   ├── views/
│   │   ├── libraryView.js    # File grid/list view
│   │   └── galaxyView.js     # 3D visualizer
│   ├── audio/
│   │   ├── signalsmith.js    # Signalsmith Stretch wrapper
│   │   └── timeStretch.js    # Time/pitch control logic
│   └── utils/
│       ├── formatting.js     # Time, BPM, key formatting
│       └── beatmap.js        # Beatmap utilities
├── lib/
│   ├── wavesurfer.js         # WaveSurfer.js (CDN or local)
│   ├── signalsmith-stretch/  # Signalsmith Stretch library
│   │   └── SignalsmithStretch.mjs
│   └── supabase.js           # Supabase client (CDN)
├── styles/
│   ├── main.css              # Global styles
│   ├── playerBar.css         # Player-specific styles
│   ├── stems.css             # Stems interface styles
│   └── views.css             # View-specific styles
└── README.md                 # Project documentation
```

### Component Communication
- **Event-driven architecture**: Custom events for player state changes
- **Centralized state**: `state.js` manages current file, playback state, stems visibility
- **Modular imports**: ES6 modules for clean dependencies

### Key Technologies
- **WaveSurfer.js v7**: Waveform visualization
- **Signalsmith Stretch**: Independent time/pitch shifting
- **Supabase**: Database + file storage
- **Web Audio API**: Low-level audio control
- **Vanilla JavaScript**: No framework dependencies (keep it simple)

## Development Priorities

### Phase 1: Foundation ✓
1. Project structure setup
2. Supabase integration
3. Basic player bar with controls
4. Waveform display

### Phase 2: Core Playback
1. Audio playback with WaveSurfer
2. Transport controls (play/pause/seek)
3. Rate/volume controls
4. Time display

### Phase 3: Markers & Loops
1. Beatmap rendering
2. Beat-aligned seeking
3. Loop controls (Edit Loop mode)
4. Loop region visualization

### Phase 4: Stems Integration
1. Signalsmith Stretch integration
2. Stems button + expandable interface
3. Individual stem players
4. Parent-to-stems control propagation
5. Independent time/pitch per stem

### Phase 5: Views System
1. View switcher component
2. Library view (file grid)
3. Galaxy view (visualizer)
4. State persistence across views

### Phase 6: Polish & Testing
1. Responsive design
2. Error handling
3. Performance optimization
4. User testing with real audio files

## Success Criteria
- ✅ Single HTML file with modular JS components
- ✅ All features from source files working
- ✅ Stems expand/collapse smoothly
- ✅ Time/pitch controls work independently
- ✅ Gapless looping with Signalsmith Stretch
- ✅ View switching maintains playback state
- ✅ Beat-aligned seeking with markers
- ✅ Clean, maintainable code structure

## Notes
- Use Supabase credentials from stems-viewer-v9.html
- Local server required for Signalsmith Stretch (CORS)
- No zoom on waveforms (keeps markers aligned)
- All parent controls affect stems globally
- Each stem can have individual time/pitch settings
- Markers use parent file's beatmap even for stems
