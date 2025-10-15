/*
  Standalone Multi-Stem Player Module
  - Lightweight wrapper around WaveSurfer.js v7 to render up to 4 stacked stem bars
  - No dependency on your monolithic visualizer; safe to drop into any HTML
  - Expects a bottom player height of ~100px; tweak CSS var --multi-stem-height if needed

  Usage:
    <link rel="stylesheet" href="./modular-multi-stem/multi-stem.css" />
    <script src="https://unpkg.com/wavesurfer.js@7"></script>
    <script type="module">
      import MultiStemPlayer from './modular-multi-stem/multi-stem-player.js'
      const multiStems = new MultiStemPlayer({ containerId: 'multiStemPlayer' })
      await multiStems.loadStems([
        { name: 'Drums', file_url: 'url1' },
        { name: 'Bass', file_url: 'url2' },
      ])
      multiStems.show()
    </script>
*/

export default class MultiStemPlayer {
  constructor({ containerId = 'multiStemPlayer', collapsed = true } = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId) || this.#createContainer(containerId)
    this.expanded = !collapsed
    this.bars = []
    this.players = []

    // CSS root var controls total height when expanded
    document.documentElement.style.setProperty('--multi-stem-height', '280px')

    // Start collapsed
    this.collapse()
  }

  #createContainer(id) {
    const el = document.createElement('div')
    el.id = id
    el.className = 'multi-stem-player'
    document.body.appendChild(el)
    return el
  }

  async loadStems(stems) {
    // Cleanup previous
    this.clear()

    if (!Array.isArray(stems) || stems.length === 0) {
      this.hide()
      return
    }

    // Show container
    this.container.style.display = 'block'

    // Limit to 4 stems for now
    const limited = stems.slice(0, 4)

    // Build bars
    for (const stem of limited) {
      const bar = this.#createStemBar(stem.name || 'Stem')
      this.container.appendChild(bar)

      const ws = WaveSurfer.create({
        container: bar.querySelector('.stem-waveform'),
        waveColor: '#3a86ff',
        progressColor: '#a8dadc',
        barWidth: 2,
        cursorWidth: 0,
        height: 48,
        normalize: true,
      })
      try {
        ws.load(stem.file_url)
      } catch (e) {
        console.warn('Stem failed to start loading', stem, e)
      }

      ws.on('error', (err) => {
        console.error('WaveSurfer error for stem', stem?.name, err)
        const info = bar.querySelector('.stem-info')
        if (info) info.textContent = `${this.#escape(stem?.name || 'Stem')} (failed to load)`
        bar.querySelector('.stem-play').disabled = true
      })

      // Wire controls
      bar.querySelector('.stem-play').onclick = () => ws.playPause()
      const vol = bar.querySelector('.stem-volume')
      vol.oninput = (e) => ws.setVolume(Number(e.target.value))

      this.players.push(ws)
      this.bars.push(bar)
    }

    // Keep collapsed initial state
    this.expanded ? this.expand() : this.collapse()
  }

  #createStemBar(label) {
    const bar = document.createElement('div')
    bar.className = 'stem-player-bar'
    bar.innerHTML = `
      <button class="stem-play" title="Play/Pause">▶</button>
      <div class="stem-waveform"></div>
      <div class="stem-info">${this.#escape(label)}</div>
      <input class="stem-volume" type="range" min="0" max="1" step="0.01" value="1" />
    `
    return bar
  }

  #escape(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))
  }

  show() {
    document.body.classList.add('multi-stem-active')
    this.container.style.display = 'block'
    // remain collapsed/expanded per state
  }

  hide() {
    document.body.classList.remove('multi-stem-active')
    this.container.style.display = 'none'
  }

  expand() {
    this.expanded = true
    this.container.classList.remove('collapsed')
  }

  collapse() {
    this.expanded = false
    this.container.classList.add('collapsed')
  }

  toggleExpand() {
    this.expanded ? this.collapse() : this.expand()
  }

  clear() {
    // Destroy wavesurfer instances
    for (const ws of this.players) {
      try { ws.destroy() } catch {}
    }
    this.players = []
    this.bars = []

    // Remove children
    this.container.innerHTML = ''
  }
}
