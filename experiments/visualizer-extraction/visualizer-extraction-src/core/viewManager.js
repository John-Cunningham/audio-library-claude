// View Manager - Handles switching between different visualization views
// Manages view lifecycle: init, update, destroy

// Registry of available views
const views = new Map();

// Current active view
let currentView = null;
let currentViewName = null;

/**
 * Register a new view
 * @param {string} name - Unique view identifier (e.g., 'library', 'galaxy', 'sphere')
 * @param {Object} viewModule - View module with lifecycle methods
 * @param {Function} viewModule.init - Initialize view (called once when switching to view)
 * @param {Function} viewModule.update - Update view (called when data changes)
 * @param {Function} viewModule.destroy - Cleanup view (called when switching away)
 */
export function registerView(name, viewModule) {
    if (!viewModule.init || !viewModule.update || !viewModule.destroy) {
        console.error(`View '${name}' must implement init, update, and destroy methods`);
        return;
    }

    views.set(name, viewModule);
    console.log(`View registered: ${name}`);
}

/**
 * Switch to a different view
 * @param {string} viewName - Name of view to switch to
 * @param {Object} data - Initial data to pass to view
 */
export async function switchView(viewName, data = {}) {
    if (!views.has(viewName)) {
        console.error(`View '${viewName}' not registered`);
        return;
    }

    // Destroy current view if exists
    if (currentView && currentView.destroy) {
        console.log(`Destroying view: ${currentViewName}`);
        try {
            await currentView.destroy();
        } catch (e) {
            console.error(`Error destroying view ${currentViewName}:`, e);
        }
    }

    // Get new view module
    const viewModule = views.get(viewName);

    // Initialize new view
    console.log(`Initializing view: ${viewName}`);
    try {
        await viewModule.init(data);
        currentView = viewModule;
        currentViewName = viewName;

        // Update active tab styling
        updateViewTabs(viewName);

        console.log(`View switched to: ${viewName}`);
    } catch (e) {
        console.error(`Error initializing view ${viewName}:`, e);
    }
}

/**
 * Update the current view with new data
 * @param {Object} data - Data to pass to view's update method
 */
export function updateCurrentView(data = {}) {
    if (currentView && currentView.update) {
        try {
            currentView.update(data);
        } catch (e) {
            console.error(`Error updating view ${currentViewName}:`, e);
        }
    }
}

/**
 * Get the current view name
 * @returns {string|null} - Current view name or null if no view active
 */
export function getCurrentViewName() {
    return currentViewName;
}

/**
 * Update view tab styling to reflect active view
 * @param {string} activeViewName - Name of the active view
 */
function updateViewTabs(activeViewName) {
    // Remove active class from all tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active class to current tab
    const activeTab = document.querySelector(`.view-tab[data-view="${activeViewName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

/**
 * Initialize view tabs with click handlers
 * Call this once on page load
 * @param {Function} getViewData - Optional function to get data for view switching
 */
export function initViewTabs(getViewData = null) {
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const viewName = tab.getAttribute('data-view');
            if (viewName) {
                // Get current data if function provided
                const data = getViewData ? getViewData() : {};
                switchView(viewName, data);
            }
        });
    });

    console.log('View tabs initialized');
}
