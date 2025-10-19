/**
 * Upload Manager Module
 *
 * Manages the file upload workflow including:
 * - File picker triggering
 * - Processing preferences (localStorage persistence)
 * - Upload modal coordination with TagEditModal
 * - File selection handling
 *
 * Usage:
 *   import * as UploadManager from './uploadManager.js';
 *
 *   UploadManager.init(callbacks, state);
 *   UploadManager.openUploadFlow();
 */

import { PREF_KEYS } from './config.js';
import * as TagEditModal from '../components/tagEditModal.js';

// Module state
let state = {};

/**
 * Initialize upload manager with state getters
 * @param {Object} st - State getters
 * @param {Function} st.getPendingUploadFiles - Get pending upload files array
 * @param {Function} st.setPendingUploadFiles - Set pending upload files array
 * @param {Function} st.renderModalTags - Render modal tags
 */
export function init(st) {
    state = st;

    // Initialize event listeners when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else {
        initializeEventListeners();
    }
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // File input change listener
    const fileInput = document.getElementById('uploadFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }

    // Processing preference checkbox listeners
    ['processStems', 'processBpmKey', 'processInstruments', 'processChords', 'processBeatmap', 'processAutoTag', 'processConvertMp3'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', saveProcessingPreferences);
        }
    });
}

/**
 * Load processing preferences from localStorage and update UI checkboxes
 */
function loadProcessingPreferences() {
    document.getElementById('processStems').checked = localStorage.getItem(PREF_KEYS.stems) === 'true';
    document.getElementById('processBpmKey').checked = localStorage.getItem(PREF_KEYS.bpmKey) !== 'false'; // default true
    document.getElementById('processInstruments').checked = localStorage.getItem(PREF_KEYS.instruments) !== 'false'; // default true
    document.getElementById('processChords').checked = localStorage.getItem(PREF_KEYS.chords) !== 'false'; // default true
    document.getElementById('processBeatmap').checked = localStorage.getItem(PREF_KEYS.beatmap) !== 'false'; // default true
    document.getElementById('processAutoTag').checked = localStorage.getItem(PREF_KEYS.autoTag) !== 'false'; // default true
    document.getElementById('processConvertMp3').checked = localStorage.getItem(PREF_KEYS.convertMp3) === 'true'; // default false
}

/**
 * Save processing preferences to localStorage (only in upload mode)
 */
function saveProcessingPreferences() {
    const pendingUploadFiles = state.getPendingUploadFiles();

    // Only save if we're in upload mode (pendingUploadFiles has items)
    if (pendingUploadFiles.length > 0) {
        localStorage.setItem(PREF_KEYS.stems, document.getElementById('processStems').checked);
        localStorage.setItem(PREF_KEYS.bpmKey, document.getElementById('processBpmKey').checked);
        localStorage.setItem(PREF_KEYS.instruments, document.getElementById('processInstruments').checked);
        localStorage.setItem(PREF_KEYS.chords, document.getElementById('processChords').checked);
        localStorage.setItem(PREF_KEYS.beatmap, document.getElementById('processBeatmap').checked);
        localStorage.setItem(PREF_KEYS.autoTag, document.getElementById('processAutoTag').checked);
        localStorage.setItem(PREF_KEYS.convertMp3, document.getElementById('processConvertMp3').checked);
    }
}

/**
 * Open upload flow - trigger file picker
 */
export function openUploadFlow() {
    const fileInput = document.getElementById('uploadFileInput');
    fileInput.value = ''; // Reset
    fileInput.click();
}

/**
 * Handle file selection from file input
 * @param {Event} e - Change event from file input
 */
function handleFileSelection(e) {
    if (e.target.files && e.target.files.length > 0) {
        state.setPendingUploadFiles(Array.from(e.target.files));
        openUploadTagModal();
    }
}

/**
 * Open tag modal for upload
 * Configures the modal for upload mode with processing options
 */
function openUploadTagModal() {
    const pendingUploadFiles = state.getPendingUploadFiles();
    const modal = document.getElementById('editTagsModal');
    const modalFileCount = document.getElementById('modalFileCount');
    const tagInput = document.getElementById('tagInputField');
    const saveBtn = document.querySelector('.modal-btn-save');
    const processingOptions = document.getElementById('processingOptions');

    // Update header
    modalFileCount.textContent = `(${pendingUploadFiles.length} file${pendingUploadFiles.length > 1 ? 's' : ''} to upload)`;

    // Change button text to "Upload"
    saveBtn.textContent = 'Upload';

    // Show processing options (upload mode)
    processingOptions.style.display = 'block';

    // Change title and note for upload mode
    document.getElementById('processingOptionsTitle').textContent = 'Auto-Processing Options:';
    document.getElementById('processingNote').innerHTML = '<p style="margin: 0; font-size: 11px; color: #888; line-height: 1.4;"><strong>Note:</strong> Your selections are saved and will be remembered for next time.</p>';

    // Load saved preferences from localStorage
    loadProcessingPreferences();

    // Clear tag state (using setters from tagEditModal.js)
    TagEditModal.setModalTags(new Map());
    TagEditModal.setModalTagsToAdd(new Set());
    TagEditModal.setModalTagsToRemove(new Set());
    TagEditModal.setSelectedModalTag(null);

    // Render empty tags (user will add what they want)
    state.renderModalTags();

    modal.classList.add('active');
    setTimeout(() => tagInput.focus(), 100);
}
