// Application state management
// All state variables exported for use across modules

// Core data and player state
export let audioFiles = [];
export let wavesurfer = null;
export let currentFileId = null;
export let selectedFiles = new Set();
export let processingFiles = new Set(); // Track files currently being processed

// Search and filtering
export let searchQuery = '';
export let currentTagMode = null; // Default mode for tag clicks (null = no mode, normal click behavior)
export let showAllTags = false; // Toggle for showing low-count tags
export let filters = {
    canHave: new Set(),
    mustHave: new Set(),
    exclude: new Set()
};
export let sortBy = 'date'; // 'name', 'date', 'bpm', 'key', 'length'
export let sortOrder = 'desc'; // 'asc' or 'desc'

// Waveform and mini waveforms
export let miniWaveforms = {}; // Track mini waveform instances by file ID

// Playback state
export let isLooping = false;
export let isShuffling = false;
export let currentRate = 1; // Track current playback rate (speed+pitch together)
export let isMuted = false; // Track mute state
export let volumeBeforeMute = 100; // Store volume before muting
export let userPaused = false; // Track if user manually paused (preserve pause state when scrolling files)

// Markers and bar tracking
export let markersEnabled = true; // Toggle for bar markers
export let markerFrequency = 'bar'; // 'bar8', 'bar4', 'bar2', 'bar', 'halfbar', 'beat'
export let currentMarkers = []; // Store current marker positions for click-to-snap
export let barStartOffset = 0; // Offset to shift which marker is considered bar 1

// Loop/Cycle mode state (combined edit + active loop)
export let loopStart = null; // Start time in seconds (or null if not set)
export let loopEnd = null; // End time in seconds (or null if not set)
export let cycleMode = false; // When true: can edit loop AND loop is active
export let nextClickSets = 'start'; // Track which point next click sets: 'start' or 'end'
export let immediateJump = 'off'; // Jump mode: 'off', 'on' (immediate), or 'clock' (quantized to next beat)
export let pendingJumpTarget = null; // Target time for clock-quantized jump
export let seekOnClick = 'off'; // Seek mode: 'off', 'seek' (immediate), or 'clock' (jump to loop start after setting end)
export let loopControlsExpanded = false; // Whether loop control buttons are expanded
export let loopFadesEnabled = false; // Whether to apply fades at loop boundaries
export let fadeTime = 0.015; // Fade duration in seconds (15ms default)

// Loop preservation across file changes
export let preserveLoopOnFileChange = true; // Whether to keep loop points when switching files (default ON)
export let preservedLoopStartBar = null; // Bar number for preserved loop start (e.g., bar 17)
export let preservedLoopEndBar = null; // Bar number for preserved loop end (e.g., bar 25)
export let preservedCycleMode = false; // Cycle mode state to preserve across file changes
export let preservedPlaybackPositionInLoop = null; // Relative position within loop (0.0 to 1.0) for seamless swap
export let bpmLockEnabled = false; // Whether to lock BPM across file changes
export let lockedBPM = null; // The BPM to maintain when switching files

// Loop action recorder
export let isRecordingActions = false; // Whether recording is active
export let recordingWaitingForStart = false; // Whether we're waiting for first keypress to start
export let recordedActions = []; // Array of {time: number, action: string, data: object}
export let recordingStartTime = null; // When recording actually started (first keypress time)
export let isPlayingBackActions = false; // Whether we're currently playing back recorded actions
export let playbackTimeouts = []; // Track all scheduled timeouts for playback so we can cancel them

// Metronome state
export let metronomeEnabled = false;
export let metronomeSound = 'click'; // 'click', 'beep', 'wood', 'cowbell'
export let metronomeAudioContext = null;
export let metronomeMasterGain = null; // Master gain to mute all metronome sounds instantly
export let scheduledMetronomeNotes = []; // Track scheduled audio nodes for cleanup
export let lastMetronomeScheduleTime = 0; // Track last time we scheduled metronome

// Upload and batch operation state
export let pendingUploadFiles = [];

// Modal state for batch tag editing
export let modalTags = new Map(); // Map of tag -> count
export let modalTagsToAdd = new Set();
export let modalTagsToRemove = new Set();
export let selectedModalTag = null; // Currently selected tag pill

// Progress tracking
export let progressInterval = null;
export let progressStartTime = null;

// File click tracking
export let lastClickedFileId = null;

// Setter functions for state that needs updates across modules
export function setAudioFiles(files) { audioFiles = files; }
export function setWavesurfer(ws) { wavesurfer = ws; }
export function setCurrentFileId(id) { currentFileId = id; }
export function setSearchQuery(query) { searchQuery = query; }
export function setCurrentTagMode(mode) { currentTagMode = mode; }
export function setShowAllTags(show) { showAllTags = show; }
export function setSortBy(sort) { sortBy = sort; }
export function setSortOrder(order) { sortOrder = order; }
export function setIsLooping(looping) { isLooping = looping; }
export function setIsShuffling(shuffling) { isShuffling = shuffling; }
export function setMarkersEnabled(enabled) { markersEnabled = enabled; }
export function setMarkerFrequency(freq) { markerFrequency = freq; }
export function setCurrentMarkers(markers) { currentMarkers = markers; }
export function setBarStartOffset(offset) { barStartOffset = offset; }
export function setLoopStart(start) { loopStart = start; }
export function setLoopEnd(end) { loopEnd = end; }
export function setCycleMode(mode) { cycleMode = mode; }
export function setNextClickSets(sets) { nextClickSets = sets; }
export function setImmediateJump(jump) { immediateJump = jump; }
export function setPendingJumpTarget(target) { pendingJumpTarget = target; }
export function setSeekOnClick(seek) { seekOnClick = seek; }
export function setLoopControlsExpanded(expanded) { loopControlsExpanded = expanded; }
export function setLoopFadesEnabled(enabled) { loopFadesEnabled = enabled; }
export function setFadeTime(time) { fadeTime = time; }
export function setIsMuted(muted) { isMuted = muted; }
export function setVolumeBeforeMute(volume) { volumeBeforeMute = volume; }
export function setUserPaused(paused) { userPaused = paused; }
export function setPreserveLoopOnFileChange(preserve) { preserveLoopOnFileChange = preserve; }
export function setPreservedLoopStartBar(bar) { preservedLoopStartBar = bar; }
export function setPreservedLoopEndBar(bar) { preservedLoopEndBar = bar; }
export function setPreservedCycleMode(mode) { preservedCycleMode = mode; }
export function setPreservedPlaybackPositionInLoop(pos) { preservedPlaybackPositionInLoop = pos; }
export function setBpmLockEnabled(enabled) { bpmLockEnabled = enabled; }
export function setLockedBPM(bpm) { lockedBPM = bpm; }
export function setIsRecordingActions(recording) { isRecordingActions = recording; }
export function setRecordingWaitingForStart(waiting) { recordingWaitingForStart = waiting; }
export function setRecordedActions(actions) { recordedActions = actions; }
export function setRecordingStartTime(time) { recordingStartTime = time; }
export function setIsPlayingBackActions(playing) { isPlayingBackActions = playing; }
export function setPlaybackTimeouts(timeouts) { playbackTimeouts = timeouts; }
export function setMetronomeEnabled(enabled) { metronomeEnabled = enabled; }
export function setMetronomeSound(sound) { metronomeSound = sound; }
export function setMetronomeAudioContext(context) { metronomeAudioContext = context; }
export function setMetronomeMasterGain(gain) { metronomeMasterGain = gain; }
export function setScheduledMetronomeNotes(notes) { scheduledMetronomeNotes = notes; }
export function setLastMetronomeScheduleTime(time) { lastMetronomeScheduleTime = time; }
export function setCurrentRate(rate) { currentRate = rate; }
export function setPendingUploadFiles(files) { pendingUploadFiles = files; }
export function setModalTags(tags) { modalTags = tags; }
export function setModalTagsToAdd(tags) { modalTagsToAdd = tags; }
export function setModalTagsToRemove(tags) { modalTagsToRemove = tags; }
export function setSelectedModalTag(tag) { selectedModalTag = tag; }
export function setProgressInterval(interval) { progressInterval = interval; }
export function setProgressStartTime(time) { progressStartTime = time; }
export function setLastClickedFileId(id) { lastClickedFileId = id; }
