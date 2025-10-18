/**
 * File List Renderer Module
 *
 * Handles rendering, filtering, sorting, and interaction with the file list.
 * Manages file selection, batch operations UI, and click handlers.
 *
 * Usage:
 *   import * as FileListRenderer from './fileListRenderer.js';
 *
 *   FileListRenderer.init(callbacks, state);
 *   FileListRenderer.render();
 *   FileListRenderer.filterFiles();
 */

import * as StemLegacyPlayer from '../components/stemLegacyPlayer.js';

// Module state for sorting
let sortBy = 'date';
let sortOrder = 'desc';
let lastClickedFileId = null;

// Callbacks and state access (set by init)
let callbacks = {};
let state = {};

/**
 * Initialize file list renderer with callbacks and state access
 *
 * @param {Object} cbs - Callback functions
 * @param {Function} cbs.loadFile - Load and play a file
 * @param {Function} cbs.renderMiniWaveforms - Render mini waveforms
 * @param {Function} cbs.openTagEditModal - Open tag edit modal
 * @param {Function} cbs.updateStemsButton - Update stems button appearance
 * @param {Object} st - State getters
 * @param {Function} st.getAudioFiles - Get audio files array
 * @param {Function} st.getSearchQuery - Get search query
 * @param {Function} st.getFilters - Get filter state
 * @param {Function} st.getSelectedFiles - Get selected files Set
 * @param {Function} st.getCurrentFileId - Get current playing file ID
 * @param {Function} st.getProcessingFiles - Get files currently processing
 * @param {Function} st.getExpandedStems - Get expanded stems Set
 * @param {Function} st.getStemWavesurfers - Get stem wavesurfers
 */
export function init(cbs, st) {
    callbacks = cbs;
    state = st;
    console.log('[FileListRenderer] Initialized');
}

/**
 * Get current sort column
 */
export function getSortBy() {
    return sortBy;
}

/**
 * Get current sort order
 */
export function getSortOrder() {
    return sortOrder;
}

// ===================================================================
// FILTERING & SORTING
// ===================================================================

/**
 * Filter files based on search query and tag filters
 * @returns {Array} Filtered audio files
 */
export function filterFiles() {
    const audioFiles = state.getAudioFiles();
    const searchQuery = state.getSearchQuery();
    const filters = state.getFilters();

    let filtered = audioFiles;

    // Apply search query filter (searches filename AND tags)
    if (searchQuery) {
        filtered = filtered.filter(file => {
            const nameMatch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
            const tagMatch = file.tags && file.tags.some(tag =>
                tag.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return nameMatch || tagMatch;
        });
    }

    // Apply tag filters
    if (filters.canHave.size === 0 && filters.mustHave.size === 0 && filters.exclude.size === 0) {
        return filtered;
    }

    return filtered.filter(file => {
        const fileTags = new Set(file.tags);

        // Check EXCLUDE - if file has any excluded tag, filter it out
        for (let tag of filters.exclude) {
            if (fileTags.has(tag)) return false;
        }

        // Check MUST HAVE - file must have ALL must-have tags
        for (let tag of filters.mustHave) {
            if (!fileTags.has(tag)) return false;
        }

        // Check CAN HAVE - if can-have filters exist, file must have at least one
        if (filters.canHave.size > 0) {
            let hasCanHave = false;
            for (let tag of filters.canHave) {
                if (fileTags.has(tag)) {
                    hasCanHave = true;
                    break;
                }
            }
            if (!hasCanHave) return false;
        }

        return true;
    });
}

/**
 * Sort files by column
 * @param {Array} files - Files to sort
 * @returns {Array} Sorted files
 */
export function sortFiles(files) {
    const sorted = [...files];

    sorted.sort((a, b) => {
        let valA, valB;

        switch(sortBy) {
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'date':
                valA = new Date(a.created_at);
                valB = new Date(b.created_at);
                break;
            case 'bpm':
                valA = a.bpm || 0;
                valB = b.bpm || 0;
                break;
            case 'key':
                valA = a.key || '';
                valB = b.key || '';
                break;
            case 'length':
                valA = a.length || 0;
                valB = b.length || 0;
                break;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

/**
 * Handle sort column click
 * @param {string} column - Column name to sort by
 */
export function handleSort(column) {
    if (sortBy === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortBy = column;
        sortOrder = column === 'date' ? 'desc' : 'asc'; // Default to newest first for date
    }
    render();
}

// ===================================================================
// SELECTION MANAGEMENT
// ===================================================================

/**
 * Toggle file selection checkbox
 * @param {number} fileId - File ID to toggle
 * @param {Event} event - Click event
 */
export function toggleFileSelection(fileId, event) {
    event.stopPropagation();
    const selectedFiles = state.getSelectedFiles();

    if (selectedFiles.has(fileId)) {
        selectedFiles.delete(fileId);
    } else {
        selectedFiles.add(fileId);
    }
    updateSelectionUI();
}

/**
 * Update batch operation buttons based on selection
 */
export function updateSelectionUI() {
    const selectedFiles = state.getSelectedFiles();
    const selectedCount = selectedFiles.size;
    const selectedCountEl = document.getElementById('selectedCount');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const batchEditBtn = document.getElementById('batchEditBtn');

    if (selectedCount > 0) {
        selectedCountEl.textContent = `| ${selectedCount} selected`;
        batchDeleteBtn.disabled = false;
        batchEditBtn.disabled = false;
        batchDeleteBtn.style.opacity = '1';
        batchEditBtn.style.opacity = '1';
        batchDeleteBtn.style.cursor = 'pointer';
        batchEditBtn.style.cursor = 'pointer';
    } else {
        selectedCountEl.textContent = '';
        batchDeleteBtn.disabled = true;
        batchEditBtn.disabled = true;
        batchDeleteBtn.style.opacity = '0.5';
        batchEditBtn.style.opacity = '0.5';
        batchDeleteBtn.style.cursor = 'not-allowed';
        batchEditBtn.style.cursor = 'not-allowed';
    }

    // Update checkboxes
    const filteredFiles = filterFiles();
    filteredFiles.forEach(file => {
        const checkbox = document.getElementById(`checkbox-${file.id}`);
        if (checkbox) {
            checkbox.checked = selectedFiles.has(file.id);
        }
    });
}

/**
 * Select all visible files
 */
export function selectAll() {
    const selectedFiles = state.getSelectedFiles();
    const filteredFiles = filterFiles();
    filteredFiles.forEach(file => selectedFiles.add(file.id));
    updateSelectionUI();
}

/**
 * Deselect all files
 */
export function deselectAll() {
    const selectedFiles = state.getSelectedFiles();
    selectedFiles.clear();
    updateSelectionUI();
}

// ===================================================================
// FILE CLICK HANDLERS
// ===================================================================

/**
 * Handle file click - supports normal, option (range), and cmd/ctrl (multi-select)
 * @param {number} fileId - File ID clicked
 * @param {Event} event - Click event
 */
export function handleFileClick(fileId, event) {
    const selectedFiles = state.getSelectedFiles();
    const filteredFiles = filterFiles();

    if (event.altKey && lastClickedFileId) {
        // Option+click = range select from last clicked to this one
        event.preventDefault();
        event.stopPropagation();

        const lastIndex = filteredFiles.findIndex(f => f.id === lastClickedFileId);
        const currentIndex = filteredFiles.findIndex(f => f.id === fileId);

        if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);

            // Select all files in range
            for (let i = start; i <= end; i++) {
                selectedFiles.add(filteredFiles[i].id);
            }
        }

        // Update all checkboxes
        document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
            const checkboxFileId = parseInt(cb.id.replace('checkbox-', ''));
            cb.checked = selectedFiles.has(checkboxFileId);
        });

        updateSelectionUI();
    } else if (event.metaKey || event.ctrlKey) {
        // Cmd/Ctrl+click = toggle selection without changing playback
        event.preventDefault();
        event.stopPropagation();

        if (selectedFiles.has(fileId)) {
            selectedFiles.delete(fileId);
        } else {
            selectedFiles.add(fileId);
        }

        // Update checkbox
        const checkbox = document.getElementById(`checkbox-${fileId}`);
        if (checkbox) checkbox.checked = selectedFiles.has(fileId);

        lastClickedFileId = fileId;
        updateSelectionUI();
    } else {
        // Normal click = clear selection, select this file, and play
        selectedFiles.clear();
        selectedFiles.add(fileId);

        // Update all checkboxes
        document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        const checkbox = document.getElementById(`checkbox-${fileId}`);
        if (checkbox) checkbox.checked = true;

        lastClickedFileId = fileId;
        updateSelectionUI();

        // Load and play the file
        callbacks.loadFile(fileId);
    }
}

/**
 * Quick edit file (⋮ menu click)
 * @param {number} fileId - File ID to edit
 * @param {Event} event - Click event
 */
export function quickEditFile(fileId, event) {
    event.preventDefault();
    event.stopPropagation();

    const selectedFiles = state.getSelectedFiles();
    const audioFiles = state.getAudioFiles();

    // Select only this file
    selectedFiles.clear();
    selectedFiles.add(fileId);

    // Update checkboxes
    document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    const checkbox = document.getElementById(`checkbox-${fileId}`);
    if (checkbox) checkbox.checked = true;

    updateSelectionUI();

    // Open edit modal
    callbacks.openTagEditModal(selectedFiles, audioFiles);
}

/**
 * Open stems viewer (expand/collapse stems in file list)
 * @param {number} fileId - File ID
 * @param {Event} event - Click event
 */
export function openStemsViewer(fileId, event) {
    event.preventDefault();
    event.stopPropagation();

    const expandedStems = state.getExpandedStems();
    const currentFileId = state.getCurrentFileId();
    const stemWavesurfers = state.getStemWavesurfers();

    // Toggle expansion state
    if (expandedStems.has(fileId)) {
        expandedStems.delete(fileId);
    } else {
        expandedStems.add(fileId);
    }

    // Re-render to show/hide stems
    render();

    // Render waveforms in expansion containers if stems are loaded
    if (expandedStems.has(fileId) && Object.keys(stemWavesurfers).length > 0 && currentFileId === fileId) {
        setTimeout(() => {
            const stemFiles = {}; // TODO: Get stemFiles from state
            StemLegacyPlayer.renderStemWaveforms(fileId, stemFiles, WaveSurfer);

            const stemVolumes = {}; // TODO: Get from state
            const stemMuted = {}; // TODO: Get from state
            const stemSoloed = {}; // TODO: Get from state
            StemLegacyPlayer.restoreStemControlStates(fileId, stemFiles, {
                stemVolumes,
                stemMuted,
                stemSoloed
            });
        }, 100); // Small delay to ensure DOM is ready
    }
}

/**
 * Toggle stems viewer from bottom player bar STEMS button
 */
export function toggleStemsViewer() {
    const currentFileId = state.getCurrentFileId();
    if (!currentFileId) return;

    const expandedStems = state.getExpandedStems();
    const stemWavesurfers = state.getStemWavesurfers();

    // Toggle expansion state for current file
    if (expandedStems.has(currentFileId)) {
        expandedStems.delete(currentFileId);
    } else {
        expandedStems.add(currentFileId);
    }

    // Re-render to show/hide stems
    render();

    // Render waveforms in expansion containers if stems are loaded
    if (expandedStems.has(currentFileId) && Object.keys(stemWavesurfers).length > 0) {
        setTimeout(() => {
            const stemFiles = {}; // TODO: Get stemFiles from state
            StemLegacyPlayer.renderStemWaveforms(currentFileId, stemFiles, WaveSurfer);

            const stemVolumes = {}; // TODO: Get from state
            const stemMuted = {}; // TODO: Get from state
            const stemSoloed = {}; // TODO: Get from state
            StemLegacyPlayer.restoreStemControlStates(currentFileId, stemFiles, {
                stemVolumes,
                stemMuted,
                stemSoloed
            });
        }, 100); // Small delay to ensure DOM is ready
    }

    // Update STEMS button appearance
    callbacks.updateStemsButton();
}

// ===================================================================
// RENDERING
// ===================================================================

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

/**
 * Format duration for display
 */
function formatDuration(seconds) {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get sort icon for column header
 */
function getSortIcon(col) {
    if (sortBy !== col) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
}

/**
 * Render file list with filtering, sorting, and selection
 */
export function render() {
    const container = document.getElementById('fileList');
    const audioFiles = state.getAudioFiles();
    const selectedFiles = state.getSelectedFiles();
    const currentFileId = state.getCurrentFileId();
    const processingFiles = state.getProcessingFiles();
    const expandedStems = state.getExpandedStems();

    const filteredFiles = filterFiles();
    const sortedFiles = sortFiles(filteredFiles);

    document.getElementById('fileCount').textContent = `(${sortedFiles.length})`;

    if (sortedFiles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
                <div>${audioFiles.length === 0 ? 'No audio files yet. Upload your first audio file to get started!' : 'No files match your filters.'}</div>
            </div>
        `;
        updateSelectionUI();
        return;
    }

    // Build column headers
    const headers = `
        <div style="display: grid; grid-template-columns: 16px 1fr 80px 110px 55px 60px 60px 40px 30px; gap: 8px; padding: 8px 10px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 6px; font-size: 11px; color: #999; font-weight: 600;">
            <div></div>
            <div onclick="window.fileListHandleSort('name')" style="cursor: pointer; user-select: none;">
                Name ${getSortIcon('name')}
            </div>
            <div style="text-align: center;">
                Wave
            </div>
            <div onclick="window.fileListHandleSort('date')" style="cursor: pointer; user-select: none; text-align: center;">
                Date ${getSortIcon('date')}
            </div>
            <div onclick="window.fileListHandleSort('length')" style="cursor: pointer; user-select: none; text-align: center;">
                Time ${getSortIcon('length')}
            </div>
            <div onclick="window.fileListHandleSort('bpm')" style="cursor: pointer; user-select: none; text-align: center;">
                BPM ${getSortIcon('bpm')}
            </div>
            <div onclick="window.fileListHandleSort('key')" style="cursor: pointer; user-select: none; text-align: center;">
                Key ${getSortIcon('key')}
            </div>
            <div style="text-align: center;">
                Stems
            </div>
            <div></div>
        </div>
    `;

    const fileRows = sortedFiles.map(file => {
        // Build stem expansion UI - Vertical stack layout
        const stemsExpanded = expandedStems.has(file.id);
        const stemsHTML = stemsExpanded && file.has_stems ? generateStemsHTML(file.id) : '';

        return `
        <div class="file-item ${currentFileId === file.id ? 'active' : ''}" style="display: grid; grid-template-columns: 16px 1fr 80px 110px 55px 60px 60px 40px 30px; gap: 8px; align-items: center; ${stemsExpanded ? 'border-radius: 6px 6px 0 0;' : ''}">
            <input type="checkbox" id="checkbox-${file.id}" ${selectedFiles.has(file.id) ? 'checked' : ''}
                   onclick="window.fileListToggleSelection(${file.id}, event)"
                   style="width: 16px; height: 16px; cursor: pointer;">
            <div onclick="window.fileListHandleFileClick(${file.id}, event)" style="cursor: pointer;">
                <div class="file-name">🎵 ${file.name}</div>
                <div class="file-tags">
                    ${file.tags.map(tag => `<span class="file-tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div id="miniwave-${file.id}" style="height: 32px; cursor: pointer; background: #1a1a1a; border-radius: 4px;"></div>
            <div onclick="window.fileListHandleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                ${formatDate(file.created_at)}
            </div>
            <div onclick="window.fileListHandleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                ${formatDuration(file.length)}
            </div>
            <div onclick="window.fileListHandleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                ${file.bpm ? file.bpm : (processingFiles.has(file.id) ? '<span class="spinner">⏳</span>' : '-')}
            </div>
            <div onclick="window.fileListHandleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                ${file.key ? file.key : (processingFiles.has(file.id) ? '<span class="spinner">⏳</span>' : '-')}
            </div>
            <div style="text-align: center;">
                ${file.has_stems ?
                    `<span class="stems-icon active ${stemsExpanded ? 'expanded' : ''}" onclick="window.fileListOpenStemsViewer(${file.id}, event)" title="${stemsExpanded ? 'Hide' : 'View'} stems">🎛️</span>` :
                    `<span class="stems-icon" onclick="window.generateStems(${file.id}, event)" title="Generate stems">⚙️</span>`
                }
            </div>
            <button onclick="window.fileListQuickEdit(${file.id}, event)" title="Edit file" style="background: transparent; border: none; color: #999; cursor: pointer; font-size: 16px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">
                ⋮
            </button>
        </div>
        ${stemsHTML}
    `;
    }).join('');

    // Put headers in sticky section, fileRows in scrollable container
    document.getElementById('columnHeaders').innerHTML = headers;
    container.innerHTML = fileRows;
    updateSelectionUI();

    // Render mini waveforms after DOM update
    setTimeout(() => callbacks.renderMiniWaveforms(sortedFiles), 0);
}

/**
 * Generate stems expansion HTML for a file
 */
function generateStemsHTML(fileId) {
    const stems = ['vocals', 'drums', 'bass', 'other'];
    const icons = { vocals: '🎤', drums: '🥁', bass: '🎸', other: '🎹' };
    const labels = { vocals: 'Vocals', drums: 'Drums', bass: 'Bass', other: 'Other' };

    return `
        <div class="stems-expansion" style="background: #0f0f0f; border: 1px solid #2a2a2a; border-top: none; border-radius: 0 0 6px 6px; padding: 15px; margin-top: -6px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${stems.map(stem => `
                    <div class="stem-card" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 18px;">${icons[stem]}</span>
                            <span style="color: #fff; font-weight: 600; font-size: 14px; min-width: 60px;">${labels[stem]}</span>
                            <div style="flex: 1;">
                                <div id="stem-waveform-${stem}-${fileId}" style="height: 80px; background: #0f0f0f; border-radius: 4px; overflow: hidden;"></div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; min-width: 250px;">
                                <!-- Volume Slider -->
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="color: #999; font-size: 11px;">Vol</span>
                                    <input type="range" id="stem-volume-${stem}-${fileId}" min="0" max="100" value="100"
                                           style="width: 80px;" oninput="window.handleStemVolumeChange('${stem}', this.value)">
                                    <span id="stem-volume-value-${stem}-${fileId}" style="color: #999; font-size: 11px; min-width: 30px;">100%</span>
                                </div>
                                <!-- Mute Button -->
                                <button id="stem-mute-${stem}-${fileId}" onclick="window.handleStemMute('${stem}')"
                                        style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 16px;"
                                        title="Mute ${labels[stem]}">🔊</button>
                                <!-- Solo Button -->
                                <button id="stem-solo-${stem}-${fileId}" onclick="window.handleStemSolo('${stem}')"
                                        style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600;"
                                        title="Solo ${labels[stem]}">S</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
