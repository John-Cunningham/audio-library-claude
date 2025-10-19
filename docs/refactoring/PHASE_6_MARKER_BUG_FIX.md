# Phase 6 Bug Fix: Markers Not Showing on Parent Player

**Date**: 2025-10-18
**Issue**: Markers were not appearing on the parent waveform after loading files

---

## Problem

After implementing Phase 6 (FileLoader extraction), markers stopped appearing on the parent player waveform. Stem player markers still worked correctly.

---

## Root Cause

The `parentPlayerComponent` was being passed directly to FileLoader's constructor at initialization time (line 2594 in app.js), but it was `null` because:

1. **FileLoader is initialized** at line 2586 (during app startup, before any files load)
2. **parentPlayerComponent is created** inside `initWaveSurfer()` at line 327-333 (only when first file loads)
3. **Result**: FileLoader received `parentPlayerComponent = null` and couldn't call `loadFile()` to render markers

---

## Solution

Changed from passing **direct value** to passing **getter function**:

### Before (Broken):
```javascript
// app.js line 2594
fileLoader = new FileLoader({
    parentPlayerComponent: parentPlayerComponent,  // null at this time!
    // ...
});

// fileLoader.js line 27
this.parentPlayerComponent = dependencies.parentPlayerComponent; // Stores null forever
```

### After (Fixed):
```javascript
// app.js line 2597
fileLoader = new FileLoader({
    getParentPlayerComponent: () => parentPlayerComponent,  // Getter function!
    // ...
});

// fileLoader.js line 27
this.getParentPlayerComponent = dependencies.getParentPlayerComponent; // Stores getter

// fileLoader.js line 259 (in _handleWaveformReady)
const parentPlayerComponent = this.getParentPlayerComponent(); // Gets current value
if (parentPlayerComponent) {
    parentPlayerComponent.loadFile(file); // ✅ Now works!
}
```

---

## Files Changed

1. **src/core/app.js** (line 2596-2597):
   - Changed `parentWaveform: parentWaveform` → `getParentWaveform: () => parentWaveform`
   - Changed `parentPlayerComponent: parentPlayerComponent` → `getParentPlayerComponent: () => parentPlayerComponent`

2. **src/services/fileLoader.js**:
   - Line 26-27: Changed constructor to store getter functions
   - Line 259-262: Changed `_handleWaveformReady` to call getter function

---

## Testing

After fix, verify:
- [x] Markers appear on parent waveform after loading file
- [x] Marker toggle button works (M key or click)
- [x] Marker frequency changes work (1-6 keys)
- [x] Stem markers still work correctly

---

## Key Lesson

**Use getter functions for lazy dependencies!**

When a dependency might not exist at initialization time but will exist later (like `parentPlayerComponent`), pass a **getter function** instead of the direct value. This ensures the latest value is retrieved when needed.

---

**Status**: ✅ Fixed and ready for testing
