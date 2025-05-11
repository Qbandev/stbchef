// Clear storage utility for the Simple Crypto Trading Bot Chef

// Function to clear all storage
function clearAllStorage() {
    try {
        // Clear localStorage items
        localStorage.clear();
        console.log('Successfully cleared all localStorage items');
        
        // Show success message
        const messageElement = document.createElement('div');
        messageElement.style.padding = '20px';
        messageElement.style.background = '#4a5568';
        messageElement.style.color = '#fff';
        messageElement.style.textAlign = 'center';
        messageElement.innerHTML = `
            <h2>Storage cleared successfully</h2>
            <p>All application data has been reset.</p>
            <button id="return-btn" style="background: #4299e1; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin-top: 16px; cursor: pointer;">
                Return to Dashboard
            </button>
        `;
        
        // Clear the page and add our message
        document.body.innerHTML = '';
        document.body.appendChild(messageElement);
        
        // Add return button handler
        document.getElementById('return-btn').addEventListener('click', function() {
            window.location.href = '/';
        });
        
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        
        // Show error message
        const errorElement = document.createElement('div');
        errorElement.style.padding = '20px';
        errorElement.style.background = '#742a2a';
        errorElement.style.color = '#fff';
        errorElement.style.textAlign = 'center';
        errorElement.innerHTML = `
            <h2>Error clearing storage</h2>
            <p>${error.message}</p>
            <button id="return-btn" style="background: #e53e3e; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin-top: 16px; cursor: pointer;">
                Return to Dashboard
            </button>
        `;
        
        // Add to page
        document.body.innerHTML = '';
        document.body.appendChild(errorElement);
        
        // Add return button handler
        document.getElementById('return-btn').addEventListener('click', function() {
            window.location.href = '/';
        });
    }
}

// Execute immediately when loaded
document.addEventListener('DOMContentLoaded', clearAllStorage); 