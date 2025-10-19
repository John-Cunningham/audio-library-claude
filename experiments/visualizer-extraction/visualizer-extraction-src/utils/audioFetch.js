/**
 * Audio Fetch Utility
 *
 * Provides robust audio file fetching with retry logic to handle
 * network issues like ERR_QUIC_PROTOCOL_ERROR from Supabase storage.
 *
 * Usage:
 *   import { fetchAudioWithRetry } from '../utils/audioFetch.js';
 *   const blob = await fetchAudioWithRetry(url);
 */

/**
 * Fetch audio file with retry logic for handling QUIC protocol errors
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {string} context - Context for logging (e.g., 'MiniWaveform', 'FileLoader')
 * @returns {Promise<Blob>} Audio blob
 */
export async function fetchAudioWithRetry(url, maxRetries = 3, context = 'AudioFetch') {
    let lastError = null;
    const filename = url.split('/').pop();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Only log for main player, not mini waveforms (reduce spam)
            if (context !== 'MiniWaveform' || attempt > 1) {
                console.log(`[${context}] 📡 Fetch attempt ${attempt}/${maxRetries} for ${filename}`);
            }

            // Try fetch with cache bypass on retries
            // CRITICAL: 5 second timeout (not 30!) to prevent blocking
            const response = await fetch(url, {
                mode: 'cors',
                cache: attempt > 1 ? 'reload' : 'default',
                credentials: 'omit',
                signal: AbortSignal.timeout(5000) // 5 seconds, not 30!
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();

            // Only log success for main player, not mini waveforms
            if (context !== 'MiniWaveform') {
                console.log(`[${context}] ✅ Successfully fetched ${filename} (attempt ${attempt})`);
            }
            return blob;

        } catch (error) {
            lastError = error;

            // Only log errors for main player or on final attempt
            if (context !== 'MiniWaveform' || attempt === maxRetries) {
                if (error.name === 'AbortError') {
                    console.warn(`[${context}] ⏱️ Fetch timeout on attempt ${attempt}`);
                } else if (error.message.includes('QUIC')) {
                    console.warn(`[${context}] 🔌 QUIC protocol error on attempt ${attempt}`);
                } else {
                    console.warn(`[${context}] ⚠️ Fetch attempt ${attempt} failed:`, error.message);
                }
            }

            // Wait before retry - SHORTER delays to prevent blocking
            if (attempt < maxRetries) {
                // Mini waveforms: very fast retry (200ms, 400ms)
                // Main player: normal retry (500ms, 1000ms)
                const baseDelay = context === 'MiniWaveform' ? 200 : 500;
                const delay = baseDelay * attempt;

                if (context !== 'MiniWaveform') {
                    console.log(`[${context}] 🔄 Retrying in ${delay}ms...`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    const errorMsg = `Failed to fetch ${filename} after ${maxRetries} attempts: ${lastError.message}`;
    console.error(`[${context}] ❌ ${errorMsg}`);

    // Provide helpful error message if it's a QUIC error
    if (lastError.message.includes('QUIC') || lastError.message.includes('ERR_')) {
        console.error(`[${context}] 💡 This appears to be a browser HTTP/3 QUIC protocol issue.`);
        console.error(`[${context}] 💡 Try disabling QUIC: chrome://flags/#enable-quic → Set to DISABLED → Restart Chrome`);
    }

    throw new Error(errorMsg);
}

/**
 * Load audio file into WaveSurfer with retry logic
 * @param {Object} wavesurfer - WaveSurfer instance
 * @param {string} url - Audio file URL
 * @param {string} context - Context for logging
 * @returns {Promise<void>}
 */
export async function loadAudioIntoWaveSurfer(wavesurfer, url, context = 'AudioFetch') {
    try {
        // Fetch audio with retry logic
        const blob = await fetchAudioWithRetry(url, 3, context);

        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);

        // Load into WaveSurfer
        await wavesurfer.load(blobUrl);

        console.log(`[${context}] ✅ Audio loaded into WaveSurfer successfully`);

    } catch (error) {
        console.error(`[${context}] ❌ Failed to load audio into WaveSurfer:`, error);

        // Last resort: try direct URL load (might work if issue was transient)
        console.log(`[${context}] 🔄 Attempting direct URL load as fallback...`);
        try {
            await wavesurfer.load(url);
            console.log(`[${context}] ✅ Fallback direct load succeeded`);
        } catch (fallbackError) {
            console.error(`[${context}] ❌ Fallback load also failed:`, fallbackError);
            throw error; // Throw original error
        }
    }
}
