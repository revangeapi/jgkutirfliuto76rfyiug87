// charts js
// Charts functionality for statistics page
class ChartsManager {
    constructor() {
        this.charts = new Map();
        this.init();
    }

    init() {
        this.initPerformanceChart();
        this.initDistributionChart();
        this.initRealTimeUpdates();
    }

    initPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        this.charts.set('performance', new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels(12),
                datasets: [{
                    label: 'Successful Requests',
                    data: this.generateRandomData(12, 80, 95),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }, {
                    label: 'Failed Requests',
                    data: this.generateRandomData(12, 2, 8),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleColor: '#9ca3af',
                        bodyColor: '#f8fafc',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            callback: function(value) {
                                return value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                }
            }
        }));
    }

    initDistributionChart() {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;

        const apiData = [
            { name: 'Hungama', value: 25, color: '#6366f1' },
            { name: 'Meru Cab', value: 15, color: '#10b981' },
            { name: 'Dayco', value: 12, color: '#f59e0b' },
            { name: 'Doubtnut', value: 18, color: '#ef4444' },
            { name: 'NoBroker', value: 20, color: '#8b5cf6' },
            { name: 'Others', value: 10, color: '#06b6d4' }
        ];

        this.charts.set('distribution', new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: apiData.map(item => item.name),
                datasets: [{
                    data: apiData.map(item => item.value),
                    backgroundColor: apiData.map(item => item.color),
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleColor: '#9ca3af',
                        bodyColor: '#f8fafc',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        }));

        this.updateDistributionLegend(apiData);
    }

    updateDistributionLegend(data) {
        const legend = document.getElementById('distributionLegend');
        if (!legend) return;

        legend.innerHTML = data.map(item => `
            <span class="legend-item">
                <i class="fas fa-circle" style="color: ${item.color}"></i>
                ${item.name}
            </span>
        `).join('');
    }

    initRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateCharts();
        }, 5000);
    }

    updateCharts() {
        const performanceChart = this.charts.get('performance');
        if (performanceChart) {
            // Remove first data point and add new one
            performanceChart.data.labels.push(this.getCurrentTime());
            performanceChart.data.labels.shift();

            performanceChart.data.datasets.forEach(dataset => {
                const newValue = dataset.label === 'Successful Requests' 
                    ? Math.floor(Math.random() * 10) + 85
                    : Math.floor(Math.random() * 5) + 3;
                
                dataset.data.push(newValue);
                dataset.data.shift();
            });

            performanceChart.update('none');
        }
    }

    generateTimeLabels(count) {
        const labels = [];
        const now = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 5 * 60 * 1000));
            labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        
        return labels;
    }

    generateRandomData(count, min, max) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Method to update charts with real data
    updateWithRealData(apiStats) {
        // This would be called when real API stats are available
        console.log('Updating charts with real data:', apiStats);
    }

    // Method to destroy all charts (for page cleanup)
    destroy() {
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();
    }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('performanceChart')) {
        window.chartsManager = new ChartsManager();
    }
});