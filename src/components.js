/**
 * Reusable UI Components
 */

class UIComponents {
    // Color palette for client theming - very dark, muted tones for background zones
    static COLOR_PALETTE = [
        { name: 'Blue', value: '#1a365d', contrast: '#FFFFFF' },
        { name: 'Indigo', value: '#312e81', contrast: '#FFFFFF' },
        { name: 'Purple', value: '#581c87', contrast: '#FFFFFF' },
        { name: 'Pink', value: '#831843', contrast: '#FFFFFF' },
        { name: 'Rose', value: '#9f1239', contrast: '#FFFFFF' },
        { name: 'Red', value: '#7f1d1d', contrast: '#FFFFFF' },
        { name: 'Orange', value: '#7c2d12', contrast: '#FFFFFF' },
        { name: 'Amber', value: '#78350f', contrast: '#FFFFFF' },
        { name: 'Yellow', value: '#713f12', contrast: '#FFFFFF' },
        { name: 'Lime', value: '#365314', contrast: '#FFFFFF' },
        { name: 'Green', value: '#14532d', contrast: '#FFFFFF' },
        { name: 'Emerald', value: '#064e3b', contrast: '#FFFFFF' },
        { name: 'Teal', value: '#134e4a', contrast: '#FFFFFF' },
        { name: 'Cyan', value: '#164e63', contrast: '#FFFFFF' },
        { name: 'Sky', value: '#0c4a6e', contrast: '#FFFFFF' },
        { name: 'Slate', value: '#334155', contrast: '#FFFFFF' }
    ];

    /**
     * Create a company card element with color theming support
     */
    static createCompanyCard(company, isActive = false) {
        const card = document.createElement('div');
        card.className = `company-card ${isActive ? 'active' : ''}`;
        card.dataset.companyId = company.id;
        
        // Get saved color theme
        const savedColors = this.getSavedCompanyColors();
        const companyColor = savedColors[company.id];
        
        // Get initials for icon
        const initials = company.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        card.innerHTML = `
            <div class="company-card-header">
                <div class="company-icon" ${companyColor ? `style="background-color: ${companyColor.value}; color: ${companyColor.contrast};"` : ''}>${initials}</div>
                <div class="company-info">
                    <div class="company-name">${this.escapeHtml(company.name)}</div>
                    <div class="company-meta">
                        ${company.itemCount || 0} items
                    </div>
                </div>
                <div class="company-card-actions">
                    <button class="btn btn-icon btn-ghost company-color-btn" 
                            onclick="event.stopPropagation(); UIComponents.showColorPicker(${company.id}, '${this.escapeHtml(company.name)}')" 
                            title="Change company color">
                        <i class="fa-solid fa-palette"></i>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-remove company-remove-btn" 
                            onclick="event.stopPropagation(); dashboard.confirmRemoveCompany(${company.id})" 
                            title="Remove company from dashboard"
                            data-company-id="${company.id}">
                        <span class="icon-remove">✕</span>
                    </button>
                </div>
            </div>
            ${company.hasActiveItems ? '<div class="company-card-indicator"></div>' : ''}
        `;
        
        return card;
    }
    
    /**
     * Create a project progress block
     */
    static createProjectBlock(project) {
        const block = document.createElement('div');
        block.className = 'progress-tracker-block fade-in';
        block.dataset.projectId = project.id;
        
        const hours = project.hours || {};
        const billableHours = hours.billableHours || 0;
        const nonBillableHours = hours.nonBillableHours || 0;
        const totalHours = billableHours + nonBillableHours;
        
        block.innerHTML = `
            <div class="progress-block-header">
                <div class="progress-block-icon project">
                    <span class="icon-project"></span>
                </div>
                <div class="progress-block-info">
                    <div class="progress-block-title">${this.escapeHtml(project.title)}</div>
                    <div class="progress-block-subtitle">
                        Project • ${project.status || 'Active'}
                    </div>
                </div>
                <button class="btn btn-icon btn-ghost btn-remove block-remove-btn" 
                        onclick="event.stopPropagation(); dashboard.confirmRemoveProject(${project.id})" 
                        title="Remove project from dashboard"
                        data-project-id="${project.id}">
                    <span class="icon-remove">✕</span>
                </button>
            </div>
            
            <div class="progress-block-metrics">
                <div class="metric-row">
                    <span class="metric-label">Total Hours</span>
                    <span class="metric-value">${totalHours.toFixed(1)}h</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Billable</span>
                    <span class="metric-value">${billableHours.toFixed(1)}h</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Non-billable</span>
                    <span class="metric-value">${nonBillableHours.toFixed(1)}h</span>
                </div>
                ${project.date_due ? `
                <div class="metric-row">
                    <span class="metric-label">Due Date</span>
                    <span class="metric-value">${this.formatDate(project.date_due)}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        return block;
    }
    
    /**
     * Create an agreement progress block
     */
    static createAgreementBlock(agreement) {
        const block = document.createElement('div');
        block.className = 'progress-tracker-block fade-in';
        block.dataset.agreementId = agreement.id;
        
        const usage = agreement.usage || {};
        const timeAllowance = usage.timeAllowance || 0;
        const timeUsed = usage.timeUsed || 0;
        const percentUsed = timeAllowance > 0 ? (timeUsed / timeAllowance) * 100 : 0;
        
        // Determine progress bar color
        let progressClass = '';
        if (percentUsed >= 90) {
            progressClass = 'danger';
        } else if (percentUsed >= 75) {
            progressClass = 'warning';
        }
        
        block.innerHTML = `
            <div class="progress-block-header">
                <div class="progress-block-icon agreement">
                    <span class="icon-agreement"></span>
                </div>
                <div class="progress-block-info">
                    <div class="progress-block-title">${this.escapeHtml(agreement.title)}</div>
                    <div class="progress-block-subtitle">
                        Agreement • ${agreement.retainer_type || 'Time-based'}
                    </div>
                </div>
                <button class="btn btn-icon btn-ghost btn-remove block-remove-btn" 
                        onclick="event.stopPropagation(); dashboard.confirmRemoveAgreement(${agreement.id})" 
                        title="Remove agreement from dashboard"
                        data-agreement-id="${agreement.id}">
                    <span class="icon-remove">✕</span>
                </button>
            </div>
            
            <div class="progress-block-metrics">
                <div class="metric-row">
                    <span class="metric-label">Hours Used</span>
                    <span class="metric-value">${timeUsed.toFixed(1)}h of ${timeAllowance.toFixed(1)}h</span>
                </div>
                ${usage.periodStart && usage.periodEnd ? `
                <div class="metric-row">
                    <span class="metric-label">Current Period</span>
                    <span class="metric-value">${this.formatDate(usage.periodStart)} - ${this.formatDate(usage.periodEnd)}</span>
                </div>
                ` : ''}
            </div>
            
            ${timeAllowance > 0 ? `
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-bar-fill ${progressClass}" style="width: ${Math.min(percentUsed, 100)}%"></div>
                </div>
                <div class="progress-percentage">${percentUsed.toFixed(0)}% used</div>
            </div>
            ` : ''}
        `;
        
        return block;
    }
    
    /**
     * Create a search result item
     */
    static createSearchResultItem(item, type) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.dataset.id = item.id;
        div.dataset.type = type;
        
        let typeLabel = '';
        let metaInfo = '';
        
        switch (type) {
            case 'company':
                typeLabel = 'Company';
                metaInfo = item.website || item.phone || 'No contact info';
                break;
            case 'project':
                typeLabel = 'Project';
                // Use company_info if available, otherwise show type
                if (item.company_info && item.company_info.name) {
                    metaInfo = `Company: ${item.company_info.name}`;
                } else if (item.against) {
                    metaInfo = `${item.against.type}: ${item.against.id}`;
                } else {
                    metaInfo = 'No company info';
                }
                break;
            case 'agreement':
                typeLabel = 'Agreement';
                // Use company_info if available, otherwise show type
                if (item.company_info && item.company_info.name) {
                    metaInfo = `Company: ${item.company_info.name}`;
                } else if (item.against) {
                    metaInfo = `${item.against.type}: ${item.against.id}`;
                } else {
                    metaInfo = 'No company info';
                }
                break;
        }
        
        div.innerHTML = `
            <div class="result-item-header">
                <div class="result-item-title">${this.escapeHtml(item.name || item.title)}</div>
                <div class="result-item-type">${typeLabel}</div>
            </div>
            <div class="result-item-meta">${this.escapeHtml(metaInfo)}</div>
        `;
        
        div.addEventListener('click', () => {
            div.classList.toggle('selected');
        });
        
        return div;
    }
    
    /**
     * Create loading skeleton
     */
    static createLoadingSkeleton(type = 'block') {
        if (type === 'block') {
            return `<div class="skeleton skeleton-block"></div>`;
        } else if (type === 'text') {
            return `<div class="skeleton skeleton-text"></div>`;
        }
    }
    
    /**
     * Show loading overlay
     */
    static showLoading() {
        document.getElementById('loadingOverlay').classList.remove('d-none');
    }
    
    /**
     * Hide loading overlay
     */
    static hideLoading() {
        document.getElementById('loadingOverlay').classList.add('d-none');
    }
    
    /**
     * Show toast notification
     */
    static showToast(message, type = 'info') {
        // Remove any existing toasts
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} fade-in`;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1001;
            min-width: 300px;
            box-shadow: var(--shadow-lg);
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    /**
     * Format date - handles both Unix timestamps and ISO strings
     */
    static formatDate(dateValue) {
        if (!dateValue) return '';
        
        let date;
        
        // Check if it's a Unix timestamp (number or numeric string)
        if (typeof dateValue === 'number' || /^\d+$/.test(dateValue)) {
            // Unix timestamp - multiply by 1000 if needed
            const timestamp = Number(dateValue);
            // Check if timestamp is in seconds (less than year 10000) or milliseconds
            date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
        } else {
            // Assume ISO string or other date format
            date = new Date(dateValue);
        }
        
        // Check for invalid date
        if (isNaN(date.getTime())) {
            console.warn('Invalid date value:', dateValue);
            return 'Invalid date';
        }
        
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    /**
     * Show confirmation dialog
     */
    static showConfirmationDialog(title, message, onConfirm, onCancel = null) {
        // Remove any existing confirmation dialog
        const existingDialog = document.getElementById('confirmationDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create dialog HTML
        const dialog = document.createElement('div');
        dialog.id = 'confirmationDialog';
        dialog.className = 'modal-backdrop confirmation-dialog';
        
        dialog.innerHTML = `
            <div class="modal confirmation-modal">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                </div>
                <div class="modal-body">
                    <p>${this.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Remove</button>
                </div>
            </div>
        `;

        // Add event listeners
        const cancelBtn = dialog.querySelector('.cancel-btn');
        const confirmBtn = dialog.querySelector('.confirm-btn');
        
        const cleanup = () => {
            dialog.remove();
        };

        cancelBtn.addEventListener('click', () => {
            cleanup();
            if (onCancel) onCancel();
        });

        confirmBtn.addEventListener('click', () => {
            cleanup();
            onConfirm();
        });

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                cleanup();
                if (onCancel) onCancel();
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', escapeHandler);
                if (onCancel) onCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Add to DOM and show
        document.body.appendChild(dialog);
        
        // Show the modal (add the show class)
        setTimeout(() => {
            dialog.classList.add('show');
            confirmBtn.focus();
        }, 10);
    }

    /**
     * Show color picker modal for a company
     */
    static showColorPicker(companyId, companyName) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop color-picker-modal';
        modal.id = 'colorPickerModal';
        
        const savedColors = this.getSavedCompanyColors();
        const currentColor = savedColors[companyId];
        
        modal.innerHTML = `
            <div class="modal color-picker-modal-content">
                <div class="modal-header">
                    <h3>Choose Color for ${this.escapeHtml(companyName)}</h3>
                    <button class="btn btn-icon btn-ghost" onclick="UIComponents.hideColorPicker()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="color-palette">
                        ${this.COLOR_PALETTE.map(color => `
                            <button class="color-option ${currentColor && currentColor.value === color.value ? 'selected' : ''}"
                                    style="background-color: ${color.value};"
                                    onclick="UIComponents.selectCompanyColor(${companyId}, '${color.value}', '${color.contrast}', '${color.name}')"
                                    title="${color.name}"
                                    data-color="${color.value}">
                                <i class="fa-solid fa-check" style="color: ${color.contrast};"></i>
                            </button>
                        `).join('')}
                    </div>
                    <div class="color-actions">
                        <button class="btn btn-ghost" onclick="UIComponents.resetCompanyColor(${companyId})">
                            <i class="fa-solid fa-rotate-left"></i>
                            Reset to Default
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show the modal
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Add escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideColorPicker();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        modal.dataset.escapeHandler = 'true';
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideColorPicker();
            }
        });
    }

    /**
     * Hide color picker modal
     */
    static hideColorPicker() {
        const modal = document.getElementById('colorPickerModal');
        if (modal) {
            modal.remove();
            // Remove escape key handler
            document.removeEventListener('keydown', arguments.callee);
        }
    }

    /**
     * Select a color for a company
     */
    static selectCompanyColor(companyId, colorValue, contrastColor, colorName) {
        const savedColors = this.getSavedCompanyColors();
        savedColors[companyId] = {
            value: colorValue,
            contrast: contrastColor,
            name: colorName
        };
        
        localStorage.setItem('companyColors', JSON.stringify(savedColors));
        
        // Update the UI
        this.applyCompanyColor(companyId, colorValue, contrastColor);
        this.hideColorPicker();
        
        // Show success toast
        this.showToast(`Applied ${colorName} theme to company`, 'success');
    }

    /**
     * Reset company color to default
     */
    static resetCompanyColor(companyId) {
        const savedColors = this.getSavedCompanyColors();
        delete savedColors[companyId];
        localStorage.setItem('companyColors', JSON.stringify(savedColors));
        
        // Reset the UI to default styling
        this.applyCompanyColor(companyId, null, null);
        this.hideColorPicker();
        
        this.showToast('Reset to default theme', 'success');
    }

    /**
     * Apply color theme to company elements
     */
    static applyCompanyColor(companyId, colorValue, contrastColor) {
        // Update company block styling (since we removed individual icons)
        const companyElement = document.querySelector(`[data-company-id="${companyId}"]`);
        if (companyElement) {
            if (colorValue) {
                // Apply a subtle colored border to the company block
                companyElement.style.borderColor = colorValue;
                companyElement.style.background = `linear-gradient(135deg, ${colorValue} 0%, ${colorValue}dd 100%)`;
            } else {
                // Reset to default styling
                companyElement.style.borderColor = '';
                companyElement.style.background = '';
            }
        }
        
        // Update related project/agreement icons
        this.updateProgressBlockIcons(companyId, colorValue, contrastColor);
    }

    /**
     * Update progress block styling with company theme
     */
    static updateProgressBlockIcons(companyId, colorValue, contrastColor) {
        // Find all progress blocks for this company's items
        const progressBlocks = document.querySelectorAll('.compact-progress-block');
        
        progressBlocks.forEach(block => {
            // Check if this block belongs to the company
            const blockCompanyId = block.dataset.companyId;
            if (blockCompanyId == companyId) {
                if (colorValue) {
                    // Apply company color to the left border bar
                    block.style.setProperty('--company-color', colorValue);
                    // Use CSS custom property to style the ::before pseudo-element
                    block.style.setProperty('--border-color', colorValue);
                } else {
                    // Reset to default
                    block.style.removeProperty('--company-color');
                    block.style.removeProperty('--border-color');
                }
            }
        });
    }

    /**
     * Get saved company colors from localStorage
     */
    static getSavedCompanyColors() {
        try {
            const saved = localStorage.getItem('companyColors');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading company colors:', error);
            return {};
        }
    }

    /**
     * Apply all saved company colors on page load
     */
    static applySavedCompanyColors() {
        const savedColors = this.getSavedCompanyColors();
        
        Object.entries(savedColors).forEach(([companyId, color]) => {
            this.applyCompanyColor(companyId, color.value, color.contrast);
        });
    }
}

// Export to window
window.UIComponents = UIComponents;
