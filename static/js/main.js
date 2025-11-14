// Main application JavaScript
class LUCIFERSECApp {
    constructor() {
        this.isMobileMenuOpen = false;
        this.init();
    }

    init() {
        this.initMobileMenu();
        this.initScrollEffects();
        this.initAnimations();
        this.initTheme();
    }

    initMobileMenu() {
        const toggle = document.getElementById('navToggle');
        const menu = document.getElementById('navMenu');

        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close mobile menu when clicking on a link
            menu.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    this.closeMobileMenu();
                }
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isMobileMenuOpen && !toggle.contains(e.target) && !menu.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
        }
    }

    toggleMobileMenu() {
        const menu = document.getElementById('navMenu');
        const toggle = document.getElementById('navToggle');
        
        if (menu.classList.contains('mobile-active')) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const menu = document.getElementById('navMenu');
        const toggle = document.getElementById('navToggle');
        
        menu.classList.add('mobile-active');
        toggle.classList.add('active');
        this.isMobileMenuOpen = true;
        
        // Animate hamburger to X
        const bars = toggle.querySelectorAll('.bar');
        bars[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
        bars[1].style.opacity = '0';
        bars[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
    }

    closeMobileMenu() {
        const menu = document.getElementById('navMenu');
        const toggle = document.getElementById('navToggle');
        
        menu.classList.remove('mobile-active');
        toggle.classList.remove('active');
        this.isMobileMenuOpen = false;
        
        // Reset hamburger animation
        const bars = toggle.querySelectorAll('.bar');
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        bars[2].style.transform = 'none';
    }

    initScrollEffects() {
        let lastScrollY = window.scrollY;
        const navbar = document.querySelector('.navbar');
        const scrollThreshold = 100;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Hide/show navbar on scroll
            if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }

            // Add background when scrolled
            if (currentScrollY > scrollThreshold) {
                navbar.style.background = 'rgba(17, 24, 39, 0.95)';
                navbar.style.backdropFilter = 'blur(20px)';
            } else {
                navbar.style.background = 'rgba(17, 24, 39, 0.9)';
                navbar.style.backdropFilter = 'blur(20px)';
            }

            lastScrollY = currentScrollY;
        });

        // Smooth scrolling for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    }

    initAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.feature-card, .step, .stat-item, .api-card').forEach(el => {
            observer.observe(el);
        });

        // Add loading animation to buttons
        document.addEventListener('submit', (e) => {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                this.showButtonLoading(submitBtn);
            }
        });
    }

    initTheme() {
        // Theme switching functionality can be added here
        // For now, we'll use the dark theme as default
    }

    showButtonLoading(button) {
        const originalText = button.innerHTML;
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Processing...
        `;
        button.disabled = true;

        // Revert after 5 seconds if still loading (safety measure)
        setTimeout(() => {
            if (button.disabled) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }, 5000);
    }

    hideButtonLoading(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
    }

    // Utility method to show notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: var(--darker);
                    border: 1px solid var(--border);
                    border-left: 4px solid var(--primary);
                    border-radius: var(--radius);
                    padding: 1rem;
                    max-width: 400px;
                    box-shadow: var(--shadow-lg);
                    z-index: 10000;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification-success {
                    border-left-color: var(--success);
                }
                .notification-error {
                    border-left-color: var(--danger);
                }
                .notification-warning {
                    border-left-color: var(--warning);
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--light);
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: var(--gray);
                    cursor: pointer;
                    padding: 0.25rem;
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);

        // Close on click
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // API call helper
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(endpoint, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    }
}

// Utility functions
class Utils {
    static formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(resolve).catch(reject);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    resolve();
                } catch (err) {
                    reject(err);
                }
                document.body.removeChild(textArea);
            }
        });
    }

    static getRandomColor() {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.LUCIFERSECApp = new LUCIFERSECApp();
    
    // Add global error handler
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });

    // Add global promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LUCIFERSECApp, Utils };
}