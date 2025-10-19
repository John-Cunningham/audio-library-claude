# Modal Stem Icon Implementation

## Quick Start for Future Sessions

This folder contains everything needed to implement the stems icon gear button (⚙️) feature.

**Start here:** Read `IMPLEMENTATION_HANDOFF.md` - it has all the code changes with line numbers.

## Files in This Folder

1. **IMPLEMENTATION_HANDOFF.md** ⭐ START HERE
   - Complete handoff guide
   - All code changes with exact line numbers
   - Step-by-step implementation instructions
   - Debugging tips

2. **processingModal.js**
   - The complete new component file
   - Copy this to `src/components/processingModal.js` in your project
   - Includes all CSS, HTML template, and logic

3. **IMPLEMENTATION_GUIDE.md**
   - Reference guide (high-level overview)
   - Architecture details
   - How the system works

## What This Does

Clicking the ⚙️ gear icon (when file has no stems) opens a modal to initiate stem separation using Music.ai workflow.

## Implementation Summary

Three changes needed:
1. **NEW:** Create `src/components/processingModal.js` (file is in this folder)
2. **MODIFY:** Update `generateStems()` function in `src/core/app.js` (code in IMPLEMENTATION_HANDOFF.md)
3. **MODIFY:** Add script tag to `index.html` (code in IMPLEMENTATION_HANDOFF.md)

## Important Notes

- ⚠️ This was developed on `experimental-v27-stem-independence` branch
- Create a new feature branch for implementation
- Load `processingModal.js` as a regular script, NOT as a module
- All code is self-contained - no external dependencies

## Testing

After implementation:
1. Run local server: `python3 -m http.server 5501`
2. Find a file without stems (⚙️ icon in Stems column)
3. Click the gear icon
4. Modal opens with "Split Stems" pre-checked
5. Click "Save Changes"
6. Progress bar appears at top of screen
7. After ~120 seconds, stems should be ready

Check browser console (F12) for debug logs if something doesn't work.

## Need Help?

See "Common Issues & Debugging" section in IMPLEMENTATION_HANDOFF.md for troubleshooting.
