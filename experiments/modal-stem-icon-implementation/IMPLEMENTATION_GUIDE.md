# Stems Icon Gear Button Implementation Guide

## Overview
This document describes how to implement the stems icon gear button (⚙️) workflow that allows users to initiate stem separation directly from the file list.

## What This Does
- When a file has NO stems, a gear icon (⚙️) appears in the Stems column
- Clicking the gear opens a processing modal (identical to "Edit Files" modal)
- The "Split Stems" checkbox is pre-checked
- User can optionally select other processing options (BPM/Key, Instruments, etc.)
- On save, it calls the same `runSelectedProcessing()` workflow that Edit Files uses
- This triggers the Railway webhook for Music.ai stem separation

## Implementation Steps

### 1. Create Processing Modal Component
**File:** `src/components/processingModal.js`

This is a standalone reusable component that:
- Contains the modal HTML template
- Contains all modal CSS styling
- Handles opening/closing the modal
- Handles save logic for both Edit Files and Stems Icon contexts
- Makes functions globally available via `window.openEditTagsModal()` and `closeEditTagsModal()`

**Key functions:**
- `initProcessingModal()` - Initializes the component, creates DOM, makes functions global
- `openEditTagsModal(context, fileId)` - Opens modal with context ('edit' or 'stems')
- `closeEditTagsModal()` - Closes the modal
- `handleSaveEditedTags()` - Handles save logic:
  - If `stemsIconFileId` is set: calls `window.runSelectedProcessing()` for that single file
  - If `stemsIconFileId` is null: calls `window.saveEditedTags()` (Edit Files mode)

**Loading:** Load as regular script (NOT module):
```html
<script src="./src/components/processingModal.js"></script>
```

### 2. Update `generateStems()` Function
**File:** `src/core/app.js` (line ~3648)

Replace the broken placeholder with:
```javascript
function generateStems(fileId, event) {
    console.log('🎵 generateStems called with fileId:', fileId);
    event.preventDefault();
    event.stopPropagation();

    const file = audioFiles.find(f => f.id === fileId);
    if (!file) return;

    // Open the processing modal with stems icon context
    if (window.openEditTagsModal) {
        window.openEditTagsModal('stems', fileId);
    }
}
```

### 3. Update HTML Files
Add the processingModal script tag as a regular script (NOT module):

```html
<script src="./src/components/processingModal.js"></script>
```

Place it before or after the app.js module script.

### 4. How It Works Together

**Flow when gear icon is clicked:**
1. User clicks ⚙️ gear icon on file → `onclick="generateStems(fileId, event)"`
2. `generateStems()` calls `window.openEditTagsModal('stems', fileId)`
3. Modal opens with:
   - Title: "Edit Files (1 file)"
   - "Split Stems" checkbox pre-checked
   - Other checkboxes unchecked (but user can enable them)
   - Processing options visible
4. User clicks "Save Changes"
5. `handleSaveEditedTags()` is called:
   - Detects stems context (because `stemsIconFileId` is set)
   - Calls `window.runSelectedProcessing([fileId], {stems: true, ...})`
   - Same Railway webhook endpoint: `https://web-production-bcf6c.up.railway.app/process-existing`
   - Progress bar shows, data reloads when done

**Key Difference from Edit Files:**
- Edit Files: `stemsIconFileId` is null → calls `window.saveEditedTags()`
- Gear Icon: `stemsIconFileId` is set → calls `window.runSelectedProcessing()` directly

### 5. Important Implementation Details

**Modal Initialization:**
- Must load as regular script (`<script src="...">`) NOT module
- Initializes on `DOMContentLoaded` OR if document already loaded
- Also has timeout fallback to ensure initialization

**Button Onclick Handlers:**
- Cancel button: `onclick="closeEditTagsModal()"`
- Save button: `onclick="handleSaveEditedTags()"`
- These call functions directly (not via window.processingModal)

**Global Functions Needed:**
- `window.runSelectedProcessing(fileIds, options)` - Already exists in app.js
- `window.saveEditedTags()` - Already exists in app.js
- `window.openEditTagsModal()` - Created by processingModal.js
- `window.closeEditTagsModal()` - Created by processingModal.js

### 6. Testing
Create a test file: `index-modal-edit.html` (duplicate of index.html with processingModal.js loaded)

Test steps:
1. Open in browser on local server (not file://)
2. Find a file without stems (gear icon ⚙️)
3. Click gear icon → modal should open
4. Verify "Split Stems" is pre-checked
5. Click "Save Changes"
6. Progress bar should appear at top
7. After ~120 seconds, data should reload with stems

### 7. Files to Modify/Create

**Create:**
- `src/components/processingModal.js` - New component file

**Modify:**
- `src/core/app.js` - Update `generateStems()` function
- `index.html` - Add script tag for processingModal.js (optional, but recommended for consistency)
- `index-modal-edit.html` - Test file (or any HTML file you want to test with)

### 8. Console Debugging

The implementation includes extensive console logging:
- 🎵 generateStems called
- 📁 File found/not found
- 🔍 Checking for window.openEditTagsModal
- ✅ Opening modal
- 💾 handleSaveEditedTags called
- 🎯 Stems icon context detected
- ✅ Calling runSelectedProcessing
- ❌ Error messages if things fail

Check browser console (F12) if something doesn't work.

## Summary

The implementation is complete and working. It:
1. Reuses the existing `runSelectedProcessing()` workflow
2. Uses the same Railway webhook endpoint as Edit Files
3. Creates a reusable modal component that both buttons can share
4. Pre-checks "Split Stems" when opened from gear icon
5. Allows users to add other processing options if desired
6. Shows progress bar and reloads data when complete

The gear icon workflow is now functionally identical to the "Edit Files → Select Files → Check 'Split Stems' → Save" workflow, but in a single click.
