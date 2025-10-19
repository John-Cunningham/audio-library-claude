        /**
         * AUDIO LIBRARY CLAUDE - MAIN APPLICATION
         *
         * Coordinates all modules and manages state synchronization.
         * Uses hybrid state pattern: local cache for performance + centralized state managers for multi-view persistence.
         */


        import { supabase, PREF_KEYS } from './config.js';
        import * as Utils from './utils.js';
        import { generateStemPlayerBar } from './playerTemplate.js';
        import { PlayerBarComponent } from '../components/playerBar.js';
        import { WaveformComponent } from '../components/waveform.js';
        import { FileLoader } from '../services/fileLoader.js';
        import { ActionRecorder } from '../services/actionRecorder.js';

        import * as Metronome from './metronome.js';
        import { initKeyboardShortcuts } from './keyboardShortcuts.js';
        import * as ProgressBar from '../utils/progressBar.js';
        import * as MiniWaveform from '../components/miniWaveform.js';
        import { calculateBPMFromOnsets } from '../utils/bpmDetector.js';
        import * as TagManager from './tagManager.js';
        import * as TagEditModal from '../components/tagEditModal.js';
        import * as FileProcessor from './fileProcessor.js';
        import * as FileListRenderer from '../views/fileListRenderer.js';
        import * as BatchOperations from './batchOperations.js';
        import * as UploadManager from './uploadManager.js';
        import * as LoopControls from '../components/loopControls.js';
        import * as MarkerSystem from '../components/markerSystem.js';
        import * as StemMarkerSystem from '../components/stemMarkerSystem.js';
        import * as StemPlayerManager from '../components/stemPlayerManager.js';
        import * as StemLegacyPlayer from '../components/stemLegacyPlayer.js';
        import * as AdvancedRateMode from '../components/advancedRateMode.js';

        import * as StemState from '../state/stemStateManager.js';
        import * as LoopState from '../state/loopStateManager.js';
        import * as PlayerState from '../state/playerStateManager.js';

        import * as ViewManager from './viewManager.js';
        import * as LibraryView from '../views/libraryView.js';
        import * as GalaxyView from '../views/galaxyView.js';
        import * as SphereView from '../views/sphereView.js';


        let audioFiles = [];
        let wavesurfer = null;
        let parentWaveform = null;
        let parentPlayerComponent = null;
        let fileLoader = null;
        let actionRecorder = null;
        let stemPlayerComponents = {};

        let selectedFiles = new Set();
        let processingFiles = new Set();
        let expandedStems = new Set();

        let stemWavesurfers = {};
        let stemFiles = {};
        let allStemFiles = {};
        let stemMuted = {};
        let stemSoloed = {};
        let stemVolumes = {};

        let searchQuery = '';
        let currentTagMode = null;
        let showAllTags = false;

        let pendingUploadFiles = [];

        // ============================================
        // LOOP STATE - HYBRID PATTERN
        // ============================================
        /**
         * 17 variables synced to LoopStateManager.
         * Local cache for performance, centralized state for multi-view persistence.
         */

        let loopStart = LoopState.getLoopStart();
        let loopEnd = LoopState.getLoopEnd();
        let cycleMode = LoopState.getCycleMode();
        let nextClickSets = LoopState.getNextClickSets();
        let immediateJump = LoopState.getImmediateJump();
        let pendingJumpTarget = LoopState.getPendingJumpTarget();
        let seekOnClick = LoopState.getSeekOnClick();
        let loopControlsExpanded = LoopState.getLoopControlsExpanded();
        let loopFadesEnabled = LoopState.getLoopFadesEnabled();
        let fadeTime = LoopState.getFadeTime();
        let preserveLoopOnFileChange = LoopState.getPreserveLoopOnFileChange();
        let preservedLoopStartBar = LoopState.getPreservedLoopStartBar();
        let preservedLoopEndBar = LoopState.getPreservedLoopEndBar();
        let preservedCycleMode = LoopState.getPreservedCycleMode();
        let preservedPlaybackPositionInLoop = LoopState.getPreservedPlaybackPositionInLoop();
        let bpmLockEnabled = LoopState.getBpmLockEnabled();
        let lockedBPM = LoopState.getLockedBPM();

        // ============================================
        // PLAYER STATE - HYBRID PATTERN
        // ============================================
        /**
         * 11 variables synced to PlayerStateManager.
         * Local cache for performance, centralized state for multi-view persistence.
         */

        let currentFileId = PlayerState.getCurrentFileId();
        let currentRate = PlayerState.getCurrentRate();
        let isShuffling = PlayerState.getIsShuffling();
        let userPaused = PlayerState.getUserPaused();
        let isMuted = PlayerState.getIsMuted();
        let volumeBeforeMute = PlayerState.getVolumeBeforeMute();
        let markersEnabled = PlayerState.getMarkersEnabled();
        let markerFrequency = PlayerState.getMarkerFrequency();
        let barStartOffset = PlayerState.getBarStartOffset();
        let currentMarkers = PlayerState.getCurrentMarkers();
        let isLooping = PlayerState.getIsLooping();
        let filters = {
            canHave: new Set(),
            mustHave: new Set(),
            exclude: new Set()
        };
        let sortBy = 'date';
        let sortOrder = 'desc';


        function setTagMode(mode) {
            TagManager.setMode(mode);
        }

        function handleSearch(query) {
            searchQuery = query;
            TagManager.render(searchQuery);
            FileListRenderer.render();
        }

        function handleSearchKeydown(e) {
            if (e.key === 'Enter') {
                e.target.blur();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const firstTag = document.querySelector('.tag-pill');
                if (firstTag) {
                    firstTag.focus();
                } else {
                    const firstFile = document.querySelector('.file-item');
                    if (firstFile) {
                        firstFile.click();
                    }
                }
            }
        }


        async function loadData() {
            try {
                const { data, error } = await supabase
                    .from('audio_files')
                    .select('*')
                    .order('created_at', { ascending: false});

                if (error) throw error;

                audioFiles = data || [];

                // Phase 4 Fix 1: Preload ALL stem files for instant access
                await preloadAllStems();

                if (!ViewManager.getCurrentViewName()) {
                    ViewManager.registerView('library', LibraryView);
                    ViewManager.registerView('galaxy', GalaxyView);
                    ViewManager.registerView('sphere', SphereView);

                    await ViewManager.switchView('library', {
                        renderFunction: FileListRenderer.render,
                        renderTagsFunction: renderTags
                    });
                } else {
                    renderTags();
                    FileListRenderer.render();
                }
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Error loading files from Supabase. Check console for details.');
            }
        }

        // Phase 4 Fix 1: Preload all stem files from database
        async function preloadAllStems() {
            allStemFiles = await StemPlayerManager.preloadAllStems(supabase);
        }


        // ============================================
        // STEM PLAYBACK FUNCTIONS (Legacy OLD System)
        // ============================================
        async function fetchStemFiles(parentFileId) {
            return await StemPlayerManager.fetchStemFiles(supabase, parentFileId);
        }

        function destroyAllStems() {
            const result = StemPlayerManager.destroyAllStems({
                stemWavesurfers,
                stemPlayerWavesurfers,
                stemPlayerComponents,
                wavesurfer
            });

            stemWavesurfers = result.stemWavesurfers;
            syncWavesurfersToState(result.stemPlayerWavesurfers);
            syncComponentsToState(result.stemPlayerComponents);
            stemFiles = result.stemFiles;
            syncReadyCountToState(result.multiStemReadyCount);
            syncPreloadedToState(result.stemsPreloaded);
            syncExpandedToState(result.multiStemPlayerExpanded);
        }

        function createStemWaveSurfer(stemType) {
            return StemPlayerManager.createStemWaveSurfer(stemType, WaveSurfer);
        }

        async function loadStems(parentFileId, autoplay = true) {
            const result = await StemPlayerManager.loadStems(parentFileId, {
                allStemFiles,
                stemWavesurfers
            }, WaveSurfer, autoplay);

            if (result.success) {
                stemWavesurfers = result.stemWavesurfers;
                stemFiles = result.stemFiles;
                syncStemsWithMain(autoplay);
            }

            return result.success;
        }

        function syncStemsWithMain(autoplay = true) {
            StemPlayerManager.syncStemsWithMain({
                wavesurfer,
                stemWavesurfers
            }, autoplay);
        }

        function updateStemAudioState() {
            const volumeSlider = document.getElementById('volumeSlider');
            const sliderValue = volumeSlider ? parseFloat(volumeSlider.value) : 100;
            const sliderMax = volumeSlider ? parseFloat(volumeSlider.max) : 398;

            const masterVolume = sliderValue === 0 ? 0 : sliderValue / sliderMax;

            if (multiStemPlayerExpanded) {
                StemPlayerManager.updateMultiStemVolumes(stemPlayerWavesurfers, masterVolume);
            }

            StemLegacyPlayer.updateLegacyStemVolumes({
                masterVolume,
                stemWavesurfers,
                stemFiles,
                stemVolumes,
                stemMuted,
                stemSoloed
            });
        }

        // ============================================
        // STEM PLAYBACK FUNCTIONS (Legacy OLD System)
        // ============================================
        function initWaveSurfer() {
            if (!parentWaveform) {
                parentWaveform = new WaveformComponent({
                    playerType: 'parent',
                    container: '#waveform',
                    dependencies: {
                        Metronome: Metronome
                    }
                });
            }

            wavesurfer = parentWaveform.create(WaveSurfer);

            if (!parentPlayerComponent) {
                parentPlayerComponent = new PlayerBarComponent({
                    playerType: 'parent',
                    waveform: wavesurfer
                });
                parentPlayerComponent.init();
                console.log('Parent PlayerBarComponent initialized');
            } else {
                parentPlayerComponent.waveform = wavesurfer;
                console.log('Parent PlayerBarComponent waveform reference updated');
            }
        }


        function handleTagClick(tag, event) {
            TagManager.handleClick(tag, event);
        }

        function selectAllVisibleTags() {
            TagManager.selectAllVisible();
        }

        function deselectAllTags() {
            TagManager.deselectAll();
        }

        function renderTags(searchQuery = '') {
            TagManager.render(searchQuery);
        }

        function toggleShowAllTags() {
            TagManager.toggleShowAll();
        }




        function updateStemsButton() {
            StemPlayerManager.updateStemsButton({
                allStemFiles,
                currentFileId,
                multiStemPlayerExpanded
            });

            const stemsBtn = document.getElementById('stemsBtn');
            if (stemsBtn && stemsBtn.style.display !== 'none') {
                if (multiStemPlayerExpanded) {
                    stemsBtn.innerHTML = '<span>▼ STEMS</span>';
                } else {
                    stemsBtn.innerHTML = '<span>▲ STEMS</span>';
                }
            } else if (stemsBtn) {
                if (multiStemPlayerExpanded) {
                    toggleMultiStemPlayer();
                }
            }
        }

        // ============================================
        // STEM STATE - HYBRID PATTERN
        // ============================================
        /**
         * Variables synced to StemStateManager.
         * Local cache for performance, centralized state for multi-view persistence.
         */

        let multiStemPlayerExpanded = StemState.isExpanded();
        let stemPlayerWavesurfers = StemState.getPlayerWavesurfers();
        stemPlayerComponents = StemState.getPlayerComponents();
        let multiStemReadyCount = StemState.getReadyCount();
        let multiStemAutoPlayOnReady = StemState.getAutoPlayOnReady();
        let stemsPreloaded = StemState.isPreloaded();
        let currentParentFileBPM = StemState.getCurrentParentFileBPM();

        function syncExpandedToState(value) {
            multiStemPlayerExpanded = value;
            StemState.setExpanded(value);
        }

        function syncWavesurfersToState(wavesurfers) {
            stemPlayerWavesurfers = wavesurfers;
            StemState.setPlayerWavesurfers(wavesurfers);
        }

        function syncComponentsToState(components) {
            stemPlayerComponents = components;
            StemState.setPlayerComponents(components);
            window.stemPlayerComponents = components; // Legacy window exposure
        }

        function syncReadyCountToState(count) {
            multiStemReadyCount = count;
            StemState.setReadyCount(count);
        }

        function syncAutoPlayToState(value) {
            multiStemAutoPlayOnReady = value;
            StemState.setAutoPlayOnReady(value);
        }

        function syncPreloadedToState(value) {
            stemsPreloaded = value;
            StemState.setPreloaded(value);
        }

        function syncParentBPMToState(bpm) {
            currentParentFileBPM = bpm;
            StemState.setCurrentParentFileBPM(bpm);
        }

        // ============================================

        function syncLoopStartToState(value) {
            loopStart = value;
            LoopState.setLoopStart(value);
        }

        function syncLoopEndToState(value) {
            loopEnd = value;
            LoopState.setLoopEnd(value);
        }

        function syncCycleModeToState(value) {
            cycleMode = value;
            LoopState.setCycleMode(value);
        }

        function syncNextClickSetsToState(value) {
            nextClickSets = value;
            LoopState.setNextClickSets(value);
        }

        function syncImmediateJumpToState(value) {
            immediateJump = value;
            LoopState.setImmediateJump(value);
        }

        function syncPendingJumpTargetToState(value) {
            pendingJumpTarget = value;
            LoopState.setPendingJumpTarget(value);
        }

        function syncSeekOnClickToState(value) {
            seekOnClick = value;
            LoopState.setSeekOnClick(value);
        }

        function syncLoopControlsExpandedToState(value) {
            loopControlsExpanded = value;
            LoopState.setLoopControlsExpanded(value);
        }

        function syncLoopFadesEnabledToState(value) {
            loopFadesEnabled = value;
            LoopState.setLoopFadesEnabled(value);
        }

        function syncFadeTimeToState(value) {
            fadeTime = value;
            LoopState.setFadeTime(value);
        }

        function syncPreserveLoopOnFileChangeToState(value) {
            preserveLoopOnFileChange = value;
            LoopState.setPreserveLoopOnFileChange(value);
        }

        function syncPreservedLoopStartBarToState(value) {
            preservedLoopStartBar = value;
            LoopState.setPreservedLoopStartBar(value);
        }

        function syncPreservedLoopEndBarToState(value) {
            preservedLoopEndBar = value;
            LoopState.setPreservedLoopEndBar(value);
        }

        function syncPreservedCycleModeToState(value) {
            preservedCycleMode = value;
            LoopState.setPreservedCycleMode(value);
        }

        function syncPreservedPlaybackPositionInLoopToState(value) {
            preservedPlaybackPositionInLoop = value;
            LoopState.setPreservedPlaybackPositionInLoop(value);
        }

        function syncBpmLockEnabledToState(value) {
            bpmLockEnabled = value;
            LoopState.setBpmLockEnabled(value);
        }

        function syncLockedBPMToState(value) {
            lockedBPM = value;
            LoopState.setLockedBPM(value);
        }

        // ============================================

        function syncCurrentFileIdToState(value) {
            currentFileId = value;
            PlayerState.setCurrentFileId(value);
        }

        function syncCurrentRateToState(value) {
            currentRate = value;
            PlayerState.setCurrentRate(value);
        }

        function syncIsShufflingToState(value) {
            isShuffling = value;
            PlayerState.setIsShuffling(value);
        }

        function syncUserPausedToState(value) {
            userPaused = value;
            PlayerState.setUserPaused(value);
        }

        function syncIsMutedToState(value) {
            isMuted = value;
            PlayerState.setIsMuted(value);
        }

        function syncVolumeBeforeMuteToState(value) {
            volumeBeforeMute = value;
            PlayerState.setVolumeBeforeMute(value);
        }

        function syncMarkersEnabledToState(value) {
            markersEnabled = value;
            PlayerState.setMarkersEnabled(value);
        }

        function syncMarkerFrequencyToState(value) {
            markerFrequency = value;
            PlayerState.setMarkerFrequency(value);
        }

        function syncBarStartOffsetToState(value) {
            barStartOffset = value;
            PlayerState.setBarStartOffset(value);
        }

        function syncCurrentMarkersToState(value) {
            currentMarkers = value;
            PlayerState.setCurrentMarkers(value);
        }

        function syncIsLoopingToState(value) {
            isLooping = value;
            PlayerState.setIsLooping(value);
        }

        // ============================================
        // NEW MULTI-STEM PLAYER
        // ============================================
        // Each stem has its own PlayerBarComponent with independent controls

        async function preloadMultiStemWavesurfers(fileId) {
            const result = await StemPlayerManager.preloadMultiStemWavesurfers(
                fileId,
                {
                    supabase,
                    audioFiles,
                    currentRate,
                    WaveSurfer,
                    PlayerBarComponent,
                    Utils,
                    generateStemPlayerBar
                },
                {
                    currentFileId,
                    stemPlayerWavesurfers,
                    stemPlayerComponents,
                    currentParentFileBPM,
                    wavesurfer
                },
                {
                    addStemBarMarkers,
                    setupParentStemSync
                }
            );

            stemFiles = result.stemFiles;
            syncWavesurfersToState(result.stemPlayerWavesurfers);
            syncComponentsToState(result.stemPlayerComponents);
            syncParentBPMToState(result.currentParentFileBPM);
            syncPreloadedToState(result.stemsPreloaded);
        }

        function toggleMultiStemPlayer() {
            const result = StemPlayerManager.toggleMultiStemPlayer(
                {
                    currentFileId,
                    multiStemPlayerExpanded,
                    wavesurfer,
                    stemPlayerWavesurfers
                },
                {
                }
            );

            syncExpandedToState(result.multiStemPlayerExpanded);

            if (multiStemPlayerExpanded && wavesurfer && Object.keys(stemPlayerWavesurfers).length > 0) {
                setupParentStemSync();
                console.log('✓ Parent-stem sync established after expanding stems');
            }
        }

        function generateMultiStemPlayerUI() {
            console.log('=== generateMultiStemPlayerUI (Phase 1 - Show Pre-loaded UI) ===');


            const multiStemPlayer = document.getElementById('multiStemPlayer');
            if (multiStemPlayer) {
                console.log('Multi-stem UI already exists and ready');
            }

            console.log('=== UI ready ===');
        }

        async function initializeMultiStemPlayerWavesurfers() {
            const result = await StemPlayerManager.initializeMultiStemPlayerWavesurfers(
                {
                    wavesurfer,
                    stemFiles,
                    stemPlayerWavesurfers,
                    stemPlaybackIndependent: window.stemPlaybackIndependent,
                    stemLoopStates: window.stemLoopStates,
                    multiStemReadyCount,
                    multiStemAutoPlayOnReady,
                    cycleMode,
                    loopStart,
                    loopEnd
                },
                {
                    wavesurfer,
                    WaveSurfer,
                    Utils,
                    stemFiles,
                    audioFiles,
                    currentFileId
                },
                playAllStems,
                setupParentStemSync
            );

            syncWavesurfersToState(result.stemPlayerWavesurfers);
        }

        function playAllStems() {
            StemPlayerManager.playAllStems(stemPlayerWavesurfers);
        }


        let parentStemSyncHandlers = {
            play: null,
            pause: null,
            seeking: null
        };

        function setupParentStemSync() {
            StemPlayerManager.setupParentStemSync(
                {},  // state not used by module version
                {
                    wavesurfer,
                    stemPlayerWavesurfers,
                    multiStemPlayerExpanded,
                    stemPlaybackIndependent: window.stemPlaybackIndependent,
                    stemLoopStates: window.stemLoopStates
                }
            );
        }


        function toggleMultiStemPlay(stemType) {
            stemPlayerComponents[stemType]?.playPause();
        }

        function toggleMultiStemMute(stemType) {
            stemPlayerComponents[stemType]?.toggleMute();
        }

        function toggleMultiStemLoop(stemType) {
            toggleStemCycleMode(stemType);
        }

        function setStemLoopRegion(stemType, startTime, endTime) {
            const loopState = stemLoopStates[stemType];
            loopState.start = startTime;
            loopState.end = endTime;
            console.log(`${stemType} loop region set: ${startTime}s - ${endTime}s`);

        }

        function toggleStemCycleMode(stemType) {
            const stemComponent = stemPlayerComponents[stemType];
            if (stemComponent) {
                stemComponent.toggleCycleMode();
            } else {
                console.error(`[toggleStemCycleMode] No PlayerBarComponent found for ${stemType} - this should not happen!`);
            }
        }

        function handleMultiStemVolumeChange(stemType, value) {
            stemPlayerComponents[stemType]?.setVolume(value);
        }


        function handleStemRateChange(stemType, sliderValue) {
            stemPlayerComponents[stemType]?.setRate(sliderValue);
        }

        function setStemRatePreset(stemType, presetRate) {
            stemPlayerComponents[stemType]?.setRatePreset(presetRate);
        }

        function toggleStemRateLock(stemType) {
            stemPlayerComponents[stemType]?.toggleRateLock();
        }

        function generateStems(fileId, event) {
            console.log('🎵 generateStems called with fileId:', fileId);
            event.preventDefault();
            event.stopPropagation();

            const file = audioFiles.find(f => f.id === fileId);
            console.log('📁 File found:', file?.name || 'NOT FOUND');
            if (!file) {
                console.warn('⚠️ File not found for ID:', fileId);
                return;
            }

            console.log('🔍 Checking for window.openEditTagsModal:', typeof window.openEditTagsModal);
            if (window.openEditTagsModal) {
                console.log('✅ Opening modal with stems context');
                window.openEditTagsModal('stems', fileId);
            } else {
                console.error('❌ window.openEditTagsModal is not available!');
            }
        }

        function addBarMarkers(file) {
            if (parentPlayerComponent) {
                parentPlayerComponent.addBarMarkers(file);
            }
        }

        function toggleMarkers() {
            if (parentPlayerComponent) {
                parentPlayerComponent.toggleMarkers();
            }
        }

        function setMarkerFrequency(freq) {
            if (parentPlayerComponent) {
                parentPlayerComponent.setMarkerFrequency(freq);
            }
        }

        function shiftBarStartLeft() {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartLeft();
            }
        }

        function shiftBarStartRight() {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartRight();
            }
        }



        function toggleStemMarkers(stemType) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].toggleMarkers();
            }
        }

        function setStemMarkerFrequency(stemType, freq) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].setMarkerFrequency(freq);
            }
        }

        function shiftStemBarStartLeft(stemType) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartLeft();
            }
        }

        function shiftStemBarStartRight(stemType) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartRight();
            }
        }

        function addStemBarMarkers(stemType, file) {
            const markerTimes = StemMarkerSystem.addStemBarMarkers(
                stemType,
                file,
                stemPlayerWavesurfers,
                {
                    stemMarkersEnabled: window.stemMarkersEnabled || {},
                    stemMarkerFrequency: window.stemMarkerFrequency || {},
                    stemBarStartOffset: window.stemBarStartOffset || {},
                    stemCurrentMarkers: window.stemCurrentMarkers || {}
                }
            );

            if (!window.stemCurrentMarkers) window.stemCurrentMarkers = {};
            window.stemCurrentMarkers[stemType] = markerTimes;
        }

        function findStemNearestMarkerToLeft(stemType, clickTime) {
            const stemMarkers = window.stemCurrentMarkers?.[stemType] || [];
            return StemMarkerSystem.findStemNearestMarkerToLeft(
                clickTime,
                stemMarkers
            );
        }


        function toggleCycleMode() {
            const result = LoopControls.toggleCycleMode({
                cycleMode,
                nextClickSets,
                multiStemPlayerExpanded,
                stemCycleModes: window.stemCycleModes,
                stemNextClickSets: window.stemNextClickSets,
                stemLoopStates: window.stemLoopStates
            });

            syncCycleModeToState(result.cycleMode);
            syncNextClickSetsToState(result.nextClickSets);

            updateLoopVisuals();
        }

        function toggleSeekOnClick() {
            const result = LoopControls.toggleSeekOnClick({ seekOnClick });
            syncSeekOnClickToState(result.seekOnClick);
            updateLoopVisuals();
        }

        function resetLoop() {
            const result = LoopControls.resetLoop();
            syncLoopStartToState(result.loopStart);
            syncLoopEndToState(result.loopEnd);
            syncCycleModeToState(result.cycleMode);
            syncNextClickSetsToState(result.nextClickSets);
            updateLoopVisuals();
        }

        function clearLoopKeepCycle() {
            const result = LoopControls.clearLoopKeepCycle();
            syncLoopStartToState(result.loopStart);
            syncLoopEndToState(result.loopEnd);
            syncNextClickSetsToState(result.nextClickSets);
            updateLoopVisuals();
        }

        function updateLoopVisuals() {
            LoopControls.updateLoopVisuals({
                cycleMode,
                loopStart,
                loopEnd,
                nextClickSets,
                seekOnClick,
                loopControlsExpanded,
                immediateJump,
                loopFadesEnabled,
                preserveLoopOnFileChange,
                bpmLockEnabled,
                wavesurfer
            });

            if (actionRecorder) {
                actionRecorder.updateButtonStates();
            }
        }

        function toggleLoopControlsExpanded() {
            const result = LoopControls.toggleLoopControlsExpanded({ loopControlsExpanded });
            syncLoopControlsExpandedToState(result.loopControlsExpanded);
            updateLoopVisuals();
        }

        function updateLoopRegion() {
            const waveformContainer = document.getElementById('waveform');
            if (!waveformContainer) return;

            const existingRegion = waveformContainer.querySelector('.loop-region');
            if (existingRegion) {
                existingRegion.remove();
            }
            const existingMask = waveformContainer.querySelector('.loop-progress-mask');
            if (existingMask) {
                existingMask.remove();
            }

            if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) return;

            const duration = wavesurfer.getDuration();
            if (duration === 0) return;

            const startPercent = (loopStart / duration) * 100;
            const endPercent = (loopEnd / duration) * 100;
            const widthPercent = endPercent - startPercent;

            const loopRegion = document.createElement('div');
            loopRegion.className = 'loop-region';
            loopRegion.style.left = `${startPercent}%`;
            loopRegion.style.width = `${widthPercent}%`;

            waveformContainer.appendChild(loopRegion);

            if (cycleMode && startPercent > 0) {
                const progressMask = document.createElement('div');
                progressMask.className = 'loop-progress-mask';
                progressMask.style.width = `${startPercent}%`;
                waveformContainer.appendChild(progressMask);
            }
        }

        function toggleImmediateJump() {
            const result = LoopControls.toggleImmediateJump({ immediateJump });
            syncImmediateJumpToState(result.immediateJump);
            updateLoopVisuals();
        }

        function toggleLoopFades() {
            const result = LoopControls.toggleLoopFades({ loopFadesEnabled });
            syncLoopFadesEnabledToState(result.loopFadesEnabled);
            updateLoopVisuals();
        }

        function setFadeTime(milliseconds) {
            const timeInSeconds = milliseconds / 1000;
            syncFadeTimeToState(timeInSeconds);
            console.log(`Fade time: ${milliseconds}ms`);

            const display = document.getElementById('fadeTimeValue');
            if (display) {
                display.textContent = `${milliseconds}ms`;
            }
        }

        function togglePreserveLoop() {
            const result = LoopControls.togglePreserveLoop({ preserveLoopOnFileChange });
            syncPreserveLoopOnFileChangeToState(result.preserveLoopOnFileChange);
            updateLoopVisuals();
        }

        function toggleBPMLock() {
            const result = LoopControls.toggleBPMLock({
                bpmLockEnabled,
                audioFiles,
                currentFileId
            });

            syncBpmLockEnabledToState(result.bpmLockEnabled);
            syncLockedBPMToState(result.lockedBPM);
            updateLoopVisuals();
        }

        function toggleRecordActions() {
            if (!actionRecorder) {
                console.error('[app.js] ActionRecorder not initialized');
                return;
            }
            return actionRecorder.toggleRecording();
        }

        function recordAction(actionName, data = {}) {
            if (!actionRecorder) return;
            return actionRecorder.recordAction(actionName, data);
        }

        function stopPlayback() {
            if (!actionRecorder) return;
            return actionRecorder.stopPlayback();
        }

        function playRecordedActions() {
            if (!actionRecorder) {
                console.error('[app.js] ActionRecorder not initialized');
                return;
            }
            return actionRecorder.playRecordedActions();
        }

        function getBarIndexAtTime(time, file) {
            if (!file || !file.beatmap) return null;

            const barMarkers = file.beatmap.filter(m => m.beatNum === 1);
            if (barMarkers.length === 0) return null;

            let closestBarIndex = 0;
            let closestDistance = Math.abs(barMarkers[0].time - time);

            for (let i = 1; i < barMarkers.length; i++) {
                const distance = Math.abs(barMarkers[i].time - time);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestBarIndex = i;
                }
            }

            return closestBarIndex;
        }

        function getTimeForBarIndex(barIndex, file) {
            if (!file || !file.beatmap) return null;

            const barMarkers = file.beatmap.filter(m => m.beatNum === 1);
            if (barMarkers.length === 0 || barIndex < 0 || barIndex >= barMarkers.length) return null;

            return barMarkers[barIndex].time;
        }

        function shiftLoopLeft() {
            const result = LoopControls.shiftLoopLeft({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopStartToState(result.loopStart);
                syncLoopEndToState(result.loopEnd);
                updateLoopVisuals();
            }
        }

        function shiftLoopRight() {
            const result = LoopControls.shiftLoopRight({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopStartToState(result.loopStart);
                syncLoopEndToState(result.loopEnd);
                updateLoopVisuals();
            }
        }

        function halfLoopLength() {
            const result = LoopControls.halfLoopLength({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopEndToState(result.loopEnd);
                updateLoopVisuals();
            }
        }

        function doubleLoopLength() {
            const result = LoopControls.doubleLoopLength({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopEndToState(result.loopEnd);
                updateLoopVisuals();
            }
        }

        function moveStartLeft() {
            const result = LoopControls.moveStartLeft({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopStartToState(result.loopStart);
                updateLoopVisuals();
            }
        }

        function moveEndRight() {
            const result = LoopControls.moveEndRight({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopEndToState(result.loopEnd);
                updateLoopVisuals();
            }
        }

        function moveStartRight() {
            const result = LoopControls.moveStartRight({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopStartToState(result.loopStart);
                updateLoopVisuals();
            }
        }

        function moveEndLeft() {
            const result = LoopControls.moveEndLeft({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                syncLoopEndToState(result.loopEnd);
                updateLoopVisuals();
            }
        }


        function toggleMetronome() {
            return Metronome.toggleMetronome(wavesurfer);
        }

        function setMetronomeSound(sound) {
            return Metronome.setMetronomeSound(sound);
        }

        // ============================================
        // CORE PLAYER CONTROLS
        // ============================================
        async function loadAudio(fileId, autoplay = true) {
            if (!fileLoader) {
                console.error('[app.js] FileLoader not initialized');
                return;
            }

            syncBarStartOffsetToState(0);

            const result = await fileLoader.loadFile(fileId, autoplay);
            if (!result || result.alreadyLoaded) return;

        }

        function playPause() {
            if (!wavesurfer || !currentFileId) {
                const filteredFiles = FileListRenderer.filterFiles();
                const sortedFiles = FileListRenderer.sortFiles(filteredFiles);
                if (sortedFiles.length > 0) {
                    loadAudio(sortedFiles[0].id, true); // Load and play the top file
                }
                return;
            }

            wavesurfer.playPause();
            const icon = document.getElementById('playPauseIcon');
            icon.textContent = wavesurfer.isPlaying() ? '⏸' : '▶';

            syncUserPausedToState(!wavesurfer.isPlaying());

            recordAction(wavesurfer.isPlaying() ? 'play' : 'pause', {});
        }

        function updatePlayerTime() {
            if (!wavesurfer) return;

            const current = wavesurfer.getCurrentTime();
            const duration = wavesurfer.getDuration();

            const formatTime = (seconds) => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            document.getElementById('playerTime').textContent =
                `${formatTime(current)} / ${formatTime(duration)}`;
        }

        function toggleLoop() {
            const result = LoopControls.toggleLoop({ isLooping });
            syncIsLoopingToState(result.isLooping);
        }

        function toggleShuffle() {
            if (isLooping) return;

            syncIsShufflingToState(!isShuffling);
            const btn = document.getElementById('shuffleBtn');
            btn.classList.toggle('active', isShuffling);
        }

        function setVolume(value) {
            const volume = value / 100;
            if (wavesurfer) {
                wavesurfer.setVolume(volume);
            }

            updateStemAudioState();

            let db;
            if (value === 0) {
                db = '-∞';
            } else {
                db = (20 * Math.log10(value / 100)).toFixed(1);
                db = (db >= 0 ? '+' : '') + db;
            }

            document.getElementById('volumePercent').textContent = `${value}% (${db} dB)`;
        }

        function resetVolume() {
            document.getElementById('volumeSlider').value = 100;
            setVolume(100);
        }

        function toggleMute() {
            const volumeSlider = document.getElementById('volumeSlider');
            const muteBtn = document.getElementById('muteBtn');

            if (isMuted) {
                volumeSlider.value = volumeBeforeMute;
                setVolume(volumeBeforeMute);
                syncIsMutedToState(false);
                muteBtn.textContent = '🔊';
            } else {
                syncVolumeBeforeMuteToState(parseInt(volumeSlider.value));
                volumeSlider.value = 0;
                setVolume(0);
                syncIsMutedToState(true);
                muteBtn.textContent = '🔇';
            }
        }

        function setPlaybackRate(rate) {
            syncCurrentRateToState(rate);
            window.currentRate = rate; // Expose to window for PlayerBarComponent access

            const hasStemWavesurfers = Object.keys(stemWavesurfers).length > 0;

            const hasMultiStemWavesurfers = Object.keys(stemPlayerWavesurfers).length > 0;
            const wasPlaying = wavesurfer && wavesurfer.isPlaying();

            if (hasStemWavesurfers && wasPlaying) {
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS && stemWS.isPlaying()) {
                        stemWS.pause();
                    }
                });
            }

            if (hasMultiStemWavesurfers && wasPlaying) {
                Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                    const stemWS = stemPlayerWavesurfers[stemType];
                    if (stemWS && stemWS.isPlaying()) {
                        stemWS.pause();
                    }
                });
            }

            if (wavesurfer) {
                wavesurfer.setPlaybackRate(rate, false); // false = natural analog (speed+pitch)
            }

            Object.keys(stemWavesurfers).forEach(stemType => {
                const stemWS = stemWavesurfers[stemType];
                if (stemWS) {
                    stemWS.setPlaybackRate(rate, false);
                }
            });

            Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                const stemComponent = stemPlayerComponents[stemType];
                if (stemComponent) {
                    const finalRate = stemComponent.calculateFinalRate();
                    stemPlayerWavesurfers[stemType].setPlaybackRate(finalRate, false);
                    stemComponent.updateRateDisplay(finalRate);
                    console.log(`✓ ${stemType} rate set to ${finalRate.toFixed(2)}x (${stemComponent.rateLocked ? 'locked' : `independent: ${stemComponent.independentRate.toFixed(2)}x`})`);
                }
            });

            if (hasStemWavesurfers && wasPlaying) {
                const currentProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS) {
                        stemWS.seekTo(currentProgress);
                    }
                });

                setTimeout(() => {
                    Object.keys(stemWavesurfers).forEach(stemType => {
                        const stemWS = stemWavesurfers[stemType];
                        if (stemWS && !stemWS.isPlaying()) {
                            stemWS.play();
                        }
                    });
                }, 50);
            }

            if (hasMultiStemWavesurfers && wasPlaying) {
                const currentProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
                Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                    const stemWS = stemPlayerWavesurfers[stemType];
                    if (stemWS) {
                        stemWS.seekTo(currentProgress);
                    }
                });

                setTimeout(() => {
                    Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                        const stemWS = stemPlayerWavesurfers[stemType];
                        if (stemWS && !stemWS.isPlaying()) {
                            stemWS.play();
                            console.log(`✓ ${stemType} resumed at ${rate.toFixed(2)}x`);
                        }
                    });
                }, 50);
            }

            Metronome.stopAllMetronomeSounds();
            Metronome.setLastMetronomeScheduleTime(0); // Force rescheduling

            if (Metronome.isMetronomeEnabled() && wavesurfer && wavesurfer.isPlaying()) {
                Metronome.scheduleMetronome(audioFiles, currentFileId, wavesurfer, barStartOffset, currentRate);
                Metronome.setLastMetronomeScheduleTime(Date.now());
            }

            document.getElementById('rateSlider').value = rate;
            document.getElementById('rateValue').textContent = rate.toFixed(1) + 'x';

            document.getElementById('halfRateBtn').classList.toggle('active', Math.abs(rate - 0.5) < 0.05);
            document.getElementById('normalRateBtn').classList.toggle('active', Math.abs(rate - 1) < 0.05);
            document.getElementById('doubleRateBtn').classList.toggle('active', Math.abs(rate - 2) < 0.05);

            recordAction('setRate', { rate });
        }

        function resetRate() {
            setPlaybackRate(1.0);
        }

        // ============================================
        // ADVANCED RATE MODE (Placeholder)
        // ============================================
        // Waiting for Signalsmith integration. Speed works (chipmunk effect), pitch not functional yet.

        function toggleRateMode() {
            return AdvancedRateMode.toggleRateMode();
        }

        function setSpeed(speed) {
            return AdvancedRateMode.setSpeed(speed);
        }

        function resetSpeed() {
            return AdvancedRateMode.resetSpeed();
        }

        function setPitch(semitones) {
            return AdvancedRateMode.setPitch(semitones);
        }

        function resetPitch() {
            return AdvancedRateMode.resetPitch();
        }

        function toggleSpeedPitchLock() {
            return AdvancedRateMode.toggleSpeedPitchLock();
        }


        // ============================================
        // LEGACY STEM CONTROLS (OLD System - Inline File List)
        // ============================================
        // Thin wrappers calling StemLegacyPlayer module functions

        function stemLegacyHandleVolumeChange(stemType, value) {
            return StemLegacyPlayer.handleStemVolumeChange(
                stemType,
                value,
                { stemFiles, stemVolumes, currentFileId },
                updateStemAudioState
            );
        }

        function stemLegacyHandleMute(stemType) {
            return StemLegacyPlayer.handleStemMute(
                stemType,
                { stemFiles, stemMuted, currentFileId },
                updateStemAudioState
            );
        }

        function stemLegacyHandleSolo(stemType) {
            return StemLegacyPlayer.handleStemSolo(
                stemType,
                { stemFiles, stemSoloed, currentFileId },
                updateStemAudioState
            );
        }


        function nextTrack() {
            const filteredFiles = FileListRenderer.filterFiles();
            if (filteredFiles.length === 0) return;

            let nextIndex;
            if (isShuffling) {
                nextIndex = Math.floor(Math.random() * filteredFiles.length);
            } else {
                const currentIndex = filteredFiles.findIndex(f => f.id === currentFileId);
                nextIndex = (currentIndex + 1) % filteredFiles.length;
            }

            loadAudio(filteredFiles[nextIndex].id, !userPaused); // Respect pause state
        }

        function previousTrack() {
            const filteredFiles = FileListRenderer.filterFiles();
            if (filteredFiles.length === 0) return;

            if (cycleMode && loopStart !== null && loopEnd !== null) {
                if (wavesurfer) {
                    wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                    if (!wavesurfer.isPlaying()) {
                        wavesurfer.play();
                    }
                }
                return;
            }

            if (currentFileId && wavesurfer && wavesurfer.getCurrentTime() > 1.0) {
                wavesurfer.seekTo(0);
                return;
            }

            const currentIndex = filteredFiles.findIndex(f => f.id === currentFileId);
            const prevIndex = (currentIndex - 1 + filteredFiles.length) % filteredFiles.length;

            loadAudio(filteredFiles[prevIndex].id, !userPaused); // Respect pause state
        }



        // ============================================
        // MODULE INITIALIZATION
        // ============================================

        document.addEventListener('DOMContentLoaded', () => {
            TagEditModal.initEventHandlers({
                setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
                setSearchQuery: (query) => { searchQuery = query; },
                filters,
                renderTags,
                renderFiles: FileListRenderer.render,
                getAllTags: () => TagManager.getAllTags()
            });
        });


        initKeyboardShortcuts(
            {
                playPause,
                toggleMarkers,
                toggleMetronome: Metronome.toggleMetronome,
                toggleCycleMode,
                toggleLoop,
                resetLoop,
                toggleShuffle,
                toggleImmediateJump,
                setVolume,
                previousTrack,
                nextTrack,
                loadAudio,
                batchEditTags: () => TagEditModal.open(selectedFiles, audioFiles),
                shiftLoopLeft,
                shiftLoopRight,
                halfLoopLength,
                doubleLoopLength,
                moveStartLeft,
                moveStartRight,
                moveEndLeft,
                moveEndRight,
                filterFiles: FileListRenderer.filterFiles
            },
            {
                getCurrentFileId: () => currentFileId,
                getSelectedFiles: () => selectedFiles,
                getCycleMode: () => cycleMode,
                getLoopStart: () => loopStart,
                getLoopEnd: () => loopEnd,
                getUserPaused: () => userPaused,
                getWavesurfer: () => wavesurfer,
                getRecordingWaitingForStart: () => actionRecorder ? actionRecorder.getRecordingWaiting() : false,
                setRecordingWaitingForStart: (val) => { if (actionRecorder) actionRecorder.setRecordingWaiting(val); },
                setIsRecordingActions: (val) => { if (actionRecorder) actionRecorder.setIsRecording(val); },
                setRecordingStartTime: (val) => { if (actionRecorder) actionRecorder.setRecordingStartTime(val); },
                getRecordedActions: () => actionRecorder ? actionRecorder.getRecordedActions() : [],
                getMarkersEnabled: () => markersEnabled,
                getLoopFadesEnabled: () => loopFadesEnabled,
                getImmediateJump: () => immediateJump,
                getSeekOnClick: () => seekOnClick,
                getCurrentRate: () => currentRate,
                updateLoopVisuals,
                recordAction,
                isMetronomeEnabled: Metronome.isMetronomeEnabled
            }
        );

        MiniWaveform.init({
            loadAudio,
            getWavesurfer: () => wavesurfer
        });

        TagManager.init(
            {
                renderFiles: () => FileListRenderer.render()
            },
            {
                getAudioFiles: () => audioFiles,
                getFilters: () => filters,
                getShowAllTags: () => showAllTags,
                setShowAllTags: (val) => { showAllTags = val; },
                getCurrentTagMode: () => currentTagMode,
                setCurrentTagMode: (val) => { currentTagMode = val; },
                getSearchQuery: () => searchQuery,
                setSearchQuery: (val) => { searchQuery = val; }
            }
        );

        FileListRenderer.init(
            {
                loadFile: loadAudio,
                renderMiniWaveforms: (files) => MiniWaveform.renderAll(files),
                openTagEditModal: (selectedFiles, audioFiles) => TagEditModal.open(selectedFiles, audioFiles),
                updateStemsButton
            },
            {
                getAudioFiles: () => audioFiles,
                getSearchQuery: () => searchQuery,
                getFilters: () => filters,
                getSelectedFiles: () => selectedFiles,
                getCurrentFileId: () => currentFileId,
                getProcessingFiles: () => processingFiles,
                getExpandedStems: () => expandedStems,
                getStemWavesurfers: () => stemWavesurfers
            }
        );

        BatchOperations.init(
            {
                loadData,
                clearPlayer: () => {
                    syncCurrentFileIdToState(null);
                    if (wavesurfer) {
                        wavesurfer.destroy();
                        wavesurfer = null;
                    }
                    document.getElementById('playerFilename').textContent = 'No file selected';
                    document.getElementById('playerTime').textContent = '0:00 / 0:00';
                    document.getElementById('playPauseIcon').textContent = '▶';
                }
            },
            {
                getSupabase: () => supabase,
                getAudioFiles: () => audioFiles,
                getSelectedFiles: () => selectedFiles,
                getCurrentFileId: () => currentFileId,
                getProcessingFiles: () => processingFiles
            }
        );

        UploadManager.init({
            getPendingUploadFiles: () => pendingUploadFiles,
            setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
            renderModalTags: () => TagEditModal.render()
        });

        LoopControls.init({
            recordAction,
            getAudioFiles: () => audioFiles,
            getCurrentFileId: () => currentFileId,
            setPendingJumpTarget: (target) => { syncPendingJumpTargetToState(target); }
        });

        AdvancedRateMode.init({
            setPlaybackRate
        });

        loadData();

        fileLoader = new FileLoader({
            audioFiles: () => audioFiles,
            getCurrentFileId: () => currentFileId,
            setCurrentFileId: (id) => { syncCurrentFileIdToState(id); },
            getWavesurfer: () => wavesurfer,
            setWavesurfer: (ws) => { wavesurfer = ws; },
            getParentWaveform: () => parentWaveform,
            getParentPlayerComponent: () => parentPlayerComponent,

            getLoopState: () => ({ start: loopStart, end: loopEnd, cycleMode, nextClickSets }),
            setLoopState: (state) => {
                if (state.start !== undefined) syncLoopStartToState(state.start);
                if (state.end !== undefined) syncLoopEndToState(state.end);
                if (state.cycleMode !== undefined) syncCycleModeToState(state.cycleMode);
                if (state.nextClickSets !== undefined) syncNextClickSetsToState(state.nextClickSets);
            },
            getPreserveLoopOnFileChange: () => preserveLoopOnFileChange,
            getPreservedLoopBars: () => ({
                startBar: preservedLoopStartBar,
                endBar: preservedLoopEndBar,
                cycleMode: preservedCycleMode,
                playbackPositionInLoop: preservedPlaybackPositionInLoop
            }),
            setPreservedLoopBars: (bars) => {
                if (bars.startBar !== undefined) syncPreservedLoopStartBarToState(bars.startBar);
                if (bars.endBar !== undefined) syncPreservedLoopEndBarToState(bars.endBar);
                if (bars.cycleMode !== undefined) syncPreservedCycleModeToState(bars.cycleMode);
                if (bars.playbackPositionInLoop !== undefined) syncPreservedPlaybackPositionInLoopToState(bars.playbackPositionInLoop);
            },

            resetLoop,
            updateLoopVisuals,
            getBarIndexAtTime,
            getTimeForBarIndex,
            destroyAllStems,
            preloadMultiStemWavesurfers,
            updateStemsButton,

            getBpmLockState: () => ({ enabled: bpmLockEnabled, lockedBPM }),
            setBpmLockState: (state) => {
                if (state.enabled !== undefined) syncBpmLockEnabledToState(state.enabled);
                if (state.lockedBPM !== undefined) syncLockedBPMToState(state.lockedBPM);
            },
            setPlaybackRate,

            getCurrentRate: () => currentRate,
            initWaveSurfer
        });

        actionRecorder = new ActionRecorder({
            getWavesurfer: () => wavesurfer,
            updateLoopVisuals,
            loopActions: {
                shiftLoopLeft,
                shiftLoopRight,
                moveStartRight,
                moveEndLeft,
                halfLoopLength,
                doubleLoopLength,
                setLoopStart: (data) => {
                    if (cycleMode) {
                        syncLoopStartToState(data.loopStart);
                        syncLoopEndToState(null);
                        syncNextClickSetsToState('end');
                        updateLoopVisuals();
                    }
                },
                setLoopEnd: (data) => {
                    if (cycleMode && loopStart !== null) {
                        syncLoopEndToState(data.loopEnd);
                        syncCycleModeToState(true);
                        updateLoopVisuals();
                    }
                },
                restoreLoop: (start, end) => {
                    syncLoopStartToState(start);
                    syncLoopEndToState(end);
                },
                setCycleMode: (mode) => {
                    syncCycleModeToState(mode);
                }
            },
            setPlaybackRate
        });

        console.log('[app.js] ActionRecorder service initialized');

        // Initialize view tabs with data provider for Galaxy View
        ViewManager.initViewTabs(() => {
            // Return current player state for views (e.g., Galaxy View)
            const currentFile = audioFiles.find(f => f.id === currentFileId);
            return {
                currentFile: currentFile || null,
                renderFunction: FileListRenderer.render,
                renderTagsFunction: renderTags
            };
        });

        // ============================================
        // WINDOW OBJECT EXPOSURE
        // ============================================
        // Functions exposed to window for HTML onclick handlers

window.handleTagClick = handleTagClick;
window.toggleShowAllTags = toggleShowAllTags;
window.generateStems = generateStems;

window.tagManagerHandleClick = (tag, event) => TagManager.handleClick(tag, event);
window.tagManagerToggleShowAll = () => TagManager.toggleShowAll();

window.fileListHandleFileClick = (fileId, event) => FileListRenderer.handleFileClick(fileId, event);
window.fileListHandleSort = (column) => FileListRenderer.handleSort(column);
window.fileListToggleSelection = (fileId, event) => FileListRenderer.toggleFileSelection(fileId, event);
window.fileListQuickEdit = (fileId, event) => FileListRenderer.quickEditFile(fileId, event);
window.fileListOpenStemsViewer = (fileId, event) => FileListRenderer.openStemsViewer(fileId, event);
window.addModalTag = (tag) => TagEditModal.addTag(tag);
window.renderModalTags = () => TagEditModal.render();
window.selectModalTag = (tag) => TagEditModal.selectTag(tag);
window.removeSelectedModalTag = () => TagEditModal.removeSelectedTag();
window.setTagMode = setTagMode;
window.handleSearch = handleSearch;
window.handleSearchKeydown = handleSearchKeydown;
window.selectAllVisibleTags = selectAllVisibleTags;
window.deselectAllTags = deselectAllTags;
window.openUploadFlow = () => UploadManager.openUploadFlow();
window.selectAll = () => FileListRenderer.selectAll();
window.deselectAll = () => FileListRenderer.deselectAll();
window.batchDelete = () => BatchOperations.batchDelete();
window.batchEditTags = () => TagEditModal.open(selectedFiles, audioFiles);
window.closeEditTagsModal = () => TagEditModal.close({
    setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
    setSearchQuery: (query) => { searchQuery = query; },
    filters,
    renderTags,
    renderFiles: FileListRenderer.render
});
window.saveEditedTags = () => TagEditModal.save(
    {
        performUpload: (files, tags) => FileProcessor.performUpload(files, tags, {
            supabase,
            loadData,
            closeModal: TagEditModal.close,
            setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
            setSearchQuery: (query) => { searchQuery = query; },
            filters,
            renderTags,
            renderFiles: FileListRenderer.render
        }),
        runSelectedProcessing: BatchOperations.runSelectedProcessing,
        loadData,
        renderTags,
        renderFiles: FileListRenderer.render
    },
    {
        selectedFiles,
        audioFiles,
        pendingUploadFiles,
        setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
        clearSelectedFiles: () => { selectedFiles.clear(); },
        setSearchQuery: (query) => { searchQuery = query; },
        filters,
        supabase
    }
);
window.previousTrack = previousTrack;
window.playPause = playPause;
window.nextTrack = nextTrack;
window.toggleLoop = toggleLoop;
window.toggleShuffle = toggleShuffle;
window.setVolume = setVolume;
window.toggleMute = toggleMute;
window.resetVolume = resetVolume;
window.setPlaybackRate = setPlaybackRate;
window.resetRate = resetRate;
window.toggleRateMode = toggleRateMode;
window.setSpeed = setSpeed;
window.resetSpeed = resetSpeed;
window.setPitch = setPitch;
window.resetPitch = resetPitch;
window.toggleSpeedPitchLock = toggleSpeedPitchLock;
        const _oldToggleMarkers = toggleMarkers;
        const _oldSetMarkerFrequency = setMarkerFrequency;
        const _oldShiftBarStartLeft = shiftBarStartLeft;
        const _oldShiftBarStartRight = shiftBarStartRight;

        window.updateCurrentMarkers = (markers) => {
            syncCurrentMarkersToState(markers);
            console.log(`[Global] currentMarkers updated, length: ${markers.length}`);
        };
        window.updateMarkersEnabled = (enabled) => {
            syncMarkersEnabledToState(enabled);
            console.log(`[Global] markersEnabled updated: ${enabled}`);
        };

        Object.defineProperty(window, 'cycleMode', {
            get: () => cycleMode,
            set: (value) => { cycleMode = value; },
            configurable: true
        });
        Object.defineProperty(window, 'loopStart', {
            get: () => loopStart,
            set: (value) => { loopStart = value; },
            configurable: true
        });
        Object.defineProperty(window, 'loopEnd', {
            get: () => loopEnd,
            set: (value) => { loopEnd = value; },
            configurable: true
        });
        Object.defineProperty(window, 'nextClickSets', {
            get: () => nextClickSets,
            set: (value) => { nextClickSets = value; },
            configurable: true
        });
        Object.defineProperty(window, 'seekOnClick', {
            get: () => seekOnClick,
            set: (value) => { seekOnClick = value; },
            configurable: true
        });

        window.updateLoopVisuals = updateLoopVisuals;
        window.recordAction = recordAction;

        window.updatePlayerTime = updatePlayerTime;
        window.setupParentStemSync = setupParentStemSync;

        Object.defineProperty(window, 'isLooping', {
            get: () => isLooping,
            set: (value) => { syncIsLoopingToState(value); },
            configurable: true
        });
        Object.defineProperty(window, 'pendingJumpTarget', {
            get: () => pendingJumpTarget,
            set: (value) => { syncPendingJumpTargetToState(value); },
            configurable: true
        });
        Object.defineProperty(window, 'markersEnabled', {
            get: () => markersEnabled,
            set: (value) => { syncMarkersEnabledToState(value); },
            configurable: true
        });
        Object.defineProperty(window, 'currentFileId', {
            get: () => currentFileId,
            set: (value) => { syncCurrentFileIdToState(value); },
            configurable: true
        });
        Object.defineProperty(window, 'audioFiles', {
            get: () => audioFiles,
            set: (value) => { audioFiles = value; },
            configurable: true
        });
        Object.defineProperty(window, 'barStartOffset', {
            get: () => barStartOffset,
            set: (value) => { syncBarStartOffsetToState(value); },
            configurable: true
        });
        Object.defineProperty(window, 'loopFadesEnabled', {
            get: () => loopFadesEnabled,
            set: (value) => { loopFadesEnabled = value; },
            configurable: true
        });
        Object.defineProperty(window, 'fadeTime', {
            get: () => fadeTime,
            set: (value) => { fadeTime = value; },
            configurable: true
        });
        Object.defineProperty(window, 'stemPlayerWavesurfers', {
            get: () => stemPlayerWavesurfers,
            set: (value) => { syncWavesurfersToState(value); },
            configurable: true
        });
        window.toggleMarkers = () => {
            if (parentPlayerComponent) {
                parentPlayerComponent.toggleMarkers();
            } else {
                _oldToggleMarkers(); // Fallback to old function
            }
        };
        window.setMarkerFrequency = (freq) => {
            if (parentPlayerComponent) {
                parentPlayerComponent.setMarkerFrequency(freq);
            } else {
                _oldSetMarkerFrequency(freq); // Fallback
            }
        };
        window.shiftBarStartLeft = () => {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartLeft();
            } else {
                _oldShiftBarStartLeft(); // Fallback
            }
        };
        window.shiftBarStartRight = () => {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartRight();
            } else {
                _oldShiftBarStartRight(); // Fallback
            }
        };
window.toggleMetronome = toggleMetronome;
window.setMetronomeSound = setMetronomeSound;
window.toggleCycleMode = toggleCycleMode;
window.toggleSeekOnClick = toggleSeekOnClick;
window.clearLoopKeepCycle = clearLoopKeepCycle;
window.toggleLoopControlsExpanded = toggleLoopControlsExpanded;
window.shiftLoopLeft = shiftLoopLeft;
window.shiftLoopRight = shiftLoopRight;
window.moveStartLeft = moveStartLeft;
window.moveEndRight = moveEndRight;
window.halfLoopLength = halfLoopLength;
window.doubleLoopLength = doubleLoopLength;
window.toggleImmediateJump = toggleImmediateJump;
window.toggleLoopFades = toggleLoopFades;
window.setFadeTime = setFadeTime;
window.togglePreserveLoop = togglePreserveLoop;
window.toggleBPMLock = toggleBPMLock;
window.toggleRecordActions = toggleRecordActions;
window.playRecordedActions = playRecordedActions;
window.stemLegacyHandleVolumeChange = stemLegacyHandleVolumeChange;
window.stemLegacyHandleMute = stemLegacyHandleMute;
window.stemLegacyHandleSolo = stemLegacyHandleSolo;
window.toggleStemsViewer = () => FileListRenderer.toggleStemsViewer();
window.toggleMultiStemPlayer = toggleMultiStemPlayer;
window.toggleMultiStemPlay = toggleMultiStemPlay;
window.toggleMultiStemMute = toggleMultiStemMute;
window.toggleMultiStemLoop = toggleMultiStemLoop;
window.handleMultiStemVolumeChange = handleMultiStemVolumeChange;
window.handleStemRateChange = handleStemRateChange;
window.setStemRatePreset = setStemRatePreset;
window.toggleStemRateLock = toggleStemRateLock;
window.setStemLoopRegion = setStemLoopRegion;


window.toggleStemMarkers = toggleStemMarkers;
window.setStemMarkerFrequency = setStemMarkerFrequency;
window.shiftStemBarStartLeft = shiftStemBarStartLeft;
window.shiftStemBarStartRight = shiftStemBarStartRight;

window.toggleStemCycleMode = toggleStemCycleMode;

