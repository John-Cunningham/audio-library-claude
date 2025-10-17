# Next Session: Independent Speed/Pitch Controls

## Current State - STABLE BASELINE ✅

**Branch:** `experimental-v27-stem-independence`
**Commit:** `4071c10` - STEM-WRAPPERS (2025-10-16 18:46)
**Status:** ALL WORKING - Parent + Stems with Rate Controls

### What's Working
- ✅ Parent player with single RATE slider (chipmunk effect)
- ✅ Stem players with independent rate controls  
- ✅ Stem rate lock/unlock (follow parent or independent)
- ✅ All transport controls (play/pause/skip)
- ✅ All marker controls (bar markers, shift, frequency)
- ✅ Cycle mode with loop points
- ✅ Markers-disabled behavior (exact time clicks, 0.01s nudges)
- ✅ Keyboard shortcuts
- ✅ Everything stable and reliable

### What's NOT Included
- ❌ No independent speed/pitch control (chipmunk effect only)
- ❌ No dual speed/pitch sliders
- ❌ No Signalsmith integration

---

## Experimental Work Saved for Future

### Branch: `experimental-speed-pitch-save` (commit `75cd508`)
**Contains:** Dual SPEED/PITCH sliders with lock button, using WaveSurfer preservePitch API

**Problems:** preservePitch didn't work, stem controls broke

### Branch: `experimental-signalsmith-save` (commit `608774c`)  
**Contains:** Signalsmith integration for true independent time/pitch

**Problems:** Pause button doesn't stop audio, breaks stems, complex state management

---

## Goal: Add Optional Independent Speed/Pitch

**User Requirements:**
1. Stem rate controls MUST always work (priority #1)
2. Add optional independent speed/pitch (nice to have)
3. UI: Simple RATE slider by default + optional button to reveal advanced controls

---

## Key Lessons Learned

**What Didn't Work:**
1. WaveSurfer `setPlaybackRate(speed, preservePitch)` - Docs say it works, but still got chipmunk
2. Signalsmith toggle - Pause button broke, state management issues
3. Three sliders at once - Too confusing

**What Worked:**
- Slider synchronization (moving one moves the other when locked)
- Lock button visual states (🔗 green vs 🔓 gray)
- Signalsmith core functionality (when it worked, it was perfect)

**To Try Next:** MediaElement backend instead of WebAudio for preservePitch

---

**Last Updated:** 2025-10-16 22:00
