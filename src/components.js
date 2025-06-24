/**
 * Reusable UI Components
 */

class UIComponents {
    /**
     * Create a company card element
     */
    static createCompanyCard(company, isActive = false) {
        const card = document.createElement('div');
        card.className = `company-card ${isActive ? 'active' : ''}`;
        card.dataset.companyId = company.id;
        
        // Get initials for icon
        const initials = company.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        card.innerHTML = `
            <div class="company-card-header">
                <div class="company-icon">${initials}</div>
                <div class="company-info">
                    <div class="company-name">${this.escapeHtml(company.name)}</div>
                    <div class="company-meta">
                        ${company.itemCount || 0} items
                    </div>
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
                metaInfo = `Company: ${item.company_name || 'Unknown'}`;
                break;
            case 'agreement':
                typeLabel = 'Agreement';
                metaInfo = `Company: ${item.company_name || 'Unknown'}`;
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
     * Format date
     */
    static formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
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
}

// Export to window
window.UIComponents = UIComponents;
