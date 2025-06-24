/**
 * Dashboard main functionality
 */

class Dashboard {
    constructor() {
        this.selectedCompanyId = null;
        this.dashboardData = [];
        this.searchTimeout = null;
        this.selectedItems = new Set();
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
            
            // Load initial data if we have companies
            if (this.dashboardData.length > 0) {
                await this.refreshDashboardData();
                
                // Select first company
                const firstCompany = this.dashboardData[0];
                if (firstCompany) {
                    this.selectCompany(firstCompany.company.id);
                }
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
            companyClick: (e) => {
                const card = e.target.closest('.company-card');
                if (card && !this.isSelectingCompany) {
                    this.selectCompanyDebounced(card.dataset.companyId);
                }
            },
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
        
        // Company selection with debouncing
        document.getElementById('companyList').addEventListener('click', this.eventHandlers.companyClick);
        
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
            document.getElementById('companyList').removeEventListener('click', this.eventHandlers.companyClick);
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
     * Refresh all dashboard data from API
     */
    async refreshDashboardData() {
        try {
            UIComponents.showLoading();
            
            // Get all company IDs
            const companyIds = this.dashboardData.map(item => item.company.id);
            
            if (companyIds.length === 0) {
                this.renderCompanyList();
                return;
            }
            
            // Fetch updated data
            const updatedData = await window.acceloAPI.getDashboardData(companyIds);
            
            // Update dashboard data
            this.dashboardData = updatedData;
            
            // Update UI
            this.renderCompanyList();
            
            // If a company is selected, refresh its content
            if (this.selectedCompanyId) {
                this.renderCompanyContent(this.selectedCompanyId);
            }
            
            // Save state
            this.saveDashboardState();
            
        } catch (error) {
            console.error('Failed to refresh dashboard data:', error);
            UIComponents.showToast('Failed to refresh data: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }
    
    /**
     * Select a company with debouncing
     */
    selectCompanyDebounced(companyId) {
        // Clear any pending selection
        if (this.companySelectTimeout) {
            clearTimeout(this.companySelectTimeout);
        }
        
        // Set flag to prevent rapid clicks
        this.isSelectingCompany = true;
        
        this.companySelectTimeout = setTimeout(() => {
            this.selectCompany(companyId);
            this.isSelectingCompany = false;
        }, 100);
    }
    
    /**
     * Select a company
     */
    selectCompany(companyId) {
        this.selectedCompanyId = companyId;
        
        // Update active state
        document.querySelectorAll('.company-card').forEach(card => {
            card.classList.toggle('active', card.dataset.companyId === companyId);
        });
        
        // Render company content
        this.renderCompanyContent(companyId);
    }
    
    /**
     * Render company list in sidebar
     */
    renderCompanyList() {
        const container = document.getElementById('companyList');
        
        if (this.dashboardData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <div class="empty-state-title">No Companies Added</div>
                    <div class="empty-state-description">
                        Click "Add Item" to search and add companies to your dashboard.
                    </div>
                </div>
            `;
            // Hide refresh button when no companies
            document.getElementById('contentActions').style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        
        this.dashboardData.forEach(item => {
            const company = item.company;
            const itemCount = (item.projects?.length || 0) + (item.agreements?.length || 0);
            const hasActiveItems = itemCount > 0;
            
            const card = UIComponents.createCompanyCard({
                ...company,
                itemCount,
                hasActiveItems
            }, company.id === this.selectedCompanyId);
            
            container.appendChild(card);
        });
    }
    
    /**
     * Refresh current company data
     */
    async refreshCurrentCompany() {
        if (!this.selectedCompanyId) return;
        
        try {
            UIComponents.showLoading();
            
            // Fetch fresh data for this company
            const updatedData = await window.acceloAPI.getDashboardData([this.selectedCompanyId]);
            
            if (updatedData.length > 0) {
                // Update the data in our dashboard state
                const index = this.dashboardData.findIndex(item => item.company.id == this.selectedCompanyId);
                if (index !== -1) {
                    this.dashboardData[index] = updatedData[0];
                    this.saveDashboardState();
                    this.renderCompanyContent(this.selectedCompanyId);
                    UIComponents.showToast('Data refreshed successfully', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to refresh company data:', error);
            UIComponents.showToast('Failed to refresh data: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }
    
    /**
     * Render company content in main area
     */
    renderCompanyContent(companyId) {
        const data = this.dashboardData.find(item => item.company.id == companyId);
        if (!data) return;
        
        const titleEl = document.getElementById('contentTitle');
        const gridEl = document.getElementById('contentGrid');
        const actionsEl = document.getElementById('contentActions');
        
        titleEl.textContent = data.company.name;
        
        // Show refresh button when company is selected
        actionsEl.style.display = 'flex';
        
        // Clear existing content
        gridEl.innerHTML = '';
        
        // Check for errors
        if (data.error) {
            gridEl.innerHTML = `
                <div class="alert alert-error">
                    Failed to load data: ${data.error}
                </div>
            `;
            return;
        }
        
        // Create container for progress blocks
        const blocksContainer = document.createElement('div');
        blocksContainer.className = 'progress-blocks-container';
        
        // Add projects
        if (data.projects && data.projects.length > 0) {
            data.projects.forEach(project => {
                blocksContainer.appendChild(UIComponents.createProjectBlock(project));
            });
        }
        
        // Add agreements
        if (data.agreements && data.agreements.length > 0) {
            data.agreements.forEach(agreement => {
                blocksContainer.appendChild(UIComponents.createAgreementBlock(agreement));
            });
        }
        
        // Show empty state if no items
        if (blocksContainer.children.length === 0) {
            gridEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-title">No Active Items</div>
                    <div class="empty-state-description">
                        This company has no active projects or agreements.
                    </div>
                </div>
            `;
        } else {
            gridEl.appendChild(blocksContainer);
        }
    }
    
    /**
     * Show add item modal
     */
    showAddItemModal() {
        const modal = document.getElementById('addItemModal');
        modal.classList.add('show');
        
        // Focus search input
        setTimeout(() => {
            document.getElementById('searchInput').focus();
        }, 100);
        
        // Clear previous search
        document.getElementById('searchInput').value = '';
        this.renderSearchResults(null);
        this.selectedItems.clear();
    }
    
    /**
     * Hide add item modal
     */
    hideAddItemModal() {
        const modal = document.getElementById('addItemModal');
        modal.classList.remove('show');
        
        // Clear selected items
        this.selectedItems.clear();
        
        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        
        // Clear search results
        document.getElementById('searchInput').value = '';
        this.renderSearchResults(null);
    }
    
    /**
     * Handle search input
     */
    handleSearch(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            if (query.trim().length < 2) {
                this.renderSearchResults(null);
                return;
            }
            
            try {
                // Show loading state
                document.getElementById('searchResults').innerHTML = `
                    <div class="text-center p-3">
                        <div class="spinner"></div>
                        <p class="text-muted mt-2">Searching...</p>
                    </div>
                `;
                
                // Search API
                const results = await window.acceloAPI.searchAll(query);
                this.renderSearchResults(results);
                
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
     * Render search results
     */
    renderSearchResults(results) {
        const container = document.getElementById('searchResults');
        
        if (!results) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">Start Searching</div>
                    <div class="empty-state-description">
                        Type to search for companies, projects, or agreements in your Accelo account.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Companies section
        if (results.companies && results.companies.length > 0) {
            const section = document.createElement('div');
            section.className = 'search-result-section';
            section.innerHTML = '<h3>Companies</h3>';
            
            results.companies.forEach(company => {
                section.appendChild(UIComponents.createSearchResultItem(company, 'company'));
            });
            
            container.appendChild(section);
        }
        
        // Projects section
        if (results.projects && results.projects.length > 0) {
            const section = document.createElement('div');
            section.className = 'search-result-section';
            section.innerHTML = '<h3>Projects</h3>';
            
            results.projects.forEach(project => {
                section.appendChild(UIComponents.createSearchResultItem(project, 'project'));
            });
            
            container.appendChild(section);
        }
        
        // Agreements section
        if (results.agreements && results.agreements.length > 0) {
            const section = document.createElement('div');
            section.className = 'search-result-section';
            section.innerHTML = '<h3>Agreements</h3>';
            
            results.agreements.forEach(agreement => {
                section.appendChild(UIComponents.createSearchResultItem(agreement, 'agreement'));
            });
            
            container.appendChild(section);
        }
        
        // No results
        if (container.children.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🤷</div>
                    <div class="empty-state-title">No Results Found</div>
                    <div class="empty-state-description">
                        Try a different search term or check your spelling.
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Add selected items to dashboard
     */
    async addSelectedItems() {
        const selectedElements = document.querySelectorAll('.search-result-item.selected');
        
        if (selectedElements.length === 0) {
            UIComponents.showToast('Please select at least one item to add', 'warning');
            return;
        }
        
        try {
            UIComponents.showLoading();
            
            // Group selected items by company
            const companiesToAdd = new Map();
            
            selectedElements.forEach(el => {
                const type = el.dataset.type;
                const id = el.dataset.id;
                
                if (type === 'company') {
                    if (!companiesToAdd.has(id)) {
                        companiesToAdd.set(id, {
                            companyId: id,
                            projects: [],
                            agreements: []
                        });
                    }
                } else if (type === 'project' || type === 'agreement') {
                    // For projects/agreements, we need to find their company
                    // This is a simplified approach - in production, you'd want to
                    // fetch the company info for each project/agreement
                    UIComponents.showToast('Direct project/agreement adding not yet implemented', 'info');
                }
            });
            
            // Add new companies to dashboard
            for (const [companyId, data] of companiesToAdd) {
                // Check if company already exists
                if (!this.dashboardData.find(item => item.company.id == companyId)) {
                    // Fetch company data
                    const companyData = await window.acceloAPI.getDashboardData([companyId]);
                    if (companyData.length > 0) {
                        this.dashboardData.push(companyData[0]);
                    }
                }
            }
            
            // Save state and refresh UI
            this.saveDashboardState();
            this.renderCompanyList();
            
            // Hide modal
            this.hideAddItemModal();
            
            UIComponents.showToast('Items added successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to add items:', error);
            UIComponents.showToast('Failed to add items: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
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
