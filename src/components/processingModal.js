/**
 * Processing Modal Component
 * Handles modal for file processing (stems separation, BPM/Key detection, etc.)
 * Used by both Edit Files button and Stems icon gear button
 */

// Track which file is being processed from the stems icon
let stemsIconFileId = null;

// CSS Styles for modal
const processingModalStyles = `
    /* Edit Tags Modal */
    .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 2000;
        align-items: center;
        justify-content: center;
    }

    .modal-overlay.active {
        display: flex;
    }

    .modal-content {
        background: #1a1a1a;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid #2a2a2a;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .modal-header h2 {
        margin: 0;
        color: #fff;
        font-size: 1.5em;
    }

    .modal-close {
        background: transparent;
        border: none;
        color: #999;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .modal-close:hover {
        background: #2a2a2a;
        color: #fff;
    }

    .tag-input-container {
        background: #2a2a2a;
        border: 1px solid #3a3a3a;
        border-radius: 6px;
        padding: 10px;
        min-height: 80px;
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: flex-start;
    }

    .tag-pill-editable {
        padding: 6px 12px;
        background: #3a3a3a;
        color: #ccc;
        border: 1px solid #4a4a4a;
        border-radius: 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .tag-pill-editable:hover {
        background: #4a4a4a;
    }

    .tag-pill-editable.selected {
        background: #4a9eff;
        border-color: #4a9eff;
        color: white;
    }

    .tag-pill-editable .count {
        background: #2a2a2a;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 11px;
    }

    .tag-input-field {
        flex: 1;
        min-width: 150px;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 14px;
        outline: none;
        padding: 6px;
    }

    .tag-suggestions {
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 6px;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 15px;
    }

    .tag-suggestion-item {
        padding: 10px 15px;
        cursor: pointer;
        transition: all 0.2s;
        color: #ccc;
        font-size: 14px;
    }

    .tag-suggestion-item:hover {
        background: #2a2a2a;
        color: #fff;
    }

    .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
    }

    .modal-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .modal-btn-cancel {
        background: #555;
        color: white;
    }

    .modal-btn-cancel:hover {
        background: #666;
    }

    .modal-btn-save {
        background: #10b981;
        color: white;
    }

    .modal-btn-save:hover {
        background: #059669;
    }

    @media (max-width: 768px) {
        .modal-content {
            width: 100%;
            max-width: 100%;
            height: 100vh;
            max-height: 100vh;
            padding: 15px;
            border-radius: 0;
            overflow-y: auto;
        }
    }
`;

/**
 * Inject CSS styles into the document
 */
function injectProcessingModalStyles() {
    if (!document.getElementById('processingModalStyles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'processingModalStyles';
        styleEl.textContent = processingModalStyles;
        document.head.appendChild(styleEl);
    }
}

/**
 * Create the processing modal HTML structure
 */
function createProcessingModalHTML() {
    const modalHTML = `
        <!-- Edit Files Modal -->
        <div class="modal-overlay" id="editTagsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Files <span id="modalFileCount" style="color: #999; font-size: 0.8em;"></span></h2>
                    <button class="modal-close" onclick="closeEditTagsModal()">&times;</button>
                </div>

                <!-- Tags Section -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ccc; font-size: 13px; font-weight: 600; margin-bottom: 8px;">Tags:</label>
                    <div class="tag-input-container" id="tagInputContainer">
                        <input type="text" class="tag-input-field" id="tagInputField" placeholder="Type to add tags...">
                    </div>
                    <div class="tag-suggestions" id="tagSuggestions" style="display: none;"></div>
                </div>

                <!-- BPM and Key Section -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; color: #ccc; font-size: 13px; font-weight: 600; margin-bottom: 8px;">BPM:</label>
                        <input type="text" id="modalBpmInput" placeholder="e.g., 120 or 97.833"
                               style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; color: #ccc; font-size: 13px; font-weight: 600; margin-bottom: 8px;">Key:</label>
                        <select id="modalKeyInput" style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 14px; cursor: pointer;">
                            <option value="">-- Select Key --</option>
                            <option value="Cmaj/Amin">Cmaj/Amin</option>
                            <option value="C#maj/A#min">C#maj/A#min</option>
                            <option value="Dmaj/Bmin">Dmaj/Bmin</option>
                            <option value="D#maj/Cmin">D#maj/Cmin</option>
                            <option value="Emaj/C#min">Emaj/C#min</option>
                            <option value="Fmaj/Dmin">Fmaj/Dmin</option>
                            <option value="F#maj/D#min">F#maj/D#min</option>
                            <option value="Gmaj/Emin">Gmaj/Emin</option>
                            <option value="G#maj/Fmin">G#maj/Fmin</option>
                            <option value="Amaj/F#min">Amaj/F#min</option>
                            <option value="A#maj/Gmin">A#maj/Gmin</option>
                            <option value="Bmaj/G#min">Bmaj/G#min</option>
                        </select>
                    </div>
                </div>

                <!-- Processing Options Section -->
                <div id="processingOptions" style="display: none; margin-bottom: 20px; padding: 15px; background: #252525; border: 1px solid #3a3a3a; border-radius: 8px;">
                    <label style="display: block; color: #ccc; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
                        <span id="processingOptionsTitle">Auto-Processing Options:</span>
                    </label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processStems" style="width: 16px; height: 16px; cursor: pointer;">
                            <span>Split Stems</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processBpmKey" checked style="width: 16px; height: 16px; cursor: pointer;">
                            <span>BPM/Key Detection</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processInstruments" checked style="width: 16px; height: 16px; cursor: pointer;">
                            <span>Instruments</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processChords" checked style="width: 16px; height: 16px; cursor: pointer;">
                            <span>Chords</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processBeatmap" checked style="width: 16px; height: 16px; cursor: pointer;">
                            <span>Beatmap</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processAutoTag" checked style="width: 16px; height: 16px; cursor: pointer;">
                            <span>Auto-Tag</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ddd; font-size: 13px;">
                            <input type="checkbox" id="processConvertMp3" style="width: 16px; height: 16px; cursor: pointer;">
                            <span>Convert to MP3</span>
                        </label>
                    </div>
                    <div id="processingNote" style="margin-top: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px;">
                        <p style="margin: 0; font-size: 11px; color: #888; line-height: 1.4;">
                            <strong>Note:</strong> Your selections are saved and will be remembered for next time.
                        </p>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" onclick="closeEditTagsModal()">Cancel</button>
                    <button class="modal-btn modal-btn-save" onclick="handleSaveEditedTags()">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    return modalHTML;
}

/**
 * Initialize the processing modal component
 */
function initProcessingModal() {
    console.log('🔧 initProcessingModal called');
    injectProcessingModalStyles();
    console.log('✅ CSS styles injected');

    // Check if modal already exists
    if (!document.getElementById('editTagsModal')) {
        console.log('📝 Creating modal HTML and appending to DOM');
        // Create a container for the modal
        const modalContainer = document.createElement('div');
        modalContainer.id = 'processingModalContainer';
        modalContainer.innerHTML = createProcessingModalHTML();
        document.body.appendChild(modalContainer);
        console.log('✅ Modal HTML appended');
    } else {
        console.log('⚠️ Modal already exists, skipping creation');
    }

    // Make modal functions globally accessible
    window.processingModal = {
        openEditTagsModal: openEditTagsModal,
        closeEditTagsModal: closeEditTagsModal,
        handleSave: handleSaveEditedTags
    };
    console.log('✅ window.processingModal initialized:', window.processingModal);
    console.log('✅ window.openEditTagsModal available:', typeof window.openEditTagsModal);
}

/**
 * Open the processing modal
 * @param {string} context - Either 'edit' (for Edit Files button) or 'stems' (for gear icon)
 * @param {string} fileId - Optional file ID when opened from stems icon
 */
function openEditTagsModal(context = 'edit', fileId = null) {
    // Store the context and file ID
    stemsIconFileId = fileId;

    const modal = document.getElementById('editTagsModal');
    modal.classList.add('active');

    // Update modal title and count based on context
    const modalFileCount = document.getElementById('modalFileCount');

    if (context === 'stems' && fileId) {
        // When opened from stems icon, show which file will be processed
        // The file name will be updated based on the selected file
        modalFileCount.textContent = '(1 file)';

        // Pre-check only the stems checkbox
        document.getElementById('processStems').checked = true;
        document.getElementById('processBpmKey').checked = false;
        document.getElementById('processInstruments').checked = false;
        document.getElementById('processChords').checked = false;
        document.getElementById('processBeatmap').checked = false;
        document.getElementById('processAutoTag').checked = false;
        document.getElementById('processConvertMp3').checked = false;
    } else {
        // Edit mode - user can select multiple files
        const selectedCount = window.selectedFiles ? window.selectedFiles.size : 0;
        modalFileCount.textContent = selectedCount > 0 ? `(${selectedCount} files)` : '';
    }

    // Show processing options
    document.getElementById('processingOptions').style.display = 'block';
}

/**
 * Close the processing modal
 */
function closeEditTagsModal() {
    const modal = document.getElementById('editTagsModal');
    modal.classList.remove('active');
    stemsIconFileId = null;
}

/**
 * Handle save action from the modal
 * Delegates to the main app's saveEditedTags or processes stems only
 */
async function handleSaveEditedTags() {
    console.log('💾 handleSaveEditedTags called');
    console.log('📌 stemsIconFileId:', stemsIconFileId);

    if (stemsIconFileId) {
        console.log('🎯 Stems icon context detected - processing single file');
        // Stems icon context - only process this file with selected options
        const filesToUpdate = [stemsIconFileId];

        const shouldProcessStems = document.getElementById('processStems').checked;
        const shouldProcessBpmKey = document.getElementById('processBpmKey').checked;
        const shouldProcessInstruments = document.getElementById('processInstruments').checked;
        const shouldProcessChords = document.getElementById('processChords').checked;
        const shouldProcessBeatmap = document.getElementById('processBeatmap').checked;
        const shouldProcessAutoTag = document.getElementById('processAutoTag').checked;
        const shouldConvertMp3 = document.getElementById('processConvertMp3').checked;

        console.log('✔️ Processing options:', {
            stems: shouldProcessStems,
            bpmKey: shouldProcessBpmKey,
            instruments: shouldProcessInstruments,
            chords: shouldProcessChords,
            beatmap: shouldProcessBeatmap,
            autoTag: shouldProcessAutoTag,
            convertMp3: shouldConvertMp3
        });

        // Close modal
        closeEditTagsModal();

        // Check if any processing is selected
        const anyProcessing = shouldProcessBpmKey || shouldProcessInstruments || shouldProcessChords ||
                             shouldProcessBeatmap || shouldProcessStems || shouldProcessAutoTag || shouldConvertMp3;

        console.log('🔍 Any processing selected:', anyProcessing);
        console.log('🔍 window.runSelectedProcessing available:', typeof window.runSelectedProcessing);

        if (anyProcessing && window.runSelectedProcessing) {
            console.log('✅ Calling runSelectedProcessing with file IDs:', filesToUpdate);
            // Call the main app's processing function with just this file
            await window.runSelectedProcessing(filesToUpdate, {
                bpmKey: shouldProcessBpmKey,
                instruments: shouldProcessInstruments,
                chords: shouldProcessChords,
                beatmap: shouldProcessBeatmap,
                stems: shouldProcessStems,
                auto_tag: shouldProcessAutoTag,
                convert_to_mp3: shouldConvertMp3
            });
        } else {
            console.error('❌ Cannot proceed: anyProcessing=' + anyProcessing + ', runSelectedProcessing=' + (typeof window.runSelectedProcessing));
        }
    } else {
        console.log('📝 Edit mode detected - calling saveEditedTags');
        // Edit mode - call the main app's saveEditedTags function
        if (window.saveEditedTags) {
            await window.saveEditedTags();
        } else {
            console.error('❌ window.saveEditedTags not available!');
        }
    }
}

// Initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProcessingModal);
} else {
    initProcessingModal();
}

// Also ensure modal is available after a short delay to handle module loading order
setTimeout(() => {
    if (!window.processingModal) {
        console.log('⏲️ Delayed initialization - modal not available, initializing now');
        initProcessingModal();
    }
}, 100);
