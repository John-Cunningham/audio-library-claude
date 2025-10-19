# Critical Fixes Needed for Galaxy View

## 1. Audio Reactivity Not Working
**Problem**: `connectToWavesurfer()` isn't properly connecting to the audio chain
**Solution**: Need to properly get audio context and connect analyser

## 2. Missing Essential Controls (26 total)

### HIGH PRIORITY (affects visual layout):
- **X-Axis Scale** - Controls horizontal spread
- **Y-Axis Scale** - Controls vertical spread
- **Z-Axis Scale** - Controls depth spread
- **Motion Toggle** - Enable/disable rotation

### MEDIUM PRIORITY (fine-tuning):
- **Sub-Particle Size** - Size of orbit particles
- **Main/Sub Ratio** - Size difference between center and orbit
- **Sub-Particle Distance** - Orbit radius
- **Sub-Particle Speed** - Orbit animation speed
- **Frequency Mode** - Select bass/mids/highs for audio

### LOW PRIORITY (advanced features):
- Size Gradient (0-2 range)
- Density Gradient (0-1 range)
- Hover Speed & Scale
- Motion Path dropdown
- Cluster Shape dropdown
- Advanced preset management

## 3. Current Implementation Issues

### Working ✅:
- Particle Size (but only one instance, need duplicate with different IDs)
- Brightness
- Visibility Distance
- Cluster Spread
- Particles per Cluster
- Bloom/Glow

### Not Working ❌:
- Audio Reactivity sliders (no visual effect)
- Many controls missing entirely

## Next Steps

1. **Fix Audio Connection** - Update `connectToWavesurfer()` to properly connect
2. **Add Missing Critical Sliders** - At minimum: X/Y/Z scales, Motion toggle
3. **Test Everything** - Use browser automation if needed
4. **Add Remaining Controls** - Based on user needs