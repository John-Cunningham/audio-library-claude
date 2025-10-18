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

    // Render tag pills (using function from app.js for now - will be moved in Step 2)
    if (typeof window.renderModalTags === 'function') {
        window.renderModalTags();
    }

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
