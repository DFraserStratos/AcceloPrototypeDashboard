/**
 * Dashboard main functionality
 */
import ArrowManager from './managers/arrow-manager.js';
import TickerManager from './managers/ticker-manager.js';
import CompanyColorManager from './managers/company-color-manager.js';
import EventManager from './managers/event-manager.js';
import RenderManager from './managers/render-manager.js';
import ModalManager from './managers/modal-manager.js';
import DataManager from './managers/data-manager.js';
import DragDropManager from './managers/drag-drop-manager.js';

class Dashboard {
    constructor() {
        this.selectedCompanyId = null;
        this.dashboardData = []; // Will now store individual projects/agreements
        this.searchTimeout = null;
        this.selectedItems = new Set();
        
        // Dashboard management
        this.currentDashboardId = null;
        this.companyColors = {};
        
        // Modal state for two-step flow
        this.modalStep = 1; // 1 = select companies, 2 = select projects/agreements
        this.selectedCompanies = [];
        this.availableItems = []; // projects/agreements from selected companies
        
        // Add company order tracking
        this.companyOrder = []; // Track the explicit order of companies
        
        // Initialize managers
        this.arrowManager = new ArrowManager(this);
        this.tickerManager = new TickerManager(this);
        this.companyColorManager = new CompanyColorManager(this);
        this.eventManager = new EventManager(this);
        this.renderManager = new RenderManager(this);
        this.modalManager = new ModalManager(this);
        this.dataManager = new DataManager(this);
        this.dragDropManager = new DragDropManager(this);
    }
    
    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            // Initialize API client
            UIComponents.showLoading();
            await window.acceloAPI.init();
            
            // Initialize dashboard manager
            await window.dashboardManager.init();
            
            // Handle routing and dashboard selection
            await this.dataManager.handleRouting();
            
            // Load saved dashboard state
            await this.dataManager.loadDashboardState();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize managers
            this.arrowManager.init();
            this.tickerManager.init();
            this.companyColorManager.init();
            this.eventManager.init();
            this.renderManager.init();
            this.modalManager.init();
            this.dataManager.init();
            this.dragDropManager.init();
            
            // Load initial data if we have items
            if (this.dashboardData.length > 0) {
                this.renderManager.renderDashboard();
            } else {
                this.renderManager.renderDashboard();
            }
            
            // Apply saved company colors after rendering
            setTimeout(() => {
                this.applySavedCompanyColors();
            }, 100);
            
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            UIComponents.showToast(error.message, 'error');
            
            // If not configured, redirect to settings
            if (error.message.includes('settings')) {
                setTimeout(() => {
                    window.location.href = '/settings';
                }, 2000);
            }
        } finally {
            UIComponents.hideLoading();
        }
    }



    /**
     * Show dashboard rename modal
     */
    showDashboardRenameModal(currentName) {
        return this.modalManager.showDashboardRenameModal(currentName);
    }

    /**
     * Save dashboard rename
     */
    saveDashboardRename() {
        return this.modalManager.saveDashboardRename();
    }

    /**
     * Cancel dashboard rename
     */
    cancelDashboardRename() {
        return this.modalManager.cancelDashboardRename();
    }

    /**
     * Hide dashboard rename modal
     */
    hideDashboardRenameModal() {
        return this.modalManager.hideDashboardRenameModal();
    }

    /**
     * Refresh dashboard data - delegates to DataManager
     */
    refreshDashboardData() {
        return this.dataManager.refreshDashboardData();
    }

    /**
     * Update dashboard name badge - delegates to DataManager
     */
    updateDashboardNameBadge(dashboardName) {
        return this.dataManager.updateDashboardNameBadge(dashboardName);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Delegate basic event listeners to EventManager
        this.eventManager.setupBasicEventListeners();
    }
    
    /**
     * Clean up event listeners
     */
    cleanupEventListeners() {
        // Delegate basic event cleanup to EventManager
        this.eventManager.cleanupBasicEventListeners();
        
        // Clean up managers
        this.arrowManager.cleanup();
        this.tickerManager.cleanup();
        this.dragDropManager.cleanup();
    }
    

    

    

    

    

    
    /**
     * Show add item modal
     */
    showAddItemModal() {
        return this.modalManager.showAddItemModal();
    }
    
    /**
     * Update modal UI based on current step
     */
    updateModalUI() {
        return this.modalManager.updateModalUI();
    }
    
    /**
     * Handle search input (now company-only for step 1)
     */
    handleSearch(query) {
        return this.modalManager.handleSearch(query);
    }
    
    /**
     * Render company search results for step 1
     */
    renderCompanySearchResults(companies) {
        return this.modalManager.renderCompanySearchResults(companies);
    }
    
    /**
     * Proceed to item selection (step 2)
     */
        async proceedToItemSelection() {
        return this.modalManager.proceedToItemSelection();
    }

    /**
     * Back to company selection (step 1)
     */
    backToCompanySelection() {
        return this.modalManager.backToCompanySelection();
    }
    
    /**
     * Render item selection UI for step 2
     */
    renderItemSelectionUI() {
        return this.modalManager.renderItemSelectionUI();
    }

    /**
     * Create selectable item for step 2
     */
    createSelectableItem(item, type) {
        return this.modalManager.createSelectableItem(item, type);
    }

    /**
     * Update selection counter in modal footer
     */
    updateSelectionCounter() {
        return this.modalManager.updateSelectionCounter();
    }

    /**
     * Add selected items to the dashboard
     */
    async addSelectedItems() {
        return this.modalManager.addSelectedItems();
    }

    // TODO: The methods below need to be cleaned up after testing
    _originalRenderItemSelectionUI() {
        const container = document.getElementById('searchResults');
        
        if (this.availableItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-inbox"></i></div>
                    <div class="empty-state-title">No Items Available</div>
                    <div class="empty-state-description">
                        ${UIComponents.escapeHtml(this.selectedCompanies[0].name)} has no active projects or agreements.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Count total items
        let totalProjects = 0;
        let totalAgreements = 0;
        this.availableItems.forEach(companyData => {
            totalProjects += companyData.projects.length;
            totalAgreements += companyData.agreements.length;
        });
        
        // Add header with item counts
        const headerDiv = document.createElement('div');
        headerDiv.className = 'items-selection-header';
        headerDiv.innerHTML = `
            <div class="items-count-summary">
                <div class="count-item">
                    <i class="fa-solid fa-diagram-project"></i>
                    <span>${totalProjects} Project${totalProjects !== 1 ? 's' : ''}</span>
                </div>
                <div class="count-item">
                    <i class="fa-solid fa-file-contract"></i>
                    <span>${totalAgreements} Agreement${totalAgreements !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="selection-actions">
                <button class="btn btn-sm btn-ghost" onclick="dashboard.selectAllItems()">
                    <i class="fa-solid fa-check-double"></i>
                    Select All
                </button>
                <button class="btn btn-sm btn-ghost" onclick="dashboard.clearAllItems()">
                    <i class="fa-solid fa-times"></i>
                    Clear All
                </button>
            </div>
        `;
        container.appendChild(headerDiv);
        
        // Group items by company
        this.availableItems.forEach(companyData => {
            const companySection = document.createElement('div');
            companySection.className = 'item-selection-company';
            
            // Only show company header if there are multiple companies (future-proofing)
            if (this.selectedCompanies.length > 1) {
                const companyHeader = document.createElement('div');
                companyHeader.className = 'company-section-header';
                companyHeader.innerHTML = `
                    <div class="company-section-title">
                        <i class="fa-solid fa-building"></i>
                        ${UIComponents.escapeHtml(companyData.company.name)}
                    </div>
                `;
                companySection.appendChild(companyHeader);
            }
            
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'company-items';
            
            // Add projects first
            if (companyData.projects.length > 0) {
                const projectsGroup = document.createElement('div');
                projectsGroup.className = 'items-group';
                projectsGroup.innerHTML = `
                    <div class="items-group-header">
                        <h4 class="items-group-title">
                            <i class="fa-solid fa-diagram-project"></i>
                            Projects (${companyData.projects.length})
                        </h4>
                    </div>
                    <div class="items-group-content"></div>
                `;
                
                const projectsContainer = projectsGroup.querySelector('.items-group-content');
                companyData.projects.forEach(project => {
                    const item = this.createSelectableItem(project, 'project');
                    projectsContainer.appendChild(item);
                });
                
                itemsContainer.appendChild(projectsGroup);
            }
            
            // Add agreements
            if (companyData.agreements.length > 0) {
                const agreementsGroup = document.createElement('div');
                agreementsGroup.className = 'items-group';
                agreementsGroup.innerHTML = `
                    <div class="items-group-header">
                        <h4 class="items-group-title">
                            <i class="fa-solid fa-file-contract"></i>
                            Agreements (${companyData.agreements.length})
                        </h4>
                    </div>
                    <div class="items-group-content"></div>
                `;
                
                const agreementsContainer = agreementsGroup.querySelector('.items-group-content');
                companyData.agreements.forEach(agreement => {
                    const item = this.createSelectableItem(agreement, 'agreement');
                    agreementsContainer.appendChild(item);
                });
                
                itemsContainer.appendChild(agreementsGroup);
            }
            
            // Only add section if it has items
            if (itemsContainer.children.length > 0) {
                companySection.appendChild(itemsContainer);
                container.appendChild(companySection);
            }
        });
    }
    
    /**
     * Create selectable item for step 2
     */
    createSelectableItem(item, type) {
        const div = document.createElement('div');
        div.className = 'selectable-item';
        div.dataset.id = item.id;
        div.dataset.type = type;
        
        const icon = type === 'project' ? 'fa-diagram-project' : 'fa-file-contract';
        const title = item.title || item.name;
        const itemKey = `${type}-${item.id}`;
        const isSelected = this.selectedItems.has(itemKey);
        
        // Format additional info
        let additionalInfo = '';
        if (type === 'project') {
            if (item.status) {
                additionalInfo = `Status: ${item.status}`;
            }
            if (item.date_due) {
                const dueDate = UIComponents.formatDate(item.date_due);
                additionalInfo += additionalInfo ? ` • Due: ${dueDate}` : `Due: ${dueDate}`;
            }
        } else if (type === 'agreement') {
            if (item.retainer_type) {
                additionalInfo = `Type: ${item.retainer_type}`;
            }
        }
        
        div.innerHTML = `
            <div class="selectable-item-content">
                <div class="selection-checkbox">
                    <input type="checkbox" id="item-${itemKey}" ${isSelected ? 'checked' : ''}>
                    <label for="item-${itemKey}" class="checkbox-label">
                        <i class="fa-solid fa-check"></i>
                    </label>
                </div>
                <div class="selectable-item-icon">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="selectable-item-info">
                    <div class="selectable-item-title">${UIComponents.escapeHtml(title)}</div>
                    <div class="selectable-item-meta">
                        <span class="item-type-badge ${type}">${type === 'project' ? 'Project' : 'Agreement'}</span>
                        ${additionalInfo ? `<span class="item-additional-info">${UIComponents.escapeHtml(additionalInfo)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        const checkbox = div.querySelector('input[type="checkbox"]');
        
        const toggleSelection = () => {
            const isNowSelected = !this.selectedItems.has(itemKey);
            
            if (isNowSelected) {
                this.selectedItems.add(itemKey);
                div.classList.add('selected');
                checkbox.checked = true;
            } else {
                this.selectedItems.delete(itemKey);
                div.classList.remove('selected');
                checkbox.checked = false;
            }
            
            // Update the selection counter in real-time
            this.updateSelectionCounter();
        };
        
        // Handle clicks on the entire item (including checkbox area)
        div.addEventListener('click', (e) => {
            // Prevent default checkbox behavior if clicking on checkbox elements
            if (e.target.type === 'checkbox' || 
                e.target.classList.contains('checkbox-label') || 
                e.target.closest('.selection-checkbox')) {
                e.preventDefault();
            }
            toggleSelection();
        });
        
        // Add keyboard navigation
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'checkbox');
        div.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        div.setAttribute('aria-label', `${type === 'project' ? 'Project' : 'Agreement'}: ${title}`);
        
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSelection();
            }
        });
        
        // Set initial state
        if (isSelected) {
            div.classList.add('selected');
        }
        
        return div;
    }
    
    /**
     * Update selection counter in modal footer
     */
    updateSelectionCounter() {
        const counter = document.querySelector('.selection-counter .counter-text');
        const addButton = document.querySelector('.modal-footer .btn-primary');
        
        if (counter) {
            const selectedCount = this.selectedItems.size;
            counter.textContent = `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`;
            
            // Update button state
            if (addButton) {
                addButton.disabled = selectedCount === 0;
            }
        }
    }
    
    /**
     * Select all available items
     */
        selectAllItems() {
        return this.modalManager.selectAllItems();
    }

    /**
     * Clear all selected items 
     */
    clearAllItems() {
        return this.modalManager.clearAllItems();
    }

    /**
     * Update selection UI for all items
     */
    updateSelectionUI() {
        return this.modalManager.updateSelectionUI();
    }

    /**
     * Hide add item modal
     */
    hideAddItemModal() {
        return this.modalManager.hideAddItemModal();
    }
    
    /**
     * Add selected items to the dashboard
     */
    async addSelectedItems() {
        if (this.selectedItems.size === 0) {
            UIComponents.showToast('Please select at least one item', 'warning');
            return;
        }
        
        try {
            // Show loading state in the search results area instead of full screen
            document.getElementById('searchResults').innerHTML = `
                <div class="search-loading">
                    <div class="spinner"></div>
                    <p class="search-loading-text">Adding items to dashboard...</p>
                </div>
            `;
            
            // Convert selected items to array with type info
            const itemsToAdd = Array.from(this.selectedItems).map(id => {
                const [type, itemId] = id.split('-');
                return { type, id: itemId };
            });
            
            // Get detailed info for each item
            for (const item of itemsToAdd) {
                try {
                    if (item.type === 'project') {
                        // Get project details and hours
                        const project = await window.acceloAPI.getProject(item.id);
                        const hours = await window.acceloAPI.getProjectHours(item.id);
                        
                        // Debug: Log the project structure to understand company info
                        console.log('Project API response:', project);
                        console.log('Available company fields:', {
                            company: project.company,
                            affiliation: project.affiliation,
                            company_id: project.company_id,
                            company_name: project.company_name
                        });
                        
                        // We know the company from the selection process, so use that instead
                        const selectedCompany = this.selectedCompanies[0];
                        const companyId = String(selectedCompany.id);
                        const companyName = selectedCompany.name;
                        
                        // Add to dashboard data with company info preserved
                        this.dashboardData.push({
                            ...project,
                            type: 'project',
                            hours: hours,
                            company_id: companyId,
                            company_name: companyName,
                            company_info: selectedCompany
                        });
                        
                        // Add company to order if not already there
                        if (!this.companyOrder.includes(companyId)) {
                            this.companyOrder.push(companyId);
                        }
                        
                    } else if (item.type === 'agreement') {
                        // Get agreement details and usage
                        const agreement = await window.acceloAPI.getAgreement(item.id);
                        const usage = await window.acceloAPI.getAgreementUsage(item.id);
                        
                        // Debug: Log the agreement structure to understand company info
                        console.log('Agreement API response:', agreement);
                        console.log('Available company fields:', {
                            company: agreement.company,
                            affiliation: agreement.affiliation,
                            company_id: agreement.company_id,
                            company_name: agreement.company_name
                        });
                        
                        // We know the company from the selection process, so use that instead
                        const selectedCompany = this.selectedCompanies[0];
                        const companyId = String(selectedCompany.id);
                        const companyName = selectedCompany.name;
                        
                        // Add to dashboard data with company info preserved
                        this.dashboardData.push({
                            ...agreement,
                            type: 'agreement',
                            usage: usage,
                            company_id: companyId,
                            company_name: companyName,
                            company_info: selectedCompany
                        });
                        
                        // Add company to order if not already there
                        if (!this.companyOrder.includes(companyId)) {
                            this.companyOrder.push(companyId);
                        }
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Failed to add ${item.type} ${item.id}:`, error);
                    UIComponents.showToast(`Failed to add ${item.type}: ${error.message}`, 'error');
                }
            }
            
            // Save state
            this.dataManager.saveDashboardState();
            
            // Re-render dashboard
            this.renderDashboard();
            
            // Close modal
            this.hideAddItemModal();
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                this.applySavedCompanyColors();
            }, 50);
            
            UIComponents.showToast(`Added ${itemsToAdd.length} item(s) to dashboard`, 'success');
            
        } catch (error) {
            console.error('Failed to add items:', error);
            UIComponents.showToast('Failed to add items: ' + error.message, 'error');
            // Restore the item selection UI on error
            this.renderItemSelectionUI();
        }
    }



    /**
     * Confirm and remove an item from the dashboard
     */
    confirmRemoveItem(type, itemId) {
        const item = this.dashboardData.find(i => i.type === type && i.id == itemId);
        if (!item) return;
        
        const itemType = type === 'project' ? 'project' : 'agreement';
        const title = item.title || item.name;
        
        UIComponents.showConfirmationDialog(
            `Remove ${itemType}`,
            `Are you sure you want to remove "${title}" from your dashboard?`,
            () => this.removeItem(type, itemId)
        );
    }

    /**
     * Remove an item from the dashboard
     */
    removeItem(type, itemId) {
        try {
            // Remove from dashboard data
            this.dashboardData = this.dashboardData.filter(item => !(item.type === type && item.id == itemId));
            
            // Save state and refresh UI
            this.dataManager.saveDashboardState();
            this.renderDashboard();
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                this.applySavedCompanyColors();
            }, 50);
            
            UIComponents.showToast(`${type === 'project' ? 'Project' : 'Agreement'} removed successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to remove item:', error);
            UIComponents.showToast('Failed to remove item: ' + error.message, 'error');
        }
    }

    /**
     * Apply saved company colors for this dashboard
     */
    applySavedCompanyColors() {
        return this.companyColorManager.applySavedCompanyColors();
    }

    /**
     * Apply company color to all elements
     */
    applyCompanyColor(companyId, colorValue, contrastColor) {
        return this.companyColorManager.applyCompanyColor(companyId, colorValue, contrastColor);
    }

    /**
     * Save company color for this dashboard
     */
    saveCompanyColor(companyId, colorValue, contrastColor, colorName) {
        return this.companyColorManager.saveCompanyColor(companyId, colorValue, contrastColor, colorName);
    }

    /**
     * Remove company color for this dashboard
     */
    removeCompanyColor(companyId) {
        return this.companyColorManager.removeCompanyColor(companyId);
    }

    /**
     * Render the dashboard - delegates to RenderManager
     */
    renderDashboard() {
        return this.renderManager.renderDashboard();
    }

    /**
     * Render company-grouped layout - delegates to RenderManager
     */
    renderCompanyGroupedLayout() {
        return this.renderManager.renderCompanyGroupedLayout();
    }

    /**
     * Create compact progress block - delegates to RenderManager
     */
    createCompactProgressBlock(item) {
        return this.renderManager.createCompactProgressBlock(item);
    }

    /**
     * Update company block heights - delegates to RenderManager
     */
    updateCompanyBlockHeights() {
        return this.renderManager.updateCompanyBlockHeights();
    }

    /**
     * Initialize global resizer - delegates to RenderManager
     */
    initializeGlobalResizer() {
        return this.renderManager.initializeGlobalResizer();
    }

    /**
     * Create Accelo URL - delegates to RenderManager
     */
    createAcceloUrl(itemId, type) {
        return this.renderManager.createAcceloUrl(itemId, type);
    }

    /**
     * Get project budget - delegates to RenderManager
     */
    getProjectBudget(projectId, projectTitle, loggedHours) {
        return this.renderManager.getProjectBudget(projectId, projectTitle, loggedHours);
    }

    /**
     * Check if project budget is suspicious - delegates to RenderManager
     */
    isProjectBudgetSuspicious(projectId, projectTitle, loggedHours, budgetHours) {
        return this.renderManager.isProjectBudgetSuspicious(projectId, projectTitle, loggedHours, budgetHours);
    }

    /**
     * Group items by company - delegates to RenderManager
     */
    groupItemsByCompany() {
        return this.renderManager.groupItemsByCompany();
    }

}

// Initialize dashboard on page load
const dashboard = new Dashboard();
document.addEventListener('DOMContentLoaded', () => {
    dashboard.init();
});

// Export to window for access from HTML
window.dashboard = dashboard;

// Global functions for HTML onclick handlers
window.saveDashboardRename = () => dashboard.saveDashboardRename();
window.cancelDashboardRename = () => dashboard.cancelDashboardRename();
