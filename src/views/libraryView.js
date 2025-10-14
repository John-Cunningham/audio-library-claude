// Library View - Traditional file list view with tags, filters, and sorting
// This module wraps the existing library rendering code from app.js

/**
 * Initialize library view
 * @param {Object} data - Initial data (e.g., { renderFunction, renderTagsFunction })
 */
export async function init(data = {}) {
    console.log('Library view initializing...');

    // Show library container
    const container = document.getElementById('libraryViewContainer');
    if (container) {
        container.style.display = 'block';
    }

    // Render files if render function provided
    if (data.renderFunction) {
        data.renderFunction();
    }

    // Render tags if render function provided
    if (data.renderTagsFunction) {
        data.renderTagsFunction();
    }

    console.log('Library view initialized');
}

/**
 * Update library view with new data
 * @param {Object} data - Update data (e.g., { files, searchQuery })
 */
export function update(data = {}) {
    // Library view updates are handled by app.js calling renderFiles() directly
    // This is kept for consistency with view lifecycle
    if (data.renderFunction) {
        data.renderFunction();
    }
}

/**
 * Destroy library view and cleanup
 */
export async function destroy() {
    console.log('Library view destroying...');

    // Hide library container
    const container = document.getElementById('libraryViewContainer');
    if (container) {
        container.style.display = 'none';
    }

    console.log('Library view destroyed');
}
