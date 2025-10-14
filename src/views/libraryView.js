// Library View Component - File list display
import { state } from '../core/state.js';
import { fetchAudioFiles, hasStems } from '../core/supabase.js';

export class LibraryView {
    constructor() {
        this.allFiles = [];
        this.currentFileIndex = -1;
    }

    async init() {
        await this.loadFiles();
        this.setupEventListeners();
        console.log('Library view initialized');
    }

    async loadFiles() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        fileList.innerHTML = '<div class="empty-state"><div>Loading audio files...</div></div>';

        const files = await fetchAudioFiles();
        this.allFiles = files;

        if (files.length === 0) {
            fileList.innerHTML = '<div class="empty-state"><div>No audio files found</div></div>';
            this.updateFileCount(0);
            return;
        }

        fileList.innerHTML = '';

        for (const file of files) {
            const item = this.createFileItem(file);
            fileList.appendChild(item);
        }

        this.updateFileCount(files.length);
    }

    createFileItem(file) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.fileId = file.id;

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.minWidth = '0';

        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = file.name || file.filename || 'Untitled';

        const tags = document.createElement('div');
        tags.className = 'file-tags';

        // Add metadata tags
        if (file.bpm) {
            const bpmTag = document.createElement('span');
            bpmTag.className = 'file-tag';
            bpmTag.textContent = file.bpm + ' BPM';
            tags.appendChild(bpmTag);
        }

        if (file.key) {
            const keyTag = document.createElement('span');
            keyTag.className = 'file-tag';
            keyTag.textContent = file.key;
            tags.appendChild(keyTag);
        }

        infoDiv.appendChild(name);
        infoDiv.appendChild(tags);
        item.appendChild(infoDiv);

        // Check for stems and add icon
        hasStems(file.id).then(hasS => {
            if (hasS) {
                const stemsIcon = document.createElement('span');
                stemsIcon.className = 'stems-icon';
                stemsIcon.textContent = '🎵';
                stemsIcon.title = 'Has stems';
                item.appendChild(stemsIcon);
            }
        });

        item.addEventListener('click', () => {
            this.loadFile(file);
        });

        return item;
    }

    loadFile(file) {
        const index = this.allFiles.findIndex(f => f.id === file.id);
        if (index !== -1) {
            this.currentFileIndex = index;
        }

        // Update UI
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.toggle('active', item.dataset.fileId == file.id);
        });

        // Emit event for other components to handle
        state.emit('fileSelected', file);

        console.log('File selected:', file.name || file.filename);
    }

    setupEventListeners() {
        // Listen for prev/next track events
        state.on('prevTrack', () => {
            this.previousTrack();
        });

        state.on('nextTrack', () => {
            this.nextTrack();
        });

        // Setup button listeners
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deselectAllBtn = document.getElementById('deselectAllBtn');

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                console.log('TODO: Implement select all');
            });
        }

        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                console.log('TODO: Implement deselect all');
            });
        }
    }

    previousTrack() {
        if (this.allFiles.length === 0) return;

        this.currentFileIndex--;
        if (this.currentFileIndex < 0) {
            this.currentFileIndex = this.allFiles.length - 1; // Wrap to end
        }

        this.loadFile(this.allFiles[this.currentFileIndex]);
    }

    nextTrack() {
        if (this.allFiles.length === 0) return;

        this.currentFileIndex++;
        if (this.currentFileIndex >= this.allFiles.length) {
            this.currentFileIndex = 0; // Wrap to start
        }

        this.loadFile(this.allFiles[this.currentFileIndex]);
    }

    updateFileCount(count) {
        const fileCount = document.getElementById('fileCount');
        if (fileCount) {
            fileCount.textContent = `(${count})`;
        }
    }

    show() {
        const libraryView = document.getElementById('libraryView');
        if (libraryView) {
            libraryView.style.display = 'block';
        }
    }

    hide() {
        const libraryView = document.getElementById('libraryView');
        if (libraryView) {
            libraryView.style.display = 'none';
        }
    }
}
