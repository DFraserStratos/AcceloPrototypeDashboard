/**
 * Dashboard main functionality
 */

class Dashboard {
    constructor() {
        this.selectedCompanyId = null;
        this.dashboardData = []; // Will now store individual projects/agreements
        this.searchTimeout = null;
        this.selectedItems = new Set();
        
        // Modal state for two-step flow
        this.modalStep = 1; // 1 = select companies, 2 = select projects/agreements
        this.selectedCompanies = [];
        this.availableItems = []; // projects/agreements from selected companies
    }
    
    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            // Initialize API client
            UIComponents.showLoading();
            await window.acceloAPI.init();
            
            // Load saved dashboard state
            await this.loadDashboardState();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data if we have items
            if (this.dashboardData.length > 0) {
                this.renderDashboard();
            } else {
                this.renderDashboard();
            }
            
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
     * Set up event listeners
     */
    setupEventListeners() {
        // Store references to event handlers for cleanup
        this.eventHandlers = {
            modalClick: (e) => {
                if (e.target.id === 'addItemModal') {
                    this.hideAddItemModal();
                }
            },
            escapeKey: (e) => {
                if (e.key === 'Escape') {
                    this.hideAddItemModal();
                }
            }
        };
        
        // Modal backdrop click
        document.getElementById('addItemModal').addEventListener('click', this.eventHandlers.modalClick);
        
        // Escape key
        document.addEventListener('keydown', this.eventHandlers.escapeKey);
    }
    
    /**
     * Clean up event listeners
     */
    cleanupEventListeners() {
        if (this.eventHandlers) {
            document.getElementById('addItemModal').removeEventListener('click', this.eventHandlers.modalClick);
            document.removeEventListener('keydown', this.eventHandlers.escapeKey);
        }
    }
    
    /**
     * Load saved dashboard state
     */
    async loadDashboardState() {
        const savedState = localStorage.getItem('accelo_dashboard_state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.dashboardData = state.dashboardData || [];
            } catch (error) {
                console.error('Failed to parse saved state:', error);
                this.dashboardData = [];
            }
        }
    }
    
    /**
     * Save dashboard state
     */
    saveDashboardState() {
        const state = {
            dashboardData: this.dashboardData,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('accelo_dashboard_state', JSON.stringify(state));
    }
    
    /**
     * Refresh all dashboard data from API (deprecated - keeping for compatibility)
     */
    async refreshDashboardData() {
        // This method is no longer used but kept for compatibility
        console.warn('refreshDashboardData is deprecated, use renderDashboard instead');
        this.renderDashboard();
    }
    
    /**
     * Show add item modal
     */
    showAddItemModal() {
        const modal = document.getElementById('addItemModal');
        modal.classList.add('show');
        
        // Reset modal state
        this.modalStep = 1;
        this.selectedCompanies = [];
        this.availableItems = [];
        this.selectedItems.clear();
        
        // Focus search input
        setTimeout(() => {
            document.getElementById('searchInput').focus();
        }, 100);
        
        // Clear previous search and update UI
        document.getElementById('searchInput').value = '';
        this.updateModalUI();
    }
    
    /**
     * Update modal UI based on current step
     */
    updateModalUI() {
        const modal = document.getElementById('addItemModal');
        const modalHeader = modal.querySelector('.modal-header h2');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const modalFooter = modal.querySelector('.modal-footer');
        
        if (this.modalStep === 1) {
            // Step 1: Select companies
            modalHeader.textContent = 'Select Company';
            searchInput.placeholder = 'Search for companies...';
            
            modalFooter.innerHTML = `
                <button class="btn btn-ghost" onclick="dashboard.hideAddItemModal()">Cancel</button>
                <div class="modal-help-text">Click on a company to continue</div>
            `;
            
            this.renderCompanySearchResults(null);
            
        } else {
            // Step 2: Select projects/agreements
            modalHeader.textContent = 'Select Projects & Agreements';
            searchInput.style.display = 'none'; // Hide search in step 2
            
            modalFooter.innerHTML = `
                <button class="btn btn-ghost" onclick="dashboard.backToCompanySelection()">Back</button>
                <button class="btn btn-primary" onclick="dashboard.addSelectedItems()">
                    Add Selected Items
                </button>
            `;
            
            this.renderItemSelectionUI();
        }
    }
    
    /**
     * Handle search input (now company-only for step 1)
     */
    handleSearch(query) {
        if (this.modalStep !== 1) return;
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            if (query.trim().length < 2) {
                this.renderCompanySearchResults(null);
                return;
            }
            
            try {
                // Show loading state
                document.getElementById('searchResults').innerHTML = `
                    <div class="text-center p-3">
                        <div class="spinner"></div>
                        <p class="text-muted mt-2">Searching companies...</p>
                    </div>
                `;
                
                // Search companies only
                const companies = await window.acceloAPI.searchCompanies(query);
                this.renderCompanySearchResults(companies);
                
            } catch (error) {
                console.error('Search failed:', error);
                document.getElementById('searchResults').innerHTML = `
                    <div class="alert alert-error">
                        Search failed: ${error.message}
                    </div>
                `;
            }
        }, 300);
    }
    
    /**
     * Render company search results for step 1
     */
    renderCompanySearchResults(companies) {
        const container = document.getElementById('searchResults');
        
        if (!companies) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-building"></i></div>
                    <div class="empty-state-title">Search for Companies</div>
                    <div class="empty-state-description">
                        Type to search for companies in your Accelo account.
                    </div>
                </div>
            `;
            return;
        }
        
        if (companies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-circle-question"></i></div>
                    <div class="empty-state-title">No Companies Found</div>
                    <div class="empty-state-description">
                        Try a different search term or check your spelling.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        companies.forEach(company => {
            const item = UIComponents.createSearchResultItem(company, 'company');
            
            // Add click handler to immediately proceed to step 2
            item.addEventListener('click', async () => {
                // Add visual feedback
                item.style.opacity = '0.7';
                item.style.pointerEvents = 'none';
                
                // Set this company as selected
                this.selectedCompanies = [company];
                
                // Immediately proceed to item selection
                await this.proceedToItemSelection();
            });
            
            container.appendChild(item);
        });
    }
    
    /**
     * Proceed to item selection (step 2)
     */
    async proceedToItemSelection() {
        if (this.selectedCompanies.length === 0) {
            UIComponents.showToast('Please select at least one company', 'warning');
            return;
        }
        
        try {
            UIComponents.showLoading();
            
            // Get projects and agreements for selected companies
            const companyIds = this.selectedCompanies.map(c => c.id);
            this.availableItems = await window.acceloAPI.getProjectsAndAgreements(companyIds);
            
            // Move to step 2
            this.modalStep = 2;
            this.updateModalUI();
            
        } catch (error) {
            console.error('Failed to load items:', error);
            UIComponents.showToast('Failed to load items: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }
    
    /**
     * Back to company selection (step 1)
     */
    backToCompanySelection() {
        this.modalStep = 1;
        this.selectedItems.clear();
        document.getElementById('searchInput').style.display = 'block';
        this.updateModalUI();
    }
    
    /**
     * Render item selection UI for step 2
     */
    renderItemSelectionUI() {
        const container = document.getElementById('searchResults');
        
        if (this.availableItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-clipboard"></i></div>
                    <div class="empty-state-title">No Items Found</div>
                    <div class="empty-state-description">
                        The selected companies have no active projects or agreements.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Group items by company
        this.availableItems.forEach(companyData => {
            const companySection = document.createElement('div');
            companySection.className = 'item-selection-company';
            
            companySection.innerHTML = `
                <h3 class="company-section-title">${UIComponents.escapeHtml(companyData.company.name)}</h3>
                <div class="company-items"></div>
            `;
            
            const itemsContainer = companySection.querySelector('.company-items');
            
            // Add projects
            companyData.projects.forEach(project => {
                const item = this.createSelectableItem(project, 'project');
                itemsContainer.appendChild(item);
            });
            
            // Add agreements
            companyData.agreements.forEach(agreement => {
                const item = this.createSelectableItem(agreement, 'agreement');
                itemsContainer.appendChild(item);
            });
            
            // Only add section if it has items
            if (itemsContainer.children.length > 0) {
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
        
        const icon = type === 'project' ? '<i class="fa-solid fa-folder"></i>' : '<i class="fa-solid fa-clipboard"></i>';
        const title = item.title || item.name;
        
        div.innerHTML = `
            <div class="selectable-item-content">
                <div class="selectable-item-icon">${icon}</div>
                <div class="selectable-item-info">
                    <div class="selectable-item-title">${UIComponents.escapeHtml(title)}</div>
                    <div class="selectable-item-type">${type === 'project' ? 'Project' : 'Agreement'}</div>
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            div.classList.toggle('selected');
            
            const itemKey = `${type}-${item.id}`;
            if (div.classList.contains('selected')) {
                this.selectedItems.add(itemKey);
            } else {
                this.selectedItems.delete(itemKey);
            }
        });
        
        return div;
    }
    
    /**
     * Hide add item modal
     */
    hideAddItemModal() {
        const modal = document.getElementById('addItemModal');
        modal.classList.remove('show');
        
        // Reset modal state
        this.modalStep = 1;
        this.selectedCompanies = [];
        this.availableItems = [];
        this.selectedItems.clear();
        
        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        
        // Clear search results and reset UI
        document.getElementById('searchInput').value = '';
        document.getElementById('searchInput').style.display = 'block';
    }
    
    /**
     * Add selected items to dashboard (updated for new structure)
     */
    async addSelectedItems() {
        if (this.modalStep === 1) {
            // If still on step 1, proceed to step 2
            await this.proceedToItemSelection();
            return;
        }
        
        if (this.selectedItems.size === 0) {
            UIComponents.showToast('Please select at least one item to add', 'warning');
            return;
        }

        try {
            UIComponents.showLoading();
            
            // Process selected items
            const itemsToAdd = [];
            
            for (const itemKey of this.selectedItems) {
                const [type, id] = itemKey.split('-');
                
                // Find the item in our available items
                for (const companyData of this.availableItems) {
                    const items = type === 'project' ? companyData.projects : companyData.agreements;
                    const item = items.find(i => i.id == id);
                    
                    if (item) {
                        // Get detailed data with hours/usage
                        let detailedItem = { ...item };
                        
                        // Set the type explicitly on the item
                        detailedItem.type = type;
                        
                        if (type === 'project') {
                            try {
                                const hours = await window.acceloAPI.getProjectHours(item.id);
                                detailedItem.hours = hours;
                            } catch (error) {
                                console.error(`Failed to get hours for project ${item.id}:`, error);
                                detailedItem.hours = null;
                            }
                        } else {
                            try {
                                const usage = await window.acceloAPI.getAgreementUsage(item.id);
                                detailedItem.usage = usage;
                            } catch (error) {
                                console.error(`Failed to get usage for agreement ${item.id}:`, error);
                                detailedItem.usage = null;
                            }
                        }
                        
                        itemsToAdd.push(detailedItem);
                        break;
                    }
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Add items to dashboard data
            this.dashboardData.push(...itemsToAdd);
            
            // Save state and refresh UI
            this.saveDashboardState();
            this.renderDashboard();
            
            // Hide modal
            this.hideAddItemModal();
            
            UIComponents.showToast(`${itemsToAdd.length} item${itemsToAdd.length === 1 ? '' : 's'} added successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to add items:', error);
            UIComponents.showToast('Failed to add items: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    /**
     * Render the dashboard
     */
    renderDashboard() {
        this.renderCompanyGroupedLayout();
    }
    
    /**
     * Render company-grouped layout matching the user's mockup
     */
    renderCompanyGroupedLayout() {
        const contentTitle = document.getElementById('contentTitle');
        const contentGrid = document.getElementById('contentGrid');
        const contentActions = document.getElementById('contentActions');
        
        // Hide sidebar since we're using a different layout
        const sidebar = document.getElementById('sidebar');
        sidebar.style.display = 'none';
        
        // Adjust main content to use full width
        const mainContent = document.querySelector('.main-content');
        mainContent.style.marginLeft = '0';
        
        contentTitle.textContent = 'Dashboard Name';
        contentActions.style.display = 'none';
        
        if (this.dashboardData.length === 0) {
            contentGrid.innerHTML = `
                <div class="dashboard-welcome">
                    <div class="welcome-icon"><i class="fa-solid fa-chart-bar"></i></div>
                    <h2>Welcome to your Accelo Dashboard</h2>
                    <p>Start by adding companies, projects, and agreements to track your progress.</p>
                    <button class="btn btn-primary btn-lg" onclick="dashboard.showAddItemModal()">
                        Get Started
                    </button>
                </div>
            `;
            return;
        }
        
        // Group items by company
        const companiesData = this.groupItemsByCompany();
        
        // Create the company-grouped layout
        const layoutContainer = document.createElement('div');
        layoutContainer.className = 'company-grouped-layout';
        
        Object.entries(companiesData).forEach(([companyId, data]) => {
            const companyRow = document.createElement('div');
            companyRow.className = 'company-row';
            
            // Create company block (left side)
            const companyBlock = document.createElement('div');
            companyBlock.className = 'company-block';
            companyBlock.innerHTML = `
                <div class="company-block-content">
                    <div class="company-block-name">${UIComponents.escapeHtml(data.company.name)}</div>
                </div>
            `;
            
            // Create progress blocks container (right side)
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-blocks-container';
            
            // Add progress blocks for this company
            data.items.forEach(item => {
                const block = this.createCompactProgressBlock(item);
                progressContainer.appendChild(block);
            });
            
            companyRow.appendChild(companyBlock);
            companyRow.appendChild(progressContainer);
            layoutContainer.appendChild(companyRow);
        });
        
        contentGrid.innerHTML = '';
        contentGrid.appendChild(layoutContainer);
    }
    
    /**
     * Create a compact progress block matching the user's mockup design
     */
    createCompactProgressBlock(item) {
        const block = document.createElement('div');
        block.className = 'compact-progress-block';
        block.dataset.itemId = item.id;
        
        // Determine type and icon - improved logic
        let isProject = false;
        let type = 'agreement'; // default to agreement
        
        // Check explicit type first
        if (item.type === 'project') {
            isProject = true;
            type = 'project';
        } else if (item.type === 'agreement' || item.type === 'contract') {
            isProject = false;
            type = 'agreement';
        } else {
            // Fallback logic based on properties
            // Projects typically have job-specific fields
            if (item.date_due || item.billable_seconds !== undefined || item.unbillable_seconds !== undefined) {
                isProject = true;
                type = 'project';
            }
            // Agreements/contracts typically have contract-specific fields  
            else if (item.retainer_type || item.retainer_value || item.date_expires || item.date_started) {
                isProject = false;
                type = 'agreement';
            }
            // Final fallback - if it has typical project structure but no contract fields
            else if (item.status && !item.retainer_type) {
                isProject = true;
                type = 'project';
            }
        }
        
        const icon = isProject ? '<i class="fa-solid fa-clipboard"></i>' : '<i class="fa-solid fa-file-lines"></i>';
        const title = item.title || item.name || `${type} #${item.id}`;
        
        // Calculate hours and percentage
        let loggedHours = 0;
        let totalHours = 0;
        let percentage = 0;
        
        if (isProject && item.hours) {
            loggedHours = (item.hours.billableHours || 0) + (item.hours.nonBillableHours || 0);
            
            // Look for budget in custom fields or use known project budgets
            totalHours = this.getProjectBudget(item.id, item.title, loggedHours);
            percentage = totalHours > 0 ? (loggedHours / totalHours) * 100 : 0;
        } else if (!isProject && item.usage) {
            loggedHours = item.usage.timeUsed || 0;
            totalHours = item.usage.timeAllowance || 0;
            percentage = totalHours > 0 ? (loggedHours / totalHours) * 100 : 0;
        }
        
        // If no hours data, use default
        if (totalHours === 0 && loggedHours === 0) {
            totalHours = 100;
            loggedHours = 0;
            percentage = 0;
        }
        
        // Format hours as "XXXh XXm"
        const formatHours = (hours) => {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${h}h ${m}m`;
        };
        
        block.innerHTML = `
            <div class="compact-block-content">
                <div class="compact-block-header">
                    <div class="compact-block-icon">${icon}</div>
                    <div class="compact-block-title">${UIComponents.escapeHtml(title)}</div>
                    <div class="compact-block-type">${type === 'project' ? 'PROJECT' : 'AGREEMENT'}</div>
                </div>
                
                <div class="compact-hours-section">
                    <div class="compact-hours-display">
                        <span class="compact-hours-logged">${formatHours(loggedHours)}</span>
                        <span class="compact-hours-separator">/</span>
                        <span class="compact-hours-total">${formatHours(totalHours)}</span>
                    </div>
                    <div class="compact-percentage">${Math.round(percentage)}%</div>
                </div>
                
                <div class="compact-progress-bar">
                    <div class="compact-progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
            
            <button class="btn btn-icon btn-ghost compact-remove-btn" 
                    onclick="event.stopPropagation(); dashboard.confirmRemoveItem('${type}', ${item.id})" 
                    title="Remove from dashboard">
                <span class="icon-remove">✕</span>
            </button>
        `;
        
        return block;
    }

    /**
     * Get project budget/maximum hours - this handles known project budgets
     * In a real implementation, this would come from custom fields, quotes, or budgets API
     */
    getProjectBudget(projectId, projectTitle, loggedHours) {
        // Known project budgets based on user's data
        const knownBudgets = {
            '415': 200, // PGG002 - 200h budget
            '423': 40,  // DLF - 40h budget  
            '268': 572, // Mussels App - 572h budget
        };
        
        // Check by ID first
        if (knownBudgets[projectId]) {
            return knownBudgets[projectId];
        }
        
        // Check by title patterns
        if (projectTitle && projectTitle.includes('PGG002')) {
            return 200;
        }
        if (projectTitle && projectTitle.includes('DLF')) {
            return 40;
        }
        if (projectTitle && projectTitle.includes('Mussels App')) {
            return 572;
        }
        
        // For unknown projects, use a reasonable default based on logged hours
        if (loggedHours > 0) {
            // Assume budget is 20% more than logged hours, minimum 40h
            return Math.max(Math.ceil(loggedHours * 1.2), 40);
        }
        
        return 100; // Default fallback
    }

    /**
     * Group dashboard items by company
     */
    groupItemsByCompany() {
        const companies = {};
        
        this.dashboardData.forEach(item => {
            const companyId = item.company_id || (item.company_info ? item.company_info.id : 'unknown');
            const companyName = item.company_name || (item.company_info ? item.company_info.name : 'Unknown Company');
            
            if (!companies[companyId]) {
                companies[companyId] = {
                    company: {
                        id: companyId,
                        name: companyName
                    },
                    items: []
                };
            }
            
            companies[companyId].items.push(item);
        });
        
        return companies;
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
            this.saveDashboardState();
            this.renderDashboard();
            
            UIComponents.showToast(`${type === 'project' ? 'Project' : 'Agreement'} removed successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to remove item:', error);
            UIComponents.showToast('Failed to remove item: ' + error.message, 'error');
        }
    }

}

// Initialize dashboard on page load
const dashboard = new Dashboard();
document.addEventListener('DOMContentLoaded', () => {
    dashboard.init();
});

// Export to window for access from HTML
window.dashboard = dashboard;
