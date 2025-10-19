// === AUDIO ANALYZER MODULE ===

// AUDIO CHAIN (WaveSurfer v7):
// MediaElement → GainNode → Analyser → AudioContext.destination
//                            ↑
//                    Insert here (don't break chain!)

// REQUIRED GLOBAL VARIABLES:
let audioContext = null;           // Web Audio API context
let analyser = null;               // AnalyserNode for frequency analysis
let audioDataArray = null;         // Uint8Array for frequency data
let currentAudioAmplitude = 0;     // Overall amplitude (0-5 range)
let bassAmplitude = 0;             // Bass frequencies (20-250 Hz)
let midsAmplitude = 0;             // Mid frequencies (250-2000 Hz)
let highsAmplitude = 0;            // High frequencies (2000+ Hz)
let audioFrequencyMode = 'all';    // 'all', 'bass', 'mids', 'highs'

// Debug logging flag
const AUDIO_DEBUG = true;

/**
 * Sets up audio analyzer connected to WaveSurfer instance
 * IMPORTANT: Call this after loading a file, or when wavesurfer recreates
 *
 * This function taps into WaveSurfer's internal audio chain without breaking playback.
 * It inserts an AnalyserNode between the gain node and destination.
 *
 * @param {WaveSurfer} wavesurferInstance - Existing WaveSurfer instance (v7)
 * @returns {boolean} True if successful, false if failed
 */
function setupAudioAnalysis(wavesurferInstance) {
    if (!wavesurferInstance) {
        console.error('❌ Audio Analysis: No WaveSurfer instance provided');
        return false;
    }

    try {
        // WaveSurfer v7 WebAudio backend - we need to access internal nodes
        // Give WaveSurfer a moment to initialize its audio chain
        setTimeout(() => {
            // Get the media element from WaveSurfer v7
            const mediaElement = wavesurferInstance.getMediaElement();

            if (!mediaElement) {
                console.error('❌ Audio Analysis: No media element found');
                return false;
            }

            if (AUDIO_DEBUG) {
                console.log('📊 Audio Analysis: Media element found:', mediaElement);
            }

            // For WaveSurfer v7 with WebAudio backend
            // The audio chain is: MediaElementSource → GainNode → Destination
            // We need to access the audio context and gain node

            // Try to get audio context from the media element
            if (!mediaElement.audioContext) {
                console.error('❌ Audio Analysis: No audioContext on media element');

                // Try alternative approach - check if WaveSurfer has backend
                if (wavesurferInstance.backend && wavesurferInstance.backend.ac) {
                    audioContext = wavesurferInstance.backend.ac;
                    console.log('✓ Audio Analysis: Got context from backend');
                } else {
                    console.error('❌ Audio Analysis: Could not find audio context');
                    return false;
                }
            } else {
                audioContext = mediaElement.audioContext;
            }

            // Get the gain node
            const gainNode = mediaElement.gainNode;

            if (!audioContext || !gainNode) {
                console.error('❌ Audio Analysis: Missing audioContext or gainNode');
                return false;
            }

            if (AUDIO_DEBUG) {
                console.log('📊 Audio Analysis: Audio context state:', audioContext.state);
                console.log('📊 Audio Analysis: Sample rate:', audioContext.sampleRate);
            }

            // Clean up any existing analyser
            if (analyser) {
                try {
                    analyser.disconnect();
                    analyser = null;
                } catch (e) {
                    // Ignore disconnect errors
                }
            }

            // Create new analyser node
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;                     // 256 bins for frequency data
            analyser.smoothingTimeConstant = 0.8;       // Smoothing (0-1)
            analyser.minDecibels = -90;                 // Minimum power value
            analyser.maxDecibels = -10;                 // Maximum power value

            // Insert analyser into the audio chain
            // IMPORTANT: We must preserve the original chain to not break playback
            try {
                // Disconnect gain from destination
                gainNode.disconnect();

                // Reconnect through analyser
                gainNode.connect(analyser);
                analyser.connect(audioContext.destination);

                if (AUDIO_DEBUG) {
                    console.log('✅ Audio Analysis: Analyser connected to audio chain');
                }
            } catch (error) {
                console.error('❌ Audio Analysis: Failed to insert analyser:', error);

                // Try to restore original connection if we failed
                try {
                    gainNode.connect(audioContext.destination);
                } catch (e) {
                    console.error('❌ Audio Analysis: Failed to restore connection');
                }
                return false;
            }

            // Prepare data array for frequency data
            const bufferLength = analyser.frequencyBinCount;
            audioDataArray = new Uint8Array(bufferLength);

            if (AUDIO_DEBUG) {
                console.log('✅ Audio Analysis setup complete:', {
                    fftSize: analyser.fftSize,
                    frequencyBinCount: bufferLength,
                    sampleRate: audioContext.sampleRate,
                    nyquist: audioContext.sampleRate / 2,
                    binWidth: (audioContext.sampleRate / 2) / bufferLength,
                    contextState: audioContext.state
                });
            }

            // Resume context if suspended (common on mobile/autoplay restrictions)
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('✅ Audio Analysis: Audio context resumed');
                }).catch(err => {
                    console.warn('⚠️ Audio Analysis: Could not resume context:', err);
                });
            }

            return true;

        }, 100); // Small delay to ensure WaveSurfer is ready

    } catch (error) {
        console.error('❌ Audio Analysis setup error:', error);
        return false;
    }
}

/**
 * Alternative setup method for cases where media element is not accessible
 * This tries to hook into WaveSurfer's backend directly
 *
 * @param {WaveSurfer} wavesurferInstance - WaveSurfer instance
 * @returns {boolean} Success status
 */
function setupAudioAnalysisAlternative(wavesurferInstance) {
    if (!wavesurferInstance) return false;

    try {
        // For WaveSurfer with WebAudio backend
        const backend = wavesurferInstance.backend;

        if (!backend || !backend.ac) {
            console.error('❌ Audio Analysis Alt: No backend or audio context');
            return false;
        }

        audioContext = backend.ac;

        // Try to find the gain node in the backend
        let gainNode = null;

        // Check various possible locations
        if (backend.gainNode) {
            gainNode = backend.gainNode;
        } else if (backend.analyser) {
            // Sometimes WaveSurfer already has an analyser
            analyser = backend.analyser;
            audioDataArray = new Uint8Array(analyser.frequencyBinCount);
            console.log('✅ Audio Analysis Alt: Using existing analyser');
            return true;
        }

        if (!gainNode) {
            console.error('❌ Audio Analysis Alt: Could not find gain node');
            return false;
        }

        // Create analyser
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        // Try to insert into chain
        gainNode.disconnect();
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);

        audioDataArray = new Uint8Array(analyser.frequencyBinCount);

        console.log('✅ Audio Analysis Alt: Setup successful');
        return true;

    } catch (error) {
        console.error('❌ Audio Analysis Alt error:', error);
        return false;
    }
}

/**
 * Updates audio amplitude values from analyzer
 * Call this every frame in your animation loop
 *
 * Calculates separate amplitudes for bass, mids, and highs,
 * as well as an overall amplitude based on the selected frequency mode.
 */
function updateAudioAmplitude() {
    if (!analyser || !audioDataArray) {
        // No analyser available, set all to 0
        currentAudioAmplitude = 0;
        bassAmplitude = 0;
        midsAmplitude = 0;
        highsAmplitude = 0;
        return;
    }

    // Get frequency data (0-255 for each frequency bin)
    analyser.getByteFrequencyData(audioDataArray);

    // Calculate frequency ranges based on sample rate
    const bufferLength = analyser.frequencyBinCount;
    const sampleRate = audioContext.sampleRate;
    const nyquist = sampleRate / 2; // Maximum frequency we can represent

    // Calculate bin indices for frequency bands
    // Each bin represents nyquist/bufferLength Hz
    const binWidth = nyquist / bufferLength;

    // Frequency band boundaries
    const bassEnd = Math.floor(250 / binWidth);    // Bass: 0-250 Hz
    const midsEnd = Math.floor(2000 / binWidth);   // Mids: 250-2000 Hz
    // Highs: 2000+ Hz (rest of the bins)

    // Calculate amplitudes for each frequency band
    let bassSum = 0, midsSum = 0, highsSum = 0;
    let bassCount = 0, midsCount = 0, highsCount = 0;

    // Bass: 20-250 Hz (skip first bin as it's often DC offset)
    for (let i = 1; i < bassEnd && i < bufferLength; i++) {
        bassSum += audioDataArray[i];
        bassCount++;
    }

    // Mids: 250-2000 Hz
    for (let i = bassEnd; i < midsEnd && i < bufferLength; i++) {
        midsSum += audioDataArray[i];
        midsCount++;
    }

    // Highs: 2000+ Hz
    for (let i = midsEnd; i < bufferLength; i++) {
        highsSum += audioDataArray[i];
        highsCount++;
    }

    // Calculate averages (0-255 range)
    const bassAvg = bassCount > 0 ? bassSum / bassCount : 0;
    const midsAvg = midsCount > 0 ? midsSum / midsCount : 0;
    const highsAvg = highsCount > 0 ? highsSum / highsCount : 0;

    // Normalize to 0-1 range and apply amplification
    // Different bands need different amplification for visual impact
    bassAmplitude = Math.min((bassAvg / 128) * 3, 5);    // Bass is often stronger, less amplification
    midsAmplitude = Math.min((midsAvg / 128) * 3, 5);    // Mids moderate amplification
    highsAmplitude = Math.min((highsAvg / 128) * 3, 5);   // Highs often weaker, more amplification

    // Set overall amplitude based on selected frequency mode
    switch (audioFrequencyMode) {
        case 'bass':
            currentAudioAmplitude = bassAmplitude;
            break;
        case 'mids':
            currentAudioAmplitude = midsAmplitude;
            break;
        case 'highs':
            currentAudioAmplitude = highsAmplitude;
            break;
        case 'all':
        default:
            // Weighted average - bass has more visual impact
            currentAudioAmplitude = (bassAmplitude * 0.5 + midsAmplitude * 0.3 + highsAmplitude * 0.2);
            break;
    }

    // Optional debug logging (disable in production)
    if (AUDIO_DEBUG && Math.random() < 0.01) { // Log occasionally
        console.log('🎵 Audio levels:', {
            bass: bassAmplitude.toFixed(2),
            mids: midsAmplitude.toFixed(2),
            highs: highsAmplitude.toFixed(2),
            overall: currentAudioAmplitude.toFixed(2)
        });
    }
}

/**
 * Sets the frequency mode for audio reactivity
 * @param {string} mode - 'all', 'bass', 'mids', or 'highs'
 */
function setAudioFrequencyMode(mode) {
    if (['all', 'bass', 'mids', 'highs'].includes(mode)) {
        audioFrequencyMode = mode;
        console.log(`🎵 Audio frequency mode set to: ${mode}`);
    }
}

/**
 * Gets current audio analysis data for visualization
 * @returns {Object} Current audio amplitudes
 */
function getAudioData() {
    return {
        overall: currentAudioAmplitude,
        bass: bassAmplitude,
        mids: midsAmplitude,
        highs: highsAmplitude,
        raw: audioDataArray ? Array.from(audioDataArray) : []
    };
}

/**
 * Cleans up audio analyzer when switching files or destroying view
 */
function cleanupAudioAnalysis() {
    if (analyser) {
        try {
            analyser.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
        analyser = null;
    }

    audioDataArray = null;
    currentAudioAmplitude = 0;
    bassAmplitude = 0;
    midsAmplitude = 0;
    highsAmplitude = 0;

    console.log('🧹 Audio analysis cleaned up');
}

/**
 * Reconnects analyzer after file change
 * Call this when loading a new file in the same WaveSurfer instance
 * @param {WaveSurfer} wavesurferInstance - WaveSurfer instance
 */
function reconnectAudioAnalysis(wavesurferInstance) {
    cleanupAudioAnalysis();
    setupAudioAnalysis(wavesurferInstance);
}

// === USAGE EXAMPLE ===
/*
// In your main application:

// 1. After loading a file in WaveSurfer:
wavesurfer.once('ready', () => {
    setupAudioAnalysis(wavesurfer);
});

// 2. In your animation loop:
function animate() {
    updateAudioAmplitude();

    // Use the amplitude values for visualization
    particles.forEach(particle => {
        // Scale based on audio
        const scale = 1.0 + currentAudioAmplitude * 0.1;
        particle.scale.set(scale, scale, scale);
    });

    requestAnimationFrame(animate);
}

// 3. When changing files:
wavesurfer.on('ready', () => {
    reconnectAudioAnalysis(wavesurfer);
});

// 4. When destroying the view:
function destroy() {
    cleanupAudioAnalysis();
}
*/

// === DEBUGGING TIPS ===
/*
1. If no audio reactivity:
   - Check console for error messages
   - Verify audioContext.state is 'running' not 'suspended'
   - Ensure setupAudioAnalysis() is called AFTER file loads
   - Try user interaction (click/tap) to resume context

2. If playback breaks after setup:
   - Check that gain node reconnection succeeded
   - Verify original audio chain is preserved
   - Try setupAudioAnalysisAlternative() method

3. To verify it's working:
   - Set AUDIO_DEBUG = true
   - Check console for amplitude values
   - audioDataArray should have non-zero values during playback

4. Common issues:
   - Mobile browsers: Audio context suspended until user interaction
   - CORS: Some audio sources may not allow analysis
   - Timing: Setup too early before WaveSurfer ready
*/