/**
 * Tag Edit Modal Component
 *
 * Handles batch editing of tags, BPM, and Key for selected files.
 * Manages modal state, tag pills, suggestions, and save functionality.
 *
 * State variables are managed through getter/setter functions to maintain
 * proper encapsulation while allowing external access from app.js.
 */

// ===================================================================
// STATE MANAGEMENT
// ===================================================================

let modalTags = new Map(); // Map of tag -> count
let modalTagsToAdd = new Set();
let modalTagsToRemove = new Set();
let selectedModalTag = null; // Currently selected tag pill

// Getter functions for state access
export const getModalTags = () => modalTags;
export const getModalTagsToAdd = () => modalTagsToAdd;
export const getModalTagsToRemove = () => modalTagsToRemove;
export const getSelectedModalTag = () => selectedModalTag;

// Setter functions for state mutation
export const setModalTags = (value) => { modalTags = value; };
export const setModalTagsToAdd = (value) => { modalTagsToAdd = value; };
export const setModalTagsToRemove = (value) => { modalTagsToRemove = value; };
export const setSelectedModalTag = (value) => { selectedModalTag = value; };

// ===================================================================
// MODAL OPEN/CLOSE
// ===================================================================

/**
 * Open the tag edit modal for batch editing selected files
 * @param {Set} selectedFiles - Set of file IDs to edit
 * @param {Array} audioFiles - Array of all audio files
 */
export function open(selectedFiles, audioFiles) {
    if (selectedFiles.size === 0) return;

    // Reset modal state
    modalTags.clear();
    modalTagsToAdd.clear();
    modalTagsToRemove.clear();
    selectedModalTag = null;

    // Count tags across selected files
    const filesToEdit = Array.from(selectedFiles).map(id => audioFiles.find(f => f.id === id));
    filesToEdit.forEach(file => {
        if (!file) return;
        file.tags.forEach(tag => {
            modalTags.set(tag, (modalTags.get(tag) || 0) + 1);
        });
    });

    // Populate BPM and Key fields if editing single file
    if (selectedFiles.size === 1) {
        const file = filesToEdit[0];
        document.getElementById('modalBpmInput').value = file.bpm || '';
        document.getElementById('modalKeyInput').value = file.key || '';
    } else {
        // Clear fields for multiple file edit
        document.getElementById('modalBpmInput').value = '';
        document.getElementById('modalKeyInput').value = '';
        document.getElementById('modalBpmInput').placeholder = 'Leave blank to keep existing';
    }

    // Update modal title
    document.getElementById('modalFileCount').textContent = `(${selectedFiles.size} file${selectedFiles.size > 1 ? 's' : ''})`;

    // Reset button text to "Save Changes"
    document.querySelector('.modal-btn-save').textContent = 'Save Changes';

    // Show processing options (edit mode) - reset all to unchecked
    const processingOptions = document.getElementById('processingOptions');
    processingOptions.style.display = 'block';

    // Change title and note for edit mode
    document.getElementById('processingOptionsTitle').textContent = 'Run Processing:';
    document.getElementById('processingNote').innerHTML = '<p style="margin: 0; font-size: 11px; color: #888; line-height: 1.4;"><strong>Note:</strong> Check boxes to run processing on selected file(s). Unchecked items will not be processed.</p>';

    // Reset all checkboxes to unchecked (edit mode defaults)
    document.getElementById('processStems').checked = false;
    document.getElementById('processBpmKey').checked = false;
    document.getElementById('processInstruments').checked = false;
    document.getElementById('processChords').checked = false;
    document.getElementById('processBeatmap').checked = false;
    document.getElementById('processAutoTag').checked = false;
    document.getElementById('processConvertMp3').checked = false;

    // Render tag pills
    render();

    // Show modal
    const modal = document.getElementById('editTagsModal');
    if (!modal) {
        console.error('Tag edit modal element not found in DOM');
        return;
    }
    modal.classList.add('active');

    // Focus input
    setTimeout(() => {
        const tagInput = document.getElementById('tagInputField');
        if (tagInput) tagInput.focus();
    }, 100);
}

/**
 * Close the tag edit modal and reset state
 * @param {Function} renderTags - Callback to re-render main tag cloud
 * @param {Function} renderFiles - Callback to re-render file list
 * @param {Object} filters - Filter state object to clear
 * @param {Function} setSearchQuery - Callback to clear search query
 * @param {Function} setPendingUploadFiles - Callback to clear pending uploads
 */
export function close(callbacks) {
    const modal = document.getElementById('editTagsModal');
    if (!modal) {
        console.error('Tag edit modal element not found in DOM');
        return;
    }

    modal.classList.remove('active');

    const tagInput = document.getElementById('tagInputField');
    if (tagInput) tagInput.value = '';

    const suggestions = document.getElementById('tagSuggestions');
    if (suggestions) suggestions.style.display = 'none';

    // Clear BPM and Key inputs
    const bpmInput = document.getElementById('modalBpmInput');
    const keyInput = document.getElementById('modalKeyInput');
    if (bpmInput) {
        bpmInput.value = '';
        bpmInput.placeholder = 'e.g., 120 or 97.833';
    }
    if (keyInput) keyInput.value = '';

    // Clear pending upload files if user cancels
    if (callbacks.setPendingUploadFiles) {
        callbacks.setPendingUploadFiles([]);
    }

    // Reset button text
    const saveBtn = document.querySelector('.modal-btn-save');
    if (saveBtn) saveBtn.textContent = 'Save Changes';

    // Clear main search bar and filters
    if (callbacks.setSearchQuery) {
        callbacks.setSearchQuery('');
    }

    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.value = '';

    if (callbacks.filters) {
        callbacks.filters.canHave.clear();
        callbacks.filters.mustHave.clear();
        callbacks.filters.exclude.clear();
    }

    // Re-render to show cleared state
    if (callbacks.renderTags) callbacks.renderTags();
    if (callbacks.renderFiles) callbacks.renderFiles();
}

// ===================================================================
// MODAL RENDERING & TAG MANIPULATION
// ===================================================================

/**
 * Render tag pills in the modal
 * Shows existing tags, tags to add (green), and handles tag selection
 */
export function render() {
    const container = document.getElementById('tagInputContainer');
    const input = document.getElementById('tagInputField');

    if (!container || !input) {
        console.error('[TagEditModal] Tag input container or field not found');
        return;
    }

    // Clear container except input
    container.innerHTML = '';

    // Add existing tags as pills
    Array.from(modalTags.entries())
        .filter(([tag]) => !modalTagsToRemove.has(tag))
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .forEach(([tag, count]) => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill-editable';
            if (selectedModalTag === tag) {
                pill.classList.add('selected');
            }
            pill.innerHTML = `
                ${tag} <span class="count">${count}</span>
            `;
            pill.onclick = () => selectTag(tag);
            container.appendChild(pill);
        });

    // Add tags to add (green pills)
    modalTagsToAdd.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill-editable';
        if (selectedModalTag === tag) {
            pill.classList.add('selected');
        } else {
            pill.style.borderColor = '#10b981';
            pill.style.background = 'rgba(16, 185, 129, 0.2)';
        }
        pill.innerHTML = `${tag} <span class="count">+</span>`;
        pill.onclick = () => selectTag(tag);
        container.appendChild(pill);
    });

    // Re-add input field
    container.appendChild(input);
}

/**
 * Select or deselect a tag pill
 * @param {string} tag - Tag name to select/deselect
 */
export function selectTag(tag) {
    if (selectedModalTag === tag) {
        selectedModalTag = null; // Deselect if clicking same tag
    } else {
        selectedModalTag = tag;
    }
    render();
}

/**
 * Remove the currently selected tag
 * Marks existing tags for removal or deletes new tags
 */
export function removeSelectedTag() {
    if (selectedModalTag) {
        if (modalTags.has(selectedModalTag)) {
            // Existing tag - mark for removal
            modalTagsToRemove.add(selectedModalTag);
        } else if (modalTagsToAdd.has(selectedModalTag)) {
            // New tag - just delete it
            modalTagsToAdd.delete(selectedModalTag);
        }
        selectedModalTag = null;
        render();
    }
}

/**
 * Add a tag to the modal
 * @param {string} tag - Tag name to add
 */
export function addTag(tag) {
    if (!tag) return;

    // Check if tag already exists (case-insensitive)
    const tagLower = tag.toLowerCase();
    const existingInModal = Array.from(modalTags.keys()).find(t => t.toLowerCase() === tagLower);
    const existingInToAdd = Array.from(modalTagsToAdd).find(t => t.toLowerCase() === tagLower);
    const existingInToRemove = Array.from(modalTagsToRemove).find(t => t.toLowerCase() === tagLower);

    // If it's in the remove set, take it out (user is re-adding it)
    if (existingInToRemove) {
        modalTagsToRemove.delete(existingInToRemove);
        render();
        document.getElementById('tagInputField').value = '';
        document.getElementById('tagSuggestions').style.display = 'none';
        return;
    }

    // Don't add if it already exists and isn't being removed
    if (existingInModal || existingInToAdd) {
        return;
    }

    // Add the new tag
    modalTagsToAdd.add(tag);
    render();
    document.getElementById('tagInputField').value = '';
    document.getElementById('tagSuggestions').style.display = 'none';
}

// ===================================================================
// SAVE FUNCTIONALITY
// ===================================================================

/**
 * Save tag/BPM/Key changes and optionally trigger processing webhooks
 * Handles both upload mode (new files) and edit mode (existing files)
 *
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.performUpload - Upload new files with tags
 * @param {Function} callbacks.runSelectedProcessing - Run Railway processing webhooks
 * @param {Function} callbacks.loadData - Reload data from database
 * @param {Function} callbacks.renderTags - Re-render tag cloud
 * @param {Function} callbacks.renderFiles - Re-render file list
 * @param {Object} state - State access
 * @param {Set} state.selectedFiles - Set of selected file IDs
 * @param {Array} state.audioFiles - Array of all audio files
 * @param {Array} state.pendingUploadFiles - Array of files pending upload
 * @param {Function} state.setPendingUploadFiles - Set pending upload files
 * @param {Function} state.clearSelectedFiles - Clear selected files
 * @param {Function} state.setSearchQuery - Set search query
 * @param {Object} state.filters - Filter state object
 * @param {Object} state.supabase - Supabase client
 */
export async function save(callbacks, state) {
    const {
        performUpload,
        runSelectedProcessing,
        loadData,
        renderTags,
        renderFiles
    } = callbacks;

    const {
        selectedFiles,
        audioFiles,
        pendingUploadFiles,
        setPendingUploadFiles,
        clearSelectedFiles,
        setSearchQuery,
        filters,
        supabase
    } = state;

    const modal = document.getElementById('editTagsModal');
    if (!modal) {
        console.error('[TagEditModal] Modal element not found');
        return;
    }

    // Check if we're in upload mode
    if (pendingUploadFiles.length > 0) {
        // Upload mode - collect tags and upload files
        const tagsToApply = Array.from(modalTagsToAdd);
        modal.classList.remove('active');

        await performUpload(pendingUploadFiles, tagsToApply);
        setPendingUploadFiles([]);
        return;
    }

    // Edit mode - update existing files
    const filesToUpdate = Array.from(selectedFiles);

    // Check which processing options are selected
    const shouldProcessStems = document.getElementById('processStems').checked;
    const shouldProcessBpmKey = document.getElementById('processBpmKey').checked;
    const shouldProcessInstruments = document.getElementById('processInstruments').checked;
    const shouldProcessChords = document.getElementById('processChords').checked;
    const shouldProcessBeatmap = document.getElementById('processBeatmap').checked;
    const shouldProcessAutoTag = document.getElementById('processAutoTag').checked;
    const shouldConvertMp3 = document.getElementById('processConvertMp3').checked;

    try {
        // Get BPM and Key values from inputs
        const bpmInput = document.getElementById('modalBpmInput').value.trim();
        const keyInput = document.getElementById('modalKeyInput').value.trim();

        // First, update tags/BPM/Key in database
        for (let fileId of filesToUpdate) {
            const file = audioFiles.find(f => f.id === fileId);
            if (!file) continue;

            // Start with current tags
            let newTags = [...file.tags];

            // Remove tags marked for removal
            newTags = newTags.filter(tag => !modalTagsToRemove.has(tag));

            // Add new tags
            newTags = [...new Set([...newTags, ...modalTagsToAdd])];

            // Prepare update object
            const updateData = { tags: newTags };

            // Update BPM if provided
            if (bpmInput !== '') {
                const bpmValue = parseFloat(bpmInput);
                updateData.bpm = isNaN(bpmValue) ? null : bpmValue;
            }

            // Update Key if provided
            if (keyInput !== '') {
                updateData.key = keyInput || null;
            }

            // Update in database
            await supabase
                .from('audio_files')
                .update(updateData)
                .eq('id', fileId);
        }

        // Close modal
        close({
            setPendingUploadFiles,
            setSearchQuery,
            filters,
            renderTags,
            renderFiles
        });

        // Clear selection
        clearSelectedFiles();

        // Now run any selected processing tasks
        const anyProcessing = shouldProcessBpmKey || shouldProcessInstruments ||
                             shouldProcessChords || shouldProcessBeatmap ||
                             shouldProcessStems || shouldProcessAutoTag || shouldConvertMp3;

        if (anyProcessing) {
            await runSelectedProcessing(filesToUpdate, {
                bpmKey: shouldProcessBpmKey,
                instruments: shouldProcessInstruments,
                chords: shouldProcessChords,
                beatmap: shouldProcessBeatmap,
                stems: shouldProcessStems,
                auto_tag: shouldProcessAutoTag,
                convert_to_mp3: shouldConvertMp3
            });
        }

        // Reload data
        await loadData();

    } catch (error) {
        console.error('[TagEditModal] Error saving file data:', error);
        alert('Error saving file data. Check console for details.');
    }
}

// ===================================================================
// EVENT HANDLERS
// ===================================================================

/**
 * Initialize modal keyboard shortcuts and event handlers
 * Should be called once on DOMContentLoaded
 *
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.setPendingUploadFiles - Set pending upload files
 * @param {Function} callbacks.setSearchQuery - Set search query
 * @param {Object} callbacks.filters - Filter state object
 * @param {Function} callbacks.renderTags - Re-render tag cloud
 * @param {Function} callbacks.renderFiles - Re-render file list
 * @param {Function} callbacks.getAllTags - Get all available tags
 */
export function initEventHandlers(callbacks) {
    const {
        setPendingUploadFiles,
        setSearchQuery,
        filters,
        renderTags,
        renderFiles,
        getAllTags
    } = callbacks;

    const tagInput = document.getElementById('tagInputField');
    const suggestionsContainer = document.getElementById('tagSuggestions');
    const modal = document.getElementById('editTagsModal');

    if (!tagInput || !suggestionsContainer || !modal) {
        console.error('[TagEditModal] Required DOM elements not found for event handlers');
        return;
    }

    // Tag input - show suggestions as user types
    tagInput.addEventListener('input', (e) => {
        const value = e.target.value.trim().toLowerCase();

        if (value.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        // Get all available tags
        const allTags = getAllTags();
        const suggestions = allTags
            .map(({ tag }) => tag)
            .filter(tag => {
                return tag.includes(value) &&
                       !modalTags.has(tag) &&
                       !modalTagsToAdd.has(tag) &&
                       !modalTagsToRemove.has(tag);
            })
            .slice(0, 10);

        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions
                .map(tag => `<div class="tag-suggestion-item" onclick="window.addModalTag('${tag}')">${tag}</div>`)
                .join('');
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Tag input keydown - Enter to add, Backspace to select/remove
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && tagInput.value.trim()) {
            e.preventDefault();
            addTag(tagInput.value.trim());
        } else if ((e.key === 'Backspace' || e.key === 'Delete') && tagInput.value === '') {
            e.preventDefault();
            if (selectedModalTag) {
                // Delete selected tag
                removeSelectedTag();
            } else if (e.key === 'Backspace') {
                // Backspace with no selection - select last tag
                const allTags = Array.from(modalTags.keys()).filter(tag => !modalTagsToRemove.has(tag));
                const newTags = Array.from(modalTagsToAdd);
                const lastTag = newTags.length > 0 ? newTags[newTags.length - 1] : allTags[allTags.length - 1];
                if (lastTag) {
                    selectedModalTag = lastTag;
                    render();
                }
            }
        }
    });

    // Global keyboard handler for modal (when input is not focused)
    document.addEventListener('keydown', (e) => {
        // Only handle if modal is open and input is not focused
        if (!modal.classList.contains('active') || document.activeElement === tagInput) return;

        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            if (selectedModalTag) {
                removeSelectedTag();
            } else if (e.key === 'Backspace') {
                // Select last tag
                const allTags = Array.from(modalTags.keys()).filter(tag => !modalTagsToRemove.has(tag));
                const newTags = Array.from(modalTagsToAdd);
                const lastTag = newTags.length > 0 ? newTags[newTags.length - 1] : allTags[allTags.length - 1];
                if (lastTag) {
                    selectedModalTag = lastTag;
                    render();
                }
            }
        } else if (e.key === 'Escape') {
            close({
                setPendingUploadFiles,
                setSearchQuery,
                filters,
                renderTags,
                renderFiles
            });
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!suggestionsContainer.contains(e.target) && e.target !== tagInput) {
            suggestionsContainer.style.display = 'none';
        }
    });

    console.log('[TagEditModal] Event handlers initialized');
}
