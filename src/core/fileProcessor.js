/**
 * File Processor Module
 *
 * Handles file upload, metadata extraction, and audio file processing.
 * Includes tag extraction from filenames, audio duration detection,
 * and Supabase storage integration.
 *
 * Usage:
 *   import * as FileProcessor from './fileProcessor.js';
 *
 *   const metadata = FileProcessor.extractTagsFromFilename('kick_120_Cmaj.wav');
 *   const duration = await FileProcessor.getAudioDuration(file);
 *   await FileProcessor.performUpload(files, tags, callbacks);
 */

// ===================================================================
// METADATA EXTRACTION
// ===================================================================

/**
 * Extract tags, BPM, and key from filename
 * Parses common patterns like:
 *   - kick_120_Cmaj.wav → tags: ['kick', '120bpm', 'Cmaj'], bpm: 120, key: 'Cmaj'
 *   - bass_Gmin_85.mp3 → tags: ['bass', 'Gmin', '85bpm'], bpm: 85, key: 'Gmin'
 *
 * @param {string} filename - Audio filename to parse
 * @returns {{tags: string[], bpm: number|null, key: string|null}}
 */
export function extractTagsFromFilename(filename) {
    const tags = [];
    let bpm = null;
    let key = null;
    const nameWithoutExt = filename.replace(/\.(wav|mp3|aiff|flac|m4a|ogg)$/i, '');

    // Extract instrument/name from beginning (first word/segment)
    const nameMatch = nameWithoutExt.match(/^([A-Za-z]+)/);
    if (nameMatch) {
        tags.push(nameMatch[1].toLowerCase());
    }

    // Extract BPM (2-3 digit numbers, allow underscores/spaces around them)
    const bpmMatches = nameWithoutExt.match(/(?:^|[_\s])(\d{2,3})(?:[_\s]|$)/g);
    if (bpmMatches) {
        // Extract just the number from the first match
        const bpmNumber = bpmMatches[0].match(/\d{2,3}/)[0];
        bpm = parseInt(bpmNumber);
        tags.push(`${bpmNumber}bpm`);
    }

    // Extract musical key - must be at word boundaries or surrounded by underscores/spaces
    // Patterns: Gm, Db, C#, Abmaj, F#min, Dmaj, Fm, etc.
    const keyPatterns = [
        /(?:^|[_\s])([A-G][b#]?)(maj|min|major|minor)(?:[_\s\.]|$)/i,  // Cmaj, Gmin, Dbmaj, Fmin, etc.
        /(?:^|[_\s])([A-G][b#]?)m(?![a-z])/i,                           // Gm, C#m, Fm (minor)
        /(?:^|[_\s])([A-G][b#]?)(?=[_\s\.]|$)/                          // C, Db (standalone, default to major)
    ];

    for (let pattern of keyPatterns) {
        const match = nameWithoutExt.match(pattern);
        if (match) {
            let note = match[1];
            let quality = match[2];

            // Normalize note (capitalize first letter, preserve b or #)
            note = note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();

            // Determine if major or minor
            if (quality && (quality.toLowerCase() === 'min' || quality.toLowerCase() === 'minor')) {
                key = `${note}min`;
                tags.push(`${note}min`);
            } else if (quality && (quality.toLowerCase() === 'maj' || quality.toLowerCase() === 'major')) {
                key = `${note}maj`;
                tags.push(`${note}maj`);
            } else if (pattern.source.includes('m(?!')) {
                // Pattern matched "Gm" style
                key = `${note}min`;
                tags.push(`${note}min`);
            } else {
                // Default to major
                key = `${note}maj`;
                tags.push(`${note}maj`);
            }
            break; // Only match first key found
        }
    }

    return { tags, bpm, key };
}

/**
 * Get audio file duration using Web Audio API
 * @param {File} file - Audio file to analyze
 * @returns {Promise<number|null>} Duration in seconds, or null on error
 */
export function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
            URL.revokeObjectURL(audio.src);
        });
        audio.addEventListener('error', () => {
            resolve(null);
            URL.revokeObjectURL(audio.src);
        });
        audio.src = URL.createObjectURL(file);
    });
}

/**
 * Sanitize filename for Supabase Storage
 * Removes/replaces characters that aren't allowed in storage keys
 *
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename safe for Supabase Storage
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[[\](){}]/g, '')      // Remove brackets and parentheses
        .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace other special chars with underscores
}

// ===================================================================
// FILE UPLOAD
// ===================================================================

/**
 * Upload files to Supabase with optional MP3 conversion
 * Used by the tag edit modal for new file uploads
 *
 * @param {File[]} files - Array of files to upload
 * @param {string[]} sharedTags - Tags to apply to all files
 * @param {Object} callbacks - Callback functions
 * @param {Object} callbacks.supabase - Supabase client
 * @param {Function} callbacks.loadData - Reload data after upload
 * @param {Function} callbacks.closeModal - Close upload modal
 * @param {Function} callbacks.setPendingUploadFiles - Clear pending uploads
 * @param {Function} callbacks.setSearchQuery - Clear search query
 * @param {Object} callbacks.filters - Filter state
 * @param {Function} callbacks.renderTags - Re-render tags
 * @param {Function} callbacks.renderFiles - Re-render files
 */
export async function performUpload(files, sharedTags, callbacks) {
    const {
        supabase,
        loadData,
        closeModal,
        setPendingUploadFiles,
        setSearchQuery,
        filters,
        renderTags,
        renderFiles
    } = callbacks;

    const progressBar = document.getElementById('uploadProgressBar');
    const modalFileCount = document.getElementById('modalFileCount');

    if (!progressBar || !modalFileCount) {
        console.error('[FileProcessor] Upload progress elements not found');
        return;
    }

    // Check if conversion to MP3 is requested
    const convertCheckbox = document.getElementById('processConvertMp3');
    const shouldConvertMp3 = convertCheckbox ? convertCheckbox.checked : false;

    try {
        // Show progress bar
        progressBar.style.display = 'block';
        progressBar.style.width = '0%';

        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let originalFileName = file.name;

            // Update modal status - Analyzing
            modalFileCount.textContent = `Analyzing ${i + 1}/${files.length}: ${file.name}`;

            // Convert to MP3 if requested
            if (shouldConvertMp3) {
                modalFileCount.textContent = `Converting to MP3 ${i + 1}/${files.length}: ${file.name}`;

                const formData = new FormData();
                formData.append('file', file);

                const convertResponse = await fetch('https://web-production-bcf6c.up.railway.app/convert-for-upload', {
                    method: 'POST',
                    body: formData
                });

                if (!convertResponse.ok) {
                    throw new Error(`MP3 conversion failed: ${convertResponse.statusText}`);
                }

                const mp3Blob = await convertResponse.blob();
                const newFileName = convertResponse.headers.get('X-Converted-Filename') || file.name.replace(/\.(wav|aiff|flac|m4a|ogg)$/i, '.mp3');

                // Create new File object with MP3 data
                file = new File([mp3Blob], newFileName, { type: 'audio/mpeg' });
                console.log(`✓ Converted ${originalFileName} → ${newFileName}`);
            }

            // Auto-extract tags from filename
            const extracted = extractTagsFromFilename(file.name);

            // Combine auto-tags + shared tags (remove duplicates)
            const allTags = [...new Set([...extracted.tags, ...sharedTags])];

            // Get audio length
            const length = await getAudioDuration(file);

            // Update modal status - Uploading
            modalFileCount.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;

            // Upload file to Supabase Storage (sanitize filename for valid storage key)
            const sanitizedName = sanitizeFilename(file.name);
            const fileName = `${Date.now()}-${i}-${sanitizedName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('audio-files')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('audio-files')
                .getPublicUrl(fileName);

            // Save metadata to database
            const { data: dbData, error: dbError } = await supabase
                .from('audio_files')
                .insert([{
                    name: file.name,
                    file_url: urlData.publicUrl,
                    tags: allTags,
                    bpm: extracted.bpm,
                    key: extracted.key,
                    length: length
                }])
                .select();

            if (dbError) throw dbError;
            successCount++;

            // Update progress bar
            const progress = ((i + 1) / files.length) * 100;
            progressBar.style.width = progress + '%';
        }

        // Complete
        progressBar.style.width = '100%';
        modalFileCount.textContent = `✅ Successfully uploaded ${successCount} file(s)!`;

        // Reload data
        await loadData();

        // Hide progress bar and close modal after a moment
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressBar.style.width = '0%';
            closeModal({
                setPendingUploadFiles,
                setSearchQuery,
                filters,
                renderTags,
                renderFiles
            });
        }, 1500);

    } catch (error) {
        console.error('[FileProcessor] Error uploading files:', error);
        modalFileCount.textContent = '❌ Error uploading files';
        progressBar.style.display = 'none';
        progressBar.style.width = '0%';

        setTimeout(() => {
            alert('Error uploading files. Check console for details.');
        }, 100);
    }
}

/**
 * Legacy upload function (OLD - kept for backwards compatibility)
 * This is the original upload method before modal-based uploads
 * Consider removing if no longer used
 *
 * @param {Object} callbacks - Callback functions
 */
export async function uploadAudio(callbacks) {
    const {
        supabase,
        loadData
    } = callbacks;

    const fileInput = document.getElementById('audioFile');
    const tagsInput = document.getElementById('audioTags');
    const statusDiv = document.getElementById('uploadStatus');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please select at least one audio file');
        return;
    }

    const files = Array.from(fileInput.files);
    const sharedTags = tagsInput.value
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

    try {
        if (statusDiv) statusDiv.textContent = `Uploading ${files.length} file(s)...`;
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (statusDiv) statusDiv.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;

            // Auto-extract tags from filename
            const extracted = extractTagsFromFilename(file.name);

            // Combine auto-tags + shared tags (remove duplicates)
            const allTags = [...new Set([...extracted.tags, ...sharedTags])];

            // Get audio length
            const length = await getAudioDuration(file);

            // Upload file to Supabase Storage (sanitize filename for valid storage key)
            const sanitizedName = sanitizeFilename(file.name);
            const fileName = `${Date.now()}-${i}-${sanitizedName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('audio-files')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('audio-files')
                .getPublicUrl(fileName);

            // Save metadata to database
            const { data: dbData, error: dbError } = await supabase
                .from('audio_files')
                .insert([{
                    name: file.name,
                    file_url: urlData.publicUrl,
                    tags: allTags,
                    bpm: extracted.bpm,
                    key: extracted.key,
                    length: length
                }])
                .select();

            if (dbError) throw dbError;
            successCount++;
        }

        // Reload data
        await loadData();

        // Clear inputs
        if (fileInput) fileInput.value = '';
        if (tagsInput) tagsInput.value = '';

        if (statusDiv) {
            statusDiv.textContent = `✅ Successfully uploaded ${successCount} file(s)!`;
            setTimeout(() => { statusDiv.textContent = ''; }, 3000);
        }
    } catch (error) {
        console.error('[FileProcessor] Error uploading files:', error);
        if (statusDiv) {
            statusDiv.textContent = `❌ Error uploading files. Check console for details.`;
            statusDiv.style.color = '#dc3545';
        }
    }
}
