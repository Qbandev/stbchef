// Utility functions for Simple Crypto Trading Bot Chef

/**
 * Display a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of notification (info, success, warning, error)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Format message with line breaks
    const formattedMessage = message.split('\n').map(line => `<div>${line}</div>`).join('');

    notification.innerHTML = `
        <div class="flex flex-col">
            ${formattedMessage}
        </div>
    `;

    document.body.appendChild(notification);

    // Remove notification after 8 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 8000);
}

/**
 * Send logs to server and console
 * @param {string} level - Log level (error, warn, info)
 * @param {string} message - Log message
 * @param {Object} context - Additional context information
 */
function logToServer(level, message, context = {}) {
    // Always log to console
    if (level === 'error') {
        console.error(message, context);
    } else if (level === 'warn') {
        console.warn(message, context);
    } else {
        console.log(message, context);
    }
    
    // Send logs to server for important events
    if (level === 'error' || level === 'warn') {
        try {
            fetch('/api/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level,
                    message,
                    context,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            }).catch(err => console.error('Error sending log to server:', err));
        } catch (e) {
            // Fail silently - don't let logging errors create more errors
            console.error('Failed to send log to server:', e);
        }
    }
}

/**
 * Copy text to clipboard with notification
 * @param {string} text - Text to copy to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Address copied to clipboard!', 'info');
    }).catch(err => {
        console.error('Error copying address: ', err);
        showNotification('Failed to copy address', 'error');
    });
}

// Make functions available globally
window.showNotification = showNotification;
window.logToServer = logToServer;
window.copyToClipboard = copyToClipboard;
