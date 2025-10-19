# Modal Stem Icon Implementation - Complete Handoff Guide

## Overview
This guide provides everything needed to implement the stems icon gear button (⚙️) workflow in a future session. All code is included inline.

## Branch Note
**IMPORTANT:** This implementation was developed on `experimental-v27-stem-independence` branch. If starting fresh, create a new branch for this feature.

## Files Involved

### 1. NEW FILE: `src/components/processingModal.js`
**Action:** Create this NEW file with the exact content below.

This is a complete, standalone reusable modal component that:
- Creates the modal HTML dynamically
- Injects all CSS styling
- Handles open/close logic
- Handles save logic for both Edit Files and Gear Icon contexts

See `processingModal.js` in this folder for the complete file content.

---

### 2. MODIFY: `src/core/app.js`
**Action:** Find and replace the `generateStems()` function

**Find this section (around line 3648):**
```javascript
        // Generate stems for a file
        function generateStems(fileId, event) {
            event.preventDefault();
            event.stopPropagation();

            const file = audioFiles.find(f => f.id === fileId);
            if (!file) return;

            // Show confirmation dialog
            if (!confirm(`Generate stems for "${file.name}"?\n\nThis will create 4 separate stem files (vocals, bass, drums, other) using the Demucs separation model. The process may take several minutes.`)) {
                return;
            }

            // TODO: Implement stem generation via Railway webhook
            alert('Stem generation will be implemented with Railway webhook integration.');
        }
```

**Replace it with:**
```javascript
        // Generate stems for a file
        function generateStems(fileId, event) {
            console.log('🎵 generateStems called with fileId:', fileId);
            event.preventDefault();
            event.stopPropagation();

            const file = audioFiles.find(f => f.id === fileId);
            console.log('📁 File found:', file?.name || 'NOT FOUND');
            if (!file) {
                console.warn('⚠️ File not found for ID:', fileId);
                return;
            }

            // Open the processing modal with stems icon context
            // This will pre-check the "Split Stems" checkbox and allow user to add other processing options
            console.log('🔍 Checking for window.openEditTagsModal:', typeof window.openEditTagsModal);
            if (window.openEditTagsModal) {
                console.log('✅ Opening modal with stems context');
                window.openEditTagsModal('stems', fileId);
            } else {
                console.error('❌ window.openEditTagsModal is not available!');
            }
        }
```

---

### 3. MODIFY: `index.html`
**Action:** Add the processingModal script tag

**Find this section (around line 1380-1381):**
```html
    <script type="module" src="./src/core/app.js"></script>
    <script type="module">
```

**Change to:**
```html
    <script type="module" src="./src/core/app.js"></script>
    <script src="./src/components/processingModal.js"></script>
    <script type="module">
```

**Key Point:** Load processingModal.js as a regular script (NOT a module). This ensures it initializes before app.js tries to use it.

---

## How It Works

### User Flow
1. User finds a file without stems (⚙️ gear icon visible)
2. Clicks the gear icon
3. `onclick="generateStems(fileId, event)"` → calls `generateStems()` in app.js
4. `generateStems()` calls `window.openEditTagsModal('stems', fileId)`
5. Modal opens (identical to Edit Files modal):
   - Shows "Edit Files (1 file)"
   - "Split Stems" checkbox is PRE-CHECKED
   - Other checkboxes are UNCHECKED (but user can enable them)
   - Processing options visible
6. User clicks "Save Changes"
7. `handleSaveEditedTags()` is called:
   - Detects stems context (because `stemsIconFileId` is set)
   - Calls `window.runSelectedProcessing([fileId], {stems: true, ...})`
8. Same Railway webhook is triggered as Edit Files workflow
9. Progress bar appears, data reloads when complete

### Key Implementation Details

**Why Regular Script vs Module?**
- `processingModal.js` needs to be loaded synchronously before app.js
- ES modules are async and may not initialize in time
- Regular scripts execute immediately when parsed

**Modal Initialization:**
- Runs on `DOMContentLoaded` if DOM not ready
- Has fallback timeout to ensure availability
- Makes functions globally available: `window.openEditTagsModal()`, `closeEditTagsModal()`

**Context Tracking:**
- Variable `stemsIconFileId` tracks which file is being processed from gear icon
- If `stemsIconFileId` is set → stems context (single file)
- If `stemsIconFileId` is null → edit context (multiple selected files)

**Button Handlers:**
- Cancel: `onclick="closeEditTagsModal()"`
- Save: `onclick="handleSaveEditedTags()"`
- Close X: `onclick="closeEditTagsModal()"`

---

## Existing Functions Used (Already in app.js)

These functions already exist in your app.js and are used by the implementation:

1. **`window.runSelectedProcessing(fileIds, options)`** (app.js line ~987)
   - Handles all processing workflow
   - Calls Railway webhook
   - Shows progress bar
   - Reloads data when done

2. **`window.saveEditedTags()`** (app.js line ~890)
   - Original Edit Files save logic
   - Called when modal is in edit mode (not stems icon)

---

## Testing

### Option 1: Test with index-modal-edit.html
A test file exists (created during development):
```bash
# Test on local server
python3 -m http.server 5501
# Open: http://localhost:5501/index-modal-edit.html
```

### Option 2: Test with your production index.html
After making the changes above, test directly:
1. Run local server
2. Find a file without stems (⚙️ icon)
3. Click the gear icon
4. Modal should open with "Split Stems" pre-checked
5. Click "Save Changes"
6. Progress bar should appear at top
7. After ~120 seconds, stems should be ready

### Console Debugging
The implementation includes extensive console logging. Open browser console (F12) and look for:
- 🎵 generateStems called with fileId
- 📁 File found
- 🔍 Checking for window.openEditTagsModal
- ✅ Opening modal with stems context
- 💾 handleSaveEditedTags called
- 🎯 Stems icon context detected
- ✅ Calling runSelectedProcessing

---

## File Structure After Implementation

```
audio-library-claude/
├── index.html (MODIFIED - add processingModal script tag)
├── src/
│   ├── core/
│   │   └── app.js (MODIFIED - update generateStems function)
│   └── components/
│       └── processingModal.js (NEW FILE)
└── modal-stem-icon-implementation/ (This folder)
    ├── processingModal.js (Complete component file)
    ├── IMPLEMENTATION_HANDOFF.md (This file)
    └── IMPLEMENTATION_GUIDE.md (Reference guide)
```

---

## Common Issues & Debugging

### Issue: Modal doesn't open
- Check console for "❌ window.openEditTagsModal is not available!"
- Make sure `processingModal.js` is loaded BEFORE app.js tries to use it
- Verify script tag is regular script, not module

### Issue: Save button doesn't work
- Check console for "💾 handleSaveEditedTags called"
- Make sure button onclick is `onclick="handleSaveEditedTags()"` (NOT `onclick="window.processingModal.handleSave()"`)
- Verify functions are in global scope

### Issue: Progress bar doesn't appear
- Check console for "✅ Calling runSelectedProcessing with file IDs"
- Verify "Split Stems" checkbox is checked
- Check that `window.runSelectedProcessing` exists in app.js

### Issue: Nothing happens after clicking Save
- Most likely: Button onclick handler not calling the right function
- Check HTML in browser inspector to see actual onclick attribute
- Should be: `onclick="handleSaveEditedTags()"`

---

## Summary

This implementation:
1. ✅ Creates a reusable modal component
2. ✅ Reuses existing `runSelectedProcessing()` workflow
3. ✅ Uses same Railway webhook as Edit Files
4. ✅ Pre-checks "Split Stems" checkbox
5. ✅ Allows adding other processing options if desired
6. ✅ Shows progress bar and reloads data
7. ✅ Works seamlessly with existing Edit Files workflow

The gear icon (⚙️) is now a one-click alternative to: Edit Files → Select Files → Check Stems → Save.

---

## Questions for Future Session

When implementing this in the future, verify:
- [ ] Is the processingModal.js file in `src/components/`?
- [ ] Was generateStems() function updated in app.js?
- [ ] Was the script tag added to index.html?
- [ ] Is the script tag loading processingModal.js as regular script (not module)?
- [ ] Does the gear icon open the modal when clicked?
- [ ] Does the modal pre-check "Split Stems"?
- [ ] Does clicking Save show the progress bar?
- [ ] Do stems process via Railway webhook?
