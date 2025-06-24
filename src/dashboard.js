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
                    <div class="empty-state-icon">🏢</div>
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
                    <div class="empty-state-icon">🤷</div>
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
                    <div class="empty-state-icon">📋</div>
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
        
        const icon = type === 'project' ? '📁' : '📋';
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
     * Render entire dashboard (new structure)
     */
    renderDashboard() {
        this.renderItemList();
        this.renderMainContent();
    }

    /**
     * Render item list in sidebar (replaces company list)
     */
    renderItemList() {
        const container = document.getElementById('companyList'); // Reusing existing element
        
        if (this.dashboardData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">No Items Added</div>
                    <div class="empty-state-description">
                        Click "Add Item" to search and add projects or agreements to your dashboard.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Group items by company for sidebar display
        const groupedItems = this.groupItemsByCompany();
        
        Object.entries(groupedItems).forEach(([companyName, items]) => {
            const companySection = document.createElement('div');
            companySection.className = 'company-section';
            
            companySection.innerHTML = `
                <div class="company-section-header">
                    <h3 class="company-section-title">${UIComponents.escapeHtml(companyName)}</h3>
                    <span class="company-item-count">${items.length} item${items.length === 1 ? '' : 's'}</span>
                </div>
                <div class="company-section-items"></div>
            `;
            
            const itemsContainer = companySection.querySelector('.company-section-items');
            
            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = `sidebar-item sidebar-item-${item.type}`;
                itemEl.dataset.itemId = item.id;
                itemEl.dataset.itemType = item.type;
                
                const icon = item.type === 'project' ? '📁' : '📋';
                const title = item.title || item.name;
                
                itemEl.innerHTML = `
                    <div class="sidebar-item-content">
                        <span class="sidebar-item-icon">${icon}</span>
                        <span class="sidebar-item-title">${UIComponents.escapeHtml(title)}</span>
                        <button class="btn btn-icon btn-ghost btn-remove sidebar-remove-btn" 
                                onclick="event.stopPropagation(); dashboard.confirmRemoveItem('${item.type}', ${item.id})" 
                                title="Remove item from dashboard">
                            <span class="icon-remove">✕</span>
                        </button>
                    </div>
                `;
                
                itemsContainer.appendChild(itemEl);
            });
            
            container.appendChild(companySection);
        });
    }

    /**
     * Group dashboard items by company
     */
    groupItemsByCompany() {
        const grouped = {};
        
        this.dashboardData.forEach(item => {
            const companyName = item.company_info?.name || 'Unknown Company';
            
            if (!grouped[companyName]) {
                grouped[companyName] = [];
            }
            
            grouped[companyName].push(item);
        });
        
        return grouped;
    }

    /**
     * Render main content area with all progress blocks
     */
    renderMainContent() {
        const titleEl = document.getElementById('contentTitle');
        const gridEl = document.getElementById('contentGrid');
        const actionsEl = document.getElementById('contentActions');
        
        titleEl.textContent = 'Dashboard Overview';
        actionsEl.style.display = 'none'; // Hide refresh button for now
        
        if (this.dashboardData.length === 0) {
            gridEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-title">No Items Added</div>
                    <div class="empty-state-description">
                        Click "Add Item" to start adding projects and agreements to your dashboard.
                    </div>
                </div>
            `;
            return;
        }
        
        // Create container for all progress blocks
        const blocksContainer = document.createElement('div');
        blocksContainer.className = 'progress-blocks-container';
        
        // Add a progress block for each item
        this.dashboardData.forEach(item => {
            if (item.type === 'project') {
                blocksContainer.appendChild(UIComponents.createProjectBlock(item));
            } else if (item.type === 'agreement') {
                blocksContainer.appendChild(UIComponents.createAgreementBlock(item));
            }
        });
        
        gridEl.innerHTML = '';
        gridEl.appendChild(blocksContainer);
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
