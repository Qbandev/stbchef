// Utility functions for Simple Crypto Trading Bot Chef

/**
 * Sanitize string to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Display a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of notification (info, success, warning, error)
 * @param {boolean} allowHtml - Whether to allow HTML content in the message
 */
function showNotification(message, type = 'info', allowHtml = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Format message with line breaks and sanitize against XSS if not allowing HTML
    const formattedMessage = message.split('\n')
        .map(line => {
            // If HTML is allowed, don't sanitize, otherwise sanitize the content
            return `<div>${allowHtml ? line : sanitizeHTML(line)}</div>`;
        })
        .join('');

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

/**
 * Determine portfolio bar color based on target allocation
 * @param {number} allocation - Current ETH allocation percentage
 * @param {number} minTarget - Minimum target allocation percentage
 * @param {number} maxTarget - Maximum target allocation percentage
 * @returns {string} - Tailwind CSS class for portfolio bar coloring
 */
function getPortfolioBarColor(allocation, minTarget, maxTarget) {
    // Below minimum target - needs more ETH
    if (allocation < minTarget) {
        return 'bg-gradient-to-r from-yellow-500 to-blue-500';
    } 
    // Above maximum target - too much ETH
    else if (allocation > maxTarget) {
        return 'bg-gradient-to-r from-red-500 to-orange-500';
    } 
    // Within target range - optimal
    else {
        return 'bg-gradient-to-r from-green-500 to-blue-400';
    }
}

// Make functions available globally
window.showNotification = showNotification;
window.logToServer = logToServer;
window.copyToClipboard = copyToClipboard;
window.getPortfolioBarColor = getPortfolioBarColor;
