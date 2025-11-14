// OTP Bomber functionality
class OTPBomber {
    constructor() {
        this.isRunning = false;
        this.currentSession = null;
        this.sessionInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStatus('ready');
    }

    setupEventListeners() {
        const bombForm = document.getElementById('bombForm');
        const clearLogsBtn = document.getElementById('clearLogs');
        const exportLogsBtn = document.getElementById('exportLogs');
        const stopBtn = document.getElementById('stopBtn');

        if (bombForm) {
            bombForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startBombing();
            });
        }

        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                this.clearLogs();
            });
        }

        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => {
                this.exportLogs();
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopBombing();
            });
        }

        // Phone number validation
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            });
        }

        // IP address validation
        const ipInput = document.getElementById('ipAddress');
        if (ipInput) {
            ipInput.addEventListener('input', (e) => {
                // Basic IP validation
                const value = e.target.value;
                if (!/^(\d{1,3}\.){0,3}\d{0,3}$/.test(value)) {
                    e.target.value = value.slice(0, -1);
                }
            });
        }
    }

    async startBombing() {
        if (this.isRunning) {
            LUCIFERSECApp.showNotification('Bombing is already in progress', 'warning');
            return;
        }

        const formData = new FormData(document.getElementById('bombForm'));
        const data = {
            phone: formData.get('phone'),
            ip: formData.get('ip') || '192.168.1.1',
            iterations: parseInt(formData.get('iterations')) || 1
        };

        // Validate phone number
        if (!/^\d{10}$/.test(data.phone)) {
            LUCIFERSECApp.showNotification('Please enter a valid 10-digit phone number', 'error');
            return;
        }

        // Validate iterations
        if (data.iterations < 1 || data.iterations > 5) {
            LUCIFERSECApp.showNotification('Iterations must be between 1 and 5', 'error');
            return;
        }

        this.isRunning = true;
        this.updateStatus('running');
        this.showProgress();
        this.addLog('🚀 Starting OTP bombing session...', 'info');
        this.addLog(`📱 Target: ${data.phone}`, 'info');
        this.addLog(`🌐 IP: ${data.ip}`, 'info');
        this.addLog(`🔄 Iterations: ${data.iterations}`, 'info');

        const submitBtn = document.getElementById('submitBtn');
        const stopBtn = document.getElementById('stopBtn');
        const originalSubmitText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        stopBtn.disabled = false;

        try {
            const response = await LUCIFERSECApp.apiCall('/api/bomb', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.currentSession = response.session_id;
                this.addLog('✅ Bombing session started successfully', 'success');
                this.startSessionMonitoring();
            } else {
                throw new Error(response.error || 'Failed to start bombing session');
            }
        } catch (error) {
            this.addLog(`❌ Failed to start bombing: ${error.message}`, 'error');
            this.stopBombing();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalSubmitText;
        }
    }

    async startSessionMonitoring() {
        if (!this.currentSession) return;

        this.sessionInterval = setInterval(async () => {
            try {
                const session = await LUCIFERSECApp.apiCall(`/api/session/${this.currentSession}`);
                this.updateSessionData(session);

                if (session.status === 'completed' || session.status === 'failed') {
                    this.stopBombing();
                    this.addLog(
                        session.status === 'completed' 
                            ? '🎉 Bombing session completed successfully!' 
                            : '❌ Bombing session failed!',
                        session.status === 'completed' ? 'success' : 'error'
                    );
                }
            } catch (error) {
                console.error('Error monitoring session:', error);
            }
        }, 1000);
    }

    updateSessionData(session) {
        // Update stats
        document.getElementById('currentSuccess').textContent = session.results.successful || 0;
        document.getElementById('currentFailed').textContent = session.results.failed || 0;
        document.getElementById('currentTotal').textContent = session.results.total || 0;

        // Update progress
        this.updateProgress(session);

        // Update logs (only new ones)
        this.updateLogs(session.logs);
    }

    updateProgress(session) {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const currentIteration = document.getElementById('currentIteration');
        const eta = document.getElementById('eta');

        if (session.results.total > 0) {
            const progress = (session.results.successful / session.results.total) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }

        // Update iteration info
        currentIteration.textContent = `1/1`; // This would need to be calculated based on actual progress

        // Update ETA
        eta.textContent = 'Calculating...';
    }

    updateLogs(logs) {
        const logsContent = document.getElementById('logsContent');
        const currentLogs = Array.from(logsContent.querySelectorAll('.log-entry'))
            .map(log => log.querySelector('.log-message').textContent);

        // Add only new logs
        logs.forEach(log => {
            const logMessage = log.split('] ')[1];
            if (!currentLogs.includes(logMessage)) {
                this.addLog(logMessage, 'info');
            }
        });
    }

    stopBombing() {
        this.isRunning = false;
        this.updateStatus('ready');
        this.hideProgress();

        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
            this.sessionInterval = null;
        }

        const submitBtn = document.getElementById('submitBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (submitBtn) submitBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;

        this.addLog('🛑 Bombing session stopped', 'warning');
    }

    addLog(message, type = 'info') {
        const logsContent = document.getElementById('logsContent');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;

        logsContent.appendChild(logEntry);
        logsContent.scrollTop = logsContent.scrollHeight;

        // Limit logs to 1000 entries to prevent memory issues
        const logs = logsContent.querySelectorAll('.log-entry');
        if (logs.length > 1000) {
            logs[0].remove();
        }
    }

    clearLogs() {
        const logsContent = document.getElementById('logsContent');
        logsContent.innerHTML = `
            <div class="log-entry log-info">
                <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-message">🧹 Logs cleared</span>
            </div>
        `;
    }

    exportLogs() {
        const logsContent = document.getElementById('logsContent');
        const logs = Array.from(logsContent.querySelectorAll('.log-entry'))
            .map(log => log.textContent)
            .join('\n');

        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LUCIFERSEC-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addLog('📥 Logs exported successfully', 'success');
    }

    updateStatus(status) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (statusDot && statusText) {
            statusDot.className = 'status-dot';
            statusDot.classList.add(status);
            
            const statusMessages = {
                'ready': 'Ready',
                'running': 'Running',
                'error': 'Error'
            };
            
            statusText.textContent = statusMessages[status] || 'Unknown';
        }
    }

    showProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }

    hideProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
}

// Initialize bomber when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.otpBomber = new OTPBomber();
});