// Chart handling functions for Simple Crypto Trading Bot Chef

/**
 * Initialize price chart with default settings
 * @returns {void}
 */
function initCharts() {
    Chart.defaults.color = '#e2e8f0';
    Chart.defaults.borderColor = 'rgba(0, 243, 255, 0.1)';

    // Ensure necessary global variables exist or create empty arrays
    if (!window.timeLabels) window.timeLabels = [];
    if (!window.priceHistory) window.priceHistory = [];
    if (!window.volumeHistory) window.volumeHistory = [];

    // Price Chart
    const priceCtx = document.getElementById('price-chart').getContext('2d');
    window.priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels: window.timeLabels,
            datasets: [
                {
                    label: 'ETH Price (USD)',
                    data: window.priceHistory,
                    borderColor: '#00f3ff',
                    borderWidth: 2,
                    tension: 0.1,
                    yAxisID: 'y',
                    order: 1
                },
                {
                    label: 'Volume',
                    data: window.volumeHistory,
                    backgroundColor: 'rgba(157, 0, 255, 0.2)',
                    borderColor: 'rgba(157, 0, 255, 0.2)',
                    type: 'bar',
                    yAxisID: 'volume',
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e2e8f0'
                    }
                },
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                    }
                },
                annotation: {
                    annotations: {}
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(0, 243, 255, 0.1)'
                    },
                    ticks: {
                        color: '#e2e8f0'
                    },
                    title: {
                        display: true,
                        text: 'Price (USD)',
                        color: '#e2e8f0'
                    }
                },
                volume: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                        color: 'rgba(157, 0, 255, 0.1)'
                    },
                    ticks: {
                        color: '#e2e8f0'
                    },
                    title: {
                        display: true,
                        text: 'Volume',
                        color: '#e2e8f0'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Update charts with new price and volume data
 * @param {number} price - Current ETH price
 * @param {string} sentiment - Market sentiment
 * @param {string} geminiAction - Gemini model decision
 * @param {string} groqAction - Groq model decision 
 * @param {string} mistralAction - Mistral model decision
 * @param {number} volume - Trading volume
 * @returns {void}
 */
function updateCharts(price, sentiment, geminiAction, groqAction, mistralAction, volume) {
    const now = new Date().toLocaleTimeString();

    // Ensure necessary global variables exist
    if (!window.timeLabels) window.timeLabels = [];
    if (!window.priceHistory) window.priceHistory = [];
    if (!window.volumeHistory) window.volumeHistory = [];
    if (!window.lastDecisions) window.lastDecisions = { gemini: null, groq: null, mistral: null, price: null };

    // Update accuracy if the function is available
    if (typeof window.updateAccuracy === 'function') {
        window.updateAccuracy(price);
    } else {
        console.warn('updateAccuracy function not available');
    }

    // Store current decisions for next accuracy calculation
    window.lastDecisions = {
        gemini: geminiAction,
        groq: groqAction,
        mistral: mistralAction,
        price: price
    };

    // Keep last 100 data points
    if (window.timeLabels.length > 100) {
        window.timeLabels.shift();
        window.priceHistory.shift();
        window.volumeHistory.shift();
    }

    window.timeLabels.push(now);
    window.priceHistory.push(price);
    window.volumeHistory.push(volume);

    // Update price chart without model annotations
    if (window.priceChart && typeof window.priceChart.update === 'function') {
        window.priceChart.update();
    } else {
        console.warn('priceChart not available or update method not found');
    }

    // Persist chart data
    try {
        // Check if STORAGE_KEYS is available
        const storageKeys = window.STORAGE_KEYS || {
            PRICE_DATA: 'stbchef_price_data',
            VOLUME_DATA: 'stbchef_volume_data',
            TIME_LABELS: 'stbchef_time_labels'
        };
        
        localStorage.setItem(storageKeys.PRICE_DATA, JSON.stringify(window.priceHistory));
        localStorage.setItem(storageKeys.VOLUME_DATA, JSON.stringify(window.volumeHistory));
        localStorage.setItem(storageKeys.TIME_LABELS, JSON.stringify(window.timeLabels));
    } catch (error) {
        console.error('Error persisting chart data:', error);
    }
}

// Make functions available globally
window.initCharts = initCharts;
window.updateCharts = updateCharts; 