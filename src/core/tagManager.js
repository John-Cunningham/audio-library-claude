/**
 * Tag Management Module
 *
 * Handles all tag-related functionality including:
 * - Tag cloud rendering with filtering
 * - Tag click handling (canHave, mustHave, exclude modes)
 * - Active filter display
 * - Tag mode selection UI
 * - Show/hide low-count tags
 *
 * Usage:
 *   import * as TagManager from './tagManager.js';
 *
 *   TagManager.init(callbacks, state);
 *   TagManager.render(searchQuery);
 *   TagManager.handleClick(tag, event);
 */

// Callbacks to app.js functions
let renderFilesCallback = null;

// State getters/setters
let getAudioFiles = null;
let getFilters = null;
let getShowAllTags = null;
let setShowAllTags = null;
let getCurrentTagMode = null;
let setCurrentTagMode = null;
let getSearchQuery = null;
let setSearchQuery = null;

/**
 * Initialize tag manager with callbacks and state access
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.renderFiles - Render file list
 * @param {Object} state - State getters/setters
 * @param {Function} state.getAudioFiles - Get audio files array
 * @param {Function} state.getFilters - Get filters object
 * @param {Function} state.getShowAllTags - Get showAllTags boolean
 * @param {Function} state.setShowAllTags - Set showAllTags boolean
 * @param {Function} state.getCurrentTagMode - Get current tag mode
 * @param {Function} state.setCurrentTagMode - Set current tag mode
 * @param {Function} state.getSearchQuery - Get search query string
 * @param {Function} state.setSearchQuery - Set search query string
 */
export function init(callbacks, state) {
    renderFilesCallback = callbacks.renderFiles;

    getAudioFiles = state.getAudioFiles;
    getFilters = state.getFilters;
    getShowAllTags = state.getShowAllTags;
    setShowAllTags = state.setShowAllTags;
    getCurrentTagMode = state.getCurrentTagMode;
    setCurrentTagMode = state.setCurrentTagMode;
    getSearchQuery = state.getSearchQuery;
    setSearchQuery = state.setSearchQuery;

    console.log('[TagManager] Initialized');
}

/**
 * Get all unique tags with counts from audio files
 * @returns {Array<{tag: string, count: number}>} Sorted array of tags with counts
 */
export function getAllTags() {
    const audioFiles = getAudioFiles();
    const tagCounts = {};

    audioFiles.forEach(file => {
        file.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    // Sort by count (descending), then alphabetically
    return Object.entries(tagCounts)
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count
            return a[0].localeCompare(b[0]); // Then alphabetically
        })
        .map(([tag, count]) => ({ tag, count }));
}

/**
 * Get count for a specific tag in filtered file list
 * @param {string} tag - Tag to count
 * @param {Array} files - Files to count from
 * @returns {number} Count of files with this tag
 */
export function getTagCount(tag, files) {
    return files.filter(file => file.tags.includes(tag)).length;
}

/**
 * Handle tag click - add/remove from filters based on mode
 * @param {string} tag - Tag that was clicked
 * @param {Event} event - Click event (for modifier keys)
 */
export function handleClick(tag, event) {
    event.preventDefault();

    const filters = getFilters();
    const currentTagMode = getCurrentTagMode();

    // Clear search bar when clicking a tag
    setSearchQuery('');
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.value = '';

    // Determine mode: modifier keys override currentTagMode for desktop
    let mode = currentTagMode;
    if (event.altKey) {
        mode = 'exclude';
    } else if (event.shiftKey) {
        mode = 'mustHave';
    } else if (currentTagMode === null) {
        mode = 'canHave'; // Default to canHave if no mode selected
    }

    // Check if tag is already in this mode - if so, remove it
    const isAlreadyInMode =
        (mode === 'canHave' && filters.canHave.has(tag)) ||
        (mode === 'mustHave' && filters.mustHave.has(tag)) ||
        (mode === 'exclude' && filters.exclude.has(tag));

    // Remove from all filters first
    filters.canHave.delete(tag);
    filters.mustHave.delete(tag);
    filters.exclude.delete(tag);

    // If not already in mode, add it
    if (!isAlreadyInMode) {
        if (mode === 'canHave') {
            filters.canHave.add(tag);
        } else if (mode === 'mustHave') {
            filters.mustHave.add(tag);
        } else if (mode === 'exclude') {
            filters.exclude.add(tag);
        }
    }

    render();
    renderFilesCallback();
}

/**
 * Select all visible tags (respects search filter)
 */
export function selectAllVisible() {
    const allTags = getAllTags();
    const searchQuery = getSearchQuery();
    const filters = getFilters();

    // Filter tags by search query (same logic as render)
    const filteredTags = searchQuery
        ? allTags.filter(({ tag }) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        : allTags;

    // Add all filtered tags to CAN HAVE
    filteredTags.forEach(({ tag }) => {
        filters.canHave.add(tag);
    });

    // Clear search bar after selecting tags
    setSearchQuery('');
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.value = '';

    render();
    renderFilesCallback();
}

/**
 * Deselect all tags (clear all filters)
 */
export function deselectAll() {
    const filters = getFilters();

    filters.canHave.clear();
    filters.mustHave.clear();
    filters.exclude.clear();

    render();
    renderFilesCallback();
}

/**
 * Toggle showing all tags (including low-count ones)
 */
export function toggleShowAll() {
    const showAllTags = getShowAllTags();
    setShowAllTags(!showAllTags);
    render(getSearchQuery());
}

/**
 * Set tag mode (canHave, mustHave, exclude, or null to clear)
 * @param {string|null} mode - Mode to set ('canHave', 'mustHave', 'exclude', or null)
 */
export function setMode(mode) {
    const currentTagMode = getCurrentTagMode();

    // If clicking the same mode, deselect it
    if (currentTagMode === mode) {
        setCurrentTagMode(null);
    } else {
        setCurrentTagMode(mode);
    }

    const newMode = getCurrentTagMode();

    // Update button styles
    const canHaveBtn = document.getElementById('modeCanHave');
    const mustHaveBtn = document.getElementById('modeMustHave');
    const excludeBtn = document.getElementById('modeExclude');

    if (canHaveBtn) {
        canHaveBtn.style.background = newMode === 'canHave' ? '#3b82f6' : 'transparent';
        canHaveBtn.style.color = newMode === 'canHave' ? 'white' : '#3b82f6';
    }

    if (mustHaveBtn) {
        mustHaveBtn.style.background = newMode === 'mustHave' ? '#10b981' : 'transparent';
        mustHaveBtn.style.color = newMode === 'mustHave' ? 'white' : '#10b981';
    }

    if (excludeBtn) {
        excludeBtn.style.background = newMode === 'exclude' ? '#ef4444' : 'transparent';
        excludeBtn.style.color = newMode === 'exclude' ? 'white' : '#ef4444';
    }
}

/**
 * Update active filters display at top of tags section
 */
export function updateActiveFiltersDisplay() {
    const display = document.getElementById('activeFilters');
    if (!display) return;

    const filters = getFilters();
    const parts = [];

    if (filters.canHave.size > 0) {
        parts.push(`CAN HAVE: ${Array.from(filters.canHave).join(', ')}`);
    }
    if (filters.mustHave.size > 0) {
        parts.push(`MUST HAVE: ${Array.from(filters.mustHave).join(', ')}`);
    }
    if (filters.exclude.size > 0) {
        parts.push(`EXCLUDE: ${Array.from(filters.exclude).join(', ')}`);
    }

    display.textContent = parts.length > 0 ? parts.join(' | ') : 'No active filters';
}

/**
 * Render tags cloud with filtering and styling
 * @param {string} searchQuery - Optional search query to filter tags
 */
export function render(searchQuery = '') {
    const container = document.getElementById('tagsContainer');
    if (!container) {
        console.warn('[TagManager] Tags container not found');
        return;
    }

    const allTags = getAllTags();
    const filters = getFilters();
    const audioFiles = getAudioFiles();
    const showAllTags = getShowAllTags();

    if (allTags.length === 0) {
        container.innerHTML = '<div class="empty-state" style="width: 100%; padding: 20px;">No tags yet. Upload audio files with tags to get started.</div>';
        updateActiveFiltersDisplay();
        return;
    }

    // Filter tags by search query
    const filteredTags = searchQuery
        ? allTags.filter(({ tag }) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        : allTags;

    if (filteredTags.length === 0) {
        container.innerHTML = '<div class="empty-state" style="width: 100%; padding: 20px;">No tags match your search.</div>';
        return;
    }

    // Determine if we should show filtered counts
    // Only update counts if MUST HAVE or EXCLUDE filters are active (not CAN HAVE)
    const shouldShowFilteredCounts = filters.mustHave.size > 0 || filters.exclude.size > 0;

    let filesToCountFrom = audioFiles;
    if (shouldShowFilteredCounts) {
        // Get files that match MUST HAVE and EXCLUDE filters only
        filesToCountFrom = audioFiles.filter(file => {
            const fileTags = new Set(file.tags);

            // Check EXCLUDE - if file has any excluded tag, filter it out
            for (let tag of filters.exclude) {
                if (fileTags.has(tag)) return false;
            }

            // Check MUST HAVE - file must have ALL must-have tags
            for (let tag of filters.mustHave) {
                if (!fileTags.has(tag)) return false;
            }

            return true;
        });
    }

    // When searching, show all tags regardless of count
    // When not searching, separate high-count and low-count tags
    let html = '';

    if (searchQuery) {
        // Show all matching tags when searching
        html = filteredTags.map(({ tag, count }) => {
            let className = 'tag-button';
            if (filters.canHave.has(tag)) className += ' can-have';
            if (filters.mustHave.has(tag)) className += ' must-have';
            if (filters.exclude.has(tag)) className += ' exclude';

            const displayCount = shouldShowFilteredCounts
                ? getTagCount(tag, filesToCountFrom)
                : count;

            return `<button class="${className}" onclick="window.tagManagerHandleClick('${tag}', event)">${tag} (${displayCount})</button>`;
        }).join('');
    } else {
        // Not searching - separate by count
        const highCountTags = filteredTags.filter(({ count }) => count > 1);
        const lowCountTags = filteredTags.filter(({ count }) => count === 1);

        // Show high-count tags
        html = highCountTags.map(({ tag, count }) => {
            let className = 'tag-button';
            if (filters.canHave.has(tag)) className += ' can-have';
            if (filters.mustHave.has(tag)) className += ' must-have';
            if (filters.exclude.has(tag)) className += ' exclude';

            const displayCount = shouldShowFilteredCounts
                ? getTagCount(tag, filesToCountFrom)
                : count;

            return `<button class="${className}" onclick="window.tagManagerHandleClick('${tag}', event)">${tag} (${displayCount})</button>`;
        }).join('');

        // Add "more tags" pill if there are low-count tags
        if (lowCountTags.length > 0) {
            const icon = showAllTags ? '−' : '+';
            html += `<button class="tag-button more-tags" onclick="window.tagManagerToggleShowAll()" style="background: #2a2a2a; color: #fff; border: 2px solid #fff; font-weight: 600;">${lowCountTags.length} Tags (${icon})</button>`;
        }

        // Show low-count tags if showAllTags is true
        if (showAllTags && lowCountTags.length > 0) {
            html += lowCountTags.map(({ tag, count }) => {
                let className = 'tag-button';
                if (filters.canHave.has(tag)) className += ' can-have';
                if (filters.mustHave.has(tag)) className += ' must-have';
                if (filters.exclude.has(tag)) className += ' exclude';

                const displayCount = shouldShowFilteredCounts
                    ? getTagCount(tag, filesToCountFrom)
                    : count;

                return `<button class="${className}" onclick="window.tagManagerHandleClick('${tag}', event)">${tag} (${displayCount})</button>`;
            }).join('');
        }
    }

    container.innerHTML = html;
    updateActiveFiltersDisplay();
}
