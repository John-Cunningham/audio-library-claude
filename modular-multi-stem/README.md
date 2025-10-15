Multi-Stem Player Module (Standalone)

Files in this folder:
- multi-stem-player.js: JS module exporting class MultiStemPlayer
- multi-stem.css: styles for the stacked stems UI

Quick usage:
1) Add the following to your HTML:

<head>
  <link rel="stylesheet" href="./modular-multi-stem/multi-stem.css" />
  <script src="https://unpkg.com/wavesurfer.js@7"></script>
</head>
<body>
  <div id="multiStemPlayer" class="multi-stem-player"></div>
  <script type="module">
    import MultiStemPlayer from './modular-multi-stem/multi-stem-player.js'
    const multiStems = new MultiStemPlayer({ containerId: 'multiStemPlayer' })
    await multiStems.loadStems([
      { name: 'Drums',  file_url: 'https://example.com/drums.mp3' },
      { name: 'Bass',   file_url: 'https://example.com/bass.mp3' },
    ])
    multiStems.show()
  </script>
</body>

Wiring a button:
- Any button can toggle expand/collapse by calling: window.multiStems.toggleExpand()

Styling note:
- The container sits above a 100px bottom player. Adjust bottom and --multi-stem-height as needed.
