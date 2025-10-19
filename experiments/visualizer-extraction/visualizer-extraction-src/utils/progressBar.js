/**
 * Progress Bar Utilities
 *
 * Provides a simple progress bar UI for long-running operations.
 * Used by file upload, batch detection, batch stem separation, etc.
 *
 * Usage:
 *   import * as ProgressBar from './progressBar.js';
 *
 *   ProgressBar.show('Processing files...', 0, 10);
 *   ProgressBar.update(5, 10, 'Processing file 5...');
 *   ProgressBar.complete();
 *   ProgressBar.hide();
 */

// Internal state
let progressInterval = null;
let progressStartTime = null;

/**
 * Show progress bar
 * @param {string} text - Status text to display
 * @param {number} current - Current progress count
 * @param {number} total - Total count
 */
export function show(text, current, total) {
    const bar = document.getElementById('progressBar');
    if (!bar) {
        console.warn('[ProgressBar] Progress bar element not found');
        return;
    }

    bar.style.height = '40px';
    bar.style.opacity = '1';
    document.getElementById('progressText').textContent = text;
    document.getElementById('progressCounter').textContent = `${current}/${total}`;
    document.getElementById('progressBarFill').style.width = '0%';
}

/**
 * Hide progress bar
 */
export function hide() {
    const bar = document.getElementById('progressBar');
    if (!bar) return;

    bar.style.opacity = '0';
    setTimeout(() => {
        bar.style.height = '0';
    }, 300);

    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

/**
 * Start animated progress over estimated time
 * Progress will animate from 0% to 95% over the estimated duration
 * @param {number} estimatedSeconds - Estimated duration in seconds
 */
export function startAnimation(estimatedSeconds) {
    progressStartTime = Date.now();
    const incrementMs = 100; // Update every 100ms
    const totalMs = estimatedSeconds * 1000;

    if (progressInterval) clearInterval(progressInterval);

    progressInterval = setInterval(() => {
        const elapsed = Date.now() - progressStartTime;
        const progress = Math.min((elapsed / totalMs) * 95, 95); // Cap at 95% until actually complete

        const fill = document.getElementById('progressBarFill');
        if (fill) {
            fill.style.width = progress + '%';
        }

        if (progress >= 95) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }, incrementMs);
}

/**
 * Mark progress as complete (100%)
 */
export function complete() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }

    const fill = document.getElementById('progressBarFill');
    if (fill) {
        fill.style.width = '100%';
    }
}

/**
 * Update progress text and counter
 * @param {number} current - Current progress count
 * @param {number} total - Total count
 * @param {string} statusText - Status text to display
 */
export function update(current, total, statusText) {
    const textEl = document.getElementById('progressText');
    const counterEl = document.getElementById('progressCounter');

    if (textEl) textEl.textContent = statusText;
    if (counterEl) counterEl.textContent = `${current}/${total}`;
}

// Legacy compatibility functions (deprecated, kept for backward compatibility)

/**
 * @deprecated Not used anymore, kept for compatibility
 */
export function showProgressModal(title, files) {
    // Not used anymore
}

/**
 * @deprecated Not used anymore, kept for compatibility
 */
export function updateQueueItem(fileId, status, errorMessage = '') {
    // Not used anymore
}

/**
 * @deprecated Not used anymore, kept for compatibility
 */
export function closeProgressModal() {
    // Not used anymore
}
