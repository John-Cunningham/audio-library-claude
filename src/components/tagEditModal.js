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
