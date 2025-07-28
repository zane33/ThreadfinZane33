/**
 * Modern UI Enhancement Library for Threadfin
 * Provides enhanced feedback, animations, and user experience improvements
 */

class ModernUI {
    constructor() {
        this.initializeTheme();
        this.initializeNotifications();
        this.initializeLoading();
        this.initializeEnhancements();
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const theme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcons(theme);
    }

    /**
     * Update theme icons based on current theme
     */
    updateThemeIcons(theme) {
        const darkIcon = document.querySelector('.theme-icon-dark');
        const lightIcon = document.querySelector('.theme-icon-light');
        
        if (darkIcon && lightIcon) {
            if (theme === 'light') {
                darkIcon.classList.add('hidden');
                lightIcon.classList.remove('hidden');
            } else {
                darkIcon.classList.remove('hidden');
                lightIcon.classList.add('hidden');
            }
        }
    }

    /**
     * Toggle between dark and light themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcons(newTheme);
        
        // Trigger theme change event
        this.dispatchEvent('themeChanged', { theme: newTheme });
    }

    /**
     * Initialize modern notification system
     */
    initializeNotifications() {
        // Create notification container if it doesn't exist
        if (!document.querySelector('.notification-stack')) {
            const stack = document.createElement('div');
            stack.className = 'notification-stack';
            document.body.appendChild(stack);
        }
    }

    /**
     * Show modern notification
     */
    showNotification(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = 5000,
            closable = true
        } = options;

        const stack = document.querySelector('.notification-stack');
        const notification = document.createElement('div');
        notification.className = `notification ${type} animate-slide-in-left`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <i class="${icon}"></i>
                    ${title}
                </div>
                ${closable ? '<button class="notification-close" aria-label="Close"><i class="fas fa-times"></i></button>' : ''}
            </div>
            <div class="notification-body">${message}</div>
        `;

        // Add to stack
        stack.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, duration);
        }

        // Add close handler
        if (closable) {
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                this.dismissNotification(notification);
            });
        }

        return notification;
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Dismiss notification
     */
    dismissNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Initialize loading enhancements
     */
    initializeLoading() {
        this.loadingElement = document.querySelector('#loading');
        if (this.loadingElement) {
            this.loadingElement.classList.add('modern-loading');
        }
    }

    /**
     * Show loading with modern animation
     */
    showLoading(message = 'Loading...') {
        if (this.loadingElement) {
            this.loadingElement.classList.add('show');
            
            // Add loading message if provided
            let messageEl = this.loadingElement.querySelector('.loading-message');
            if (!messageEl && message) {
                messageEl = document.createElement('div');
                messageEl.className = 'loading-message';
                messageEl.style.cssText = `
                    margin-top: 20px;
                    color: var(--text-primary);
                    font-size: var(--font-size-sm);
                    text-align: center;
                `;
                this.loadingElement.appendChild(messageEl);
            }
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    /**
     * Hide loading
     */
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('show');
            
            // Remove loading message
            const messageEl = this.loadingElement.querySelector('.loading-message');
            if (messageEl) {
                messageEl.remove();
            }
        }
    }

    /**
     * Initialize UI enhancements
     */
    initializeEnhancements() {
        this.enhanceButtons();
        this.enhanceForms();
        this.enhanceTables();
        this.initializeAnimations();
    }

    /**
     * Enhance buttons with loading states
     */
    enhanceButtons() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, input[type="button"], input[type="submit"]');
            if (button && !button.disabled) {
                this.addButtonLoadingState(button);
            }
        });
    }

    /**
     * Add loading state to button
     */
    addButtonLoadingState(button, duration = 1000) {
        button.classList.add('btn-loading');
        button.disabled = true;
        
        setTimeout(() => {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }, duration);
    }

    /**
     * Enhance forms with better validation feedback
     */
    enhanceForms() {
        document.addEventListener('input', (e) => {
            const input = e.target;
            if (input.tagName === 'INPUT' || input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') {
                this.validateInput(input);
            }
        });
    }

    /**
     * Validate input and provide visual feedback
     */
    validateInput(input) {
        // Remove existing validation classes
        input.classList.remove('is-valid', 'is-invalid');
        
        if (input.checkValidity()) {
            input.classList.add('is-valid');
        } else if (input.value) {
            input.classList.add('is-invalid');
        }
    }

    /**
     * Enhance tables with modern features
     */
    enhanceTables() {
        const tables = document.querySelectorAll('#content_table, #inactive_content_table');
        tables.forEach(table => {
            this.addTableEnhancements(table);
        });
    }

    /**
     * Add enhancements to table
     */
    addTableEnhancements(table) {
        // Add mobile responsiveness
        if (window.innerWidth <= 576) {
            table.classList.add('mobile-card-view');
            this.addMobileTableLabels(table);
        }
        
        // Add stagger animation to rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            row.style.animationDelay = `${index * 0.1}s`;
            row.classList.add('animate-fade-in-up');
        });
    }

    /**
     * Add data labels for mobile table view
     */
    addMobileTableLabels(table) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    }

    /**
     * Initialize page animations
     */
    initializeAnimations() {
        // Animate content on page load
        const content = document.querySelector('#content');
        if (content) {
            content.classList.add('animate-fade-in-up');
        }

        // Add hover effects to interactive elements
        const interactiveElements = document.querySelectorAll('.card, .btn, button, input[type="button"], input[type="submit"]');
        interactiveElements.forEach(el => {
            el.classList.add('hover-lift');
        });

        // Add stagger animation to menu items
        const menuItems = document.querySelectorAll('.navbar-nav .nav-item');
        if (menuItems.length > 0) {
            menuItems[0].parentElement.classList.add('stagger-animation');
        }
    }

    /**
     * Show progress indicator
     */
    showProgress(percentage, message = '') {
        let progressBar = document.querySelector('.progress-indicator');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-indicator';
            progressBar.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-message"></div>
            `;
            progressBar.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-surface);
                padding: var(--space-xl);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-xl);
                z-index: var(--z-modal);
                min-width: 300px;
            `;
            document.body.appendChild(progressBar);
        }

        const fill = progressBar.querySelector('.progress-fill');
        const messageEl = progressBar.querySelector('.progress-message');
        
        fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        messageEl.textContent = message;
        
        progressBar.style.display = 'block';
        
        if (percentage >= 100) {
            setTimeout(() => {
                this.hideProgress();
            }, 1000);
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const progressBar = document.querySelector('.progress-indicator');
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Add keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('.search, input[type="search"]');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Ctrl/Cmd + / for help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showKeyboardShortcutsHelp();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.show');
                if (activeModal) {
                    const closeBtn = activeModal.querySelector('[data-bs-dismiss="modal"]');
                    if (closeBtn) closeBtn.click();
                }
            }
        });
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcutsHelp() {
        const shortcuts = [
            { keys: 'Ctrl + K', description: 'Focus search' },
            { keys: 'Ctrl + /', description: 'Show this help' },
            { keys: 'Escape', description: 'Close modal' },
            { keys: 'Tab', description: 'Navigate between elements' }
        ];

        const helpContent = shortcuts.map(shortcut => 
            `<div class="shortcut-item">
                <kbd>${shortcut.keys}</kbd>
                <span>${shortcut.description}</span>
            </div>`
        ).join('');

        this.showNotification({
            type: 'info',
            title: 'Keyboard Shortcuts',
            message: `<div class="shortcuts-help">${helpContent}</div>`,
            duration: 0,
            closable: true
        });
    }
}

// Initialize Modern UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modernUI = new ModernUI();
    
    // Global theme toggle function
    window.toggleTheme = () => window.modernUI.toggleTheme();
    
    // Enhanced error handling
    window.showError = (message, type = 'error') => {
        window.modernUI.showNotification({
            type,
            title: type.charAt(0).toUpperCase() + type.slice(1),
            message,
            duration: 5000
        });
    };
    
    // Enhanced success feedback
    window.showSuccess = (message) => {
        window.modernUI.showNotification({
            type: 'success',
            title: 'Success',
            message,
            duration: 3000
        });
    };
    
    // Enhanced loading
    window.showLoadingScreen = (show, message) => {
        if (show) {
            window.modernUI.showLoading(message);
        } else {
            window.modernUI.hideLoading();
        }
    };
});