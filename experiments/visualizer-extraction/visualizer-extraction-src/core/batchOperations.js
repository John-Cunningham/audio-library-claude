/**
 * Batch Operations Module
 *
 * Handles batch operations on multiple files and processing workflows.
 * Includes file deletion, BPM/Key detection, stems separation, and
 * Railway webhook processing integration.
 *
 * Usage:
 *   import * as BatchOperations from './batchOperations.js';
 *
 *   BatchOperations.init(callbacks, state);
 *   await BatchOperations.batchDelete();
 *   await BatchOperations.batchDetect();
 */

import * as ProgressBar from '../utils/progressBar.js';
import * as FileListRenderer from '../views/fileListRenderer.js';
import * as MiniWaveform from '../components/miniWaveform.js';

// Module state
let callbacks = {};
let state = {};

/**
 * Initialize batch operations module with callbacks and state
 * @param {Object} cbs - Callback functions
 * @param {Function} cbs.loadData - Reload data from database
 * @param {Function} cbs.clearPlayer - Clear current player state
 * @param {Object} st - State getters
 * @param {Function} st.getSupabase - Get Supabase client
 * @param {Function} st.getAudioFiles - Get audio files array
 * @param {Function} st.getSelectedFiles - Get selected files Set
 * @param {Function} st.getCurrentFileId - Get current file ID
 * @param {Function} st.getProcessingFiles - Get processing files Set
 */
export function init(cbs, st) {
    callbacks = cbs;
    state = st;
}

// ===================================================================
// PROCESSING OPERATIONS
// ===================================================================

/**
 * Run selected processing tasks with progress indication
 * Sends files to Railway webhook for BPM/Key detection, instruments,
 * chords, beatmap, stems separation, etc.
 *
 * @param {number[]} fileIds - Array of file IDs to process
 * @param {Object} options - Processing options
 * @param {boolean} options.bpmKey - Detect BPM and Key
 * @param {boolean} options.instruments - Detect instruments
 * @param {boolean} options.chords - Detect chords
 * @param {boolean} options.beatmap - Generate beatmap
 * @param {boolean} options.stems - Separate stems
 * @param {boolean} options.auto_tag - Auto-tag from analysis
 * @param {boolean} options.convert_to_mp3 - Convert to MP3
 */
export async function runSelectedProcessing(fileIds, options) {
    const audioFiles = state.getAudioFiles();
    const processingFiles = state.getProcessingFiles();

    const filesToProcess = fileIds.map(id => audioFiles.find(f => f.id === id)).filter(f => f);
    const totalFiles = filesToProcess.length;

    if (totalFiles === 0) return;

    // Mark files as processing
    filesToProcess.forEach(file => processingFiles.add(file.id));
    FileListRenderer.render(); // Re-render to show spinners

    // Build task list description
    let tasks = [];
    if (options.bpmKey) tasks.push('BPM/Key');
    if (options.instruments) tasks.push('Instruments');
    if (options.chords) tasks.push('Chords');
    if (options.beatmap) tasks.push('Beatmap');
    if (options.stems) tasks.push('Stems');

    const taskList = tasks.join(', ');

    // Show progress bar
    ProgressBar.show(`Processing: ${filesToProcess[0].name}`, 0, totalFiles);

    for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];

        // Update progress
        ProgressBar.update(i + 1, totalFiles, `Processing (${taskList}): ${file.name}`);

        // Estimate time based on what's being processed
        let estimatedTime = 0;
        if (options.bpmKey) estimatedTime += 15;
        if (options.instruments || options.chords || options.beatmap) estimatedTime += 15;
        if (options.stems) estimatedTime += 120;

        // Start animation
        ProgressBar.startAnimation(estimatedTime);

        try {
            // Call Railway webhook for on-demand processing
            const response = await fetch('https://web-production-bcf6c.up.railway.app/process-existing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: file.id,
                    file_url: file.file_url,
                    file_name: file.name,
                    options: {
                        bpm_key: options.bpmKey,
                        instruments: options.instruments,
                        chords: options.chords,
                        beatmap: options.beatmap,
                        stems: options.stems,
                        auto_tag: options.auto_tag,
                        convert_to_mp3: options.convert_to_mp3
                    }
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                console.log(`✓ Processing completed: ${file.name}`, result.result);

                // Remove from processing set
                processingFiles.delete(file.id);

                // Reload data for this file to get updated BPM/key/etc
                await callbacks.loadData();
            } else {
                console.error(`✗ Processing error: ${file.name}`, result.error || result.message);
                // Still remove from processing on error
                processingFiles.delete(file.id);
            }

            ProgressBar.complete();
        } catch (error) {
            console.error(`✗ Processing error: ${file.name}`, error);
            // Remove from processing on error
            processingFiles.delete(file.id);
            await callbacks.loadData(); // Refresh to remove hourglass
            ProgressBar.complete();
        }
    }

    // Final progress
    ProgressBar.update(totalFiles, totalFiles, 'Complete!');
    ProgressBar.complete();

    setTimeout(() => {
        ProgressBar.hide();
    }, 1500);
}

// ===================================================================
// DELETE OPERATIONS
// ===================================================================

/**
 * Delete a single file from storage and database
 * @param {number} fileId - File ID to delete
 * @param {Event} event - Click event (for stopPropagation)
 */
export async function deleteFile(fileId, event) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this file?')) return;

    const supabase = state.getSupabase();
    const audioFiles = state.getAudioFiles();
    const currentFileId = state.getCurrentFileId();

    try {
        const file = audioFiles.find(f => f.id === fileId);
        if (!file) return;

        // Extract filename from URL
        const urlParts = file.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('audio-files')
            .remove([fileName]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
            .from('audio_files')
            .delete()
            .eq('id', fileId);

        if (dbError) throw dbError;

        // Clear player if this file was playing
        if (currentFileId === fileId) {
            callbacks.clearPlayer();
        }

        // Clean up mini waveform
        MiniWaveform.destroy(fileId);

        // Reload data
        await callbacks.loadData();
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('Error deleting file. Check console for details.');
    }
}

/**
 * Batch delete selected files
 * Deletes multiple files from storage and database
 */
export async function batchDelete() {
    const selectedFiles = state.getSelectedFiles();

    if (selectedFiles.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) return;

    const supabase = state.getSupabase();
    const audioFiles = state.getAudioFiles();
    const currentFileId = state.getCurrentFileId();

    try {
        const filesToDelete = Array.from(selectedFiles);

        for (let fileId of filesToDelete) {
            const file = audioFiles.find(f => f.id === fileId);
            if (!file) continue;

            // Extract filename from URL
            const urlParts = file.file_url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            // Delete from storage
            await supabase.storage
                .from('audio-files')
                .remove([fileName]);

            // Delete from database
            await supabase
                .from('audio_files')
                .delete()
                .eq('id', fileId);
        }

        // Clear selection
        selectedFiles.clear();

        // Clear player if current file was deleted
        if (filesToDelete.includes(currentFileId)) {
            callbacks.clearPlayer();
        }

        // Clean up mini waveforms for deleted files
        filesToDelete.forEach(fileId => {
            MiniWaveform.destroy(fileId);
        });

        // Reload data
        await callbacks.loadData();
        alert(`Successfully deleted ${filesToDelete.length} file(s)`);
    } catch (error) {
        console.error('Error batch deleting files:', error);
        alert('Error deleting files. Check console for details.');
    }
}

// ===================================================================
// DETECTION OPERATIONS
// ===================================================================

/**
 * Batch detect BPM/Key/Instruments using Music.ai
 * Processes selected files through local Python server
 */
export async function batchDetect() {
    const selectedFiles = state.getSelectedFiles();

    if (selectedFiles.size === 0) return;

    const audioFiles = state.getAudioFiles();
    const filesToProcess = Array.from(selectedFiles).map(id => audioFiles.find(f => f.id === id));
    const totalFiles = filesToProcess.length;

    if (!confirm(`Detect BPM, Key, and Instruments for ${totalFiles} file(s)?`)) return;

    // Show progress bar
    ProgressBar.show(`Detecting: ${filesToProcess[0].name}`, 0, totalFiles);

    for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];

        // Update progress
        ProgressBar.update(i + 1, totalFiles, `Detecting: ${file.name}`);

        // Start animation (estimate 15 seconds per file)
        ProgressBar.startAnimation(15);

        try {
            // Call Python script
            const response = await fetch('http://localhost:8000/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_file_id: file.id,
                    file_url: file.file_url,
                    filename: file.name
                })
            });

            const result = await response.json();

            if (result.status === 'complete') {
                console.log(`✓ Completed: ${file.name}`, result.data);
                ProgressBar.complete();
            } else if (result.status === 'error') {
                console.error(`✗ Error: ${file.name}`, result.message);
                ProgressBar.complete();
            }
        } catch (error) {
            console.error(`✗ Error: ${file.name}`, error);
            ProgressBar.complete();
        }
    }

    // Final progress
    ProgressBar.update(totalFiles, totalFiles, 'Complete!');
    ProgressBar.complete();

    setTimeout(async () => {
        ProgressBar.hide();
        await callbacks.loadData(); // Reload to show updated data
    }, 1500);
}

/**
 * Batch separate stems using Music.ai
 * Processes selected files through local Python server
 */
export async function batchSeparateStems() {
    const selectedFiles = state.getSelectedFiles();

    if (selectedFiles.size === 0) return;

    const audioFiles = state.getAudioFiles();
    const filesToProcess = Array.from(selectedFiles).map(id => audioFiles.find(f => f.id === id));
    const totalFiles = filesToProcess.length;

    if (!confirm(`Separate stems for ${totalFiles} file(s)? This may take several minutes per file.`)) return;

    // Show progress bar
    ProgressBar.show(`Separating: ${filesToProcess[0].name}`, 0, totalFiles);

    for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];

        // Update progress
        ProgressBar.update(i + 1, totalFiles, `Separating: ${file.name}`);

        // Start animation (estimate 120 seconds per file for stems)
        ProgressBar.startAnimation(120);

        try {
            // Call Python script (process_stems.py)
            const response = await fetch('http://localhost:8000/stems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_file_id: file.id,
                    file_url: file.file_url
                })
            });

            const result = await response.json();

            if (result.status === 'complete') {
                console.log(`✓ Completed: ${file.name}`, result.stems);
                ProgressBar.complete();
            } else if (result.status === 'error') {
                console.error(`✗ Error: ${file.name}`, result.message);
                ProgressBar.complete();
            }
        } catch (error) {
            console.error(`✗ Error: ${file.name}`, error);
            ProgressBar.complete();
        }
    }

    // Final progress
    ProgressBar.update(totalFiles, totalFiles, 'Complete!');
    ProgressBar.complete();

    setTimeout(async () => {
        ProgressBar.hide();
        await callbacks.loadData(); // Reload to show updated data
    }, 1500);
}
