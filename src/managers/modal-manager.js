/**
 * Modal Manager - handles all modal functionality
 * Extracted from Dashboard class as part of systematic refactoring
 */
export default class ModalManager {
    /**
     * Creates a new ModalManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
    }
    
    /**
     * Initialize modal functionality
     * Sets up any required modal initialization
     */
    init() {
        // Initialize modal functionality if needed
    }
    
    /**
     * Cleanup modal resources
     * Clears search timeouts and other modal-related resources
     */
    cleanup() {
        // Clear any search timeouts
        if (this.dashboard.searchTimeout) {
            clearTimeout(this.dashboard.searchTimeout);
            this.dashboard.searchTimeout = null;
        }
    }

    // ==========================================
    // ADD ITEMS MODAL METHODS
    // ==========================================

    /**
     * Show add item modal
     * Opens the modal for adding new items to the dashboard
     * Initializes the two-step flow (company selection → item selection)
     */
    showAddItemModal() {
        const modal = document.getElementById('addItemModal');
        modal.classList.add('show');
        
        // Reset modal state
        this.dashboard.modalStep = 1;
        this.dashboard.selectedCompanies = [];
        this.dashboard.availableItems = [];
        this.dashboard.selectedItems.clear();
        
        // Focus search input
        setTimeout(() => {
            document.getElementById('searchInput').focus();
        }, 100);
        
        // Clear previous search and update UI
        document.getElementById('searchInput').value = '';
        this.updateModalUI();
    }

    /**
     * Hide add item modal
     * Closes the modal and resets all modal state
     */
    hideAddItemModal() {
        const modal = document.getElementById('addItemModal');
        modal.classList.remove('show');
        
        // Reset modal state
        this.dashboard.modalStep = 1;
        this.dashboard.selectedCompanies = [];
        this.dashboard.availableItems = [];
        this.dashboard.selectedItems.clear();
        
        // Clear search timeout
        if (this.dashboard.searchTimeout) {
            clearTimeout(this.dashboard.searchTimeout);
            this.dashboard.searchTimeout = null;
        }
        
        // Clear search results and reset UI
        document.getElementById('searchInput').value = '';
        document.getElementById('searchInput').style.display = 'block';
    }
    
    /**
     * Update modal UI based on current step
     * Handles the two-step modal flow: Step 1 (company selection) → Step 2 (item selection)
     * Updates header, footer, and content based on current modal step
     */
    updateModalUI() {
        const modal = document.getElementById('addItemModal');
        const modalContent = modal.querySelector('.modal');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const modalFooter = modal.querySelector('.modal-footer');
        
        // Add close button if it doesn't exist
        let closeBtn = modalContent.querySelector('.modal-close-btn');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close-btn';
            closeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
            closeBtn.onclick = () => this.hideAddItemModal();
            modalContent.appendChild(closeBtn);
        }
        
        if (this.dashboard.modalStep === 1) {
            // Step 1: Select companies
            const modalHeader = modalContent.querySelector('.modal-header');
            modalHeader.innerHTML = `
                <h2>Select Company</h2>
            `;
            searchInput.placeholder = 'Search for companies...';
            searchInput.style.display = 'block';
            
            modalFooter.innerHTML = `
                <div class="modal-footer-left">
                    <div class="modal-help-text">
                        <i class="fa-solid fa-lightbulb"></i>
                        Click on a company to continue
                    </div>
                </div>
                <div class="modal-footer-right">
                    <button class="btn btn-ghost" onclick="dashboard.hideAddItemModal()">Cancel</button>
                </div>
            `;
            
            this.renderCompanySearchResults(null);
            
        } else if (this.dashboard.modalStep === 2) {
            // Step 2: Select projects/agreements
            const modalHeader = modalContent.querySelector('.modal-header');
            modalHeader.innerHTML = `
                <h2>Select Projects & Agreements</h2>
                <div class="selected-company-badge">
                    <i class="fa-solid fa-building"></i>
                    ${UIComponents.escapeHtml(this.dashboard.selectedCompanies[0].name)}
                </div>
            `;
            searchInput.style.display = 'none'; // Hide search in step 2
            
            const selectedCount = this.dashboard.selectedItems.size;
            modalFooter.innerHTML = `
                <div class="modal-footer-left">
                    <div class="selection-counter">
                        <i class="fa-solid fa-check-circle"></i>
                        <span class="counter-text">${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected</span>
                    </div>
                </div>
                <div class="modal-footer-right">
                    <button class="btn btn-ghost" onclick="dashboard.backToCompanySelection()">
                        <i class="fa-solid fa-arrow-left"></i>
                        Back
                    </button>
                    <button class="btn btn-primary" onclick="dashboard.addSelectedItems()" ${selectedCount === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-plus"></i>
                        Add Selected Items
                    </button>
                </div>
            `;
            
            this.renderItemSelectionUI();
        }
    }

    /**
     * Handle search input (now company-only for step 1)
     * Debounced search for companies using the Accelo API
     * @param {string} query - The search query string
     */
    handleSearch(query) {
        if (this.dashboard.modalStep !== 1) return;
        
        // Clear previous timeout
        if (this.dashboard.searchTimeout) {
            clearTimeout(this.dashboard.searchTimeout);
        }
        
        // Debounce search
        this.dashboard.searchTimeout = setTimeout(async () => {
            if (query.trim().length < 2) {
                this.renderCompanySearchResults(null);
                return;
            }
            
            try {
                // Show loading state - properly centered
                document.getElementById('searchResults').innerHTML = `
                    <div class="search-loading">
                        <div class="spinner"></div>
                        <p class="search-loading-text">Searching companies...</p>
                    </div>
                `;
                
                // Search companies only
                const companies = await window.acceloAPI.searchCompanies(query);
                this.renderCompanySearchResults(companies);
                
            } catch (error) {
                console.error('Search failed:', error);
                document.getElementById('searchResults').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <div class="empty-state-title">Search Failed</div>
                        <div class="empty-state-description">
                            ${UIComponents.escapeHtml(error.message)}
                        </div>
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
                    <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                    <div class="empty-state-title">Search for Companies</div>
                    <div class="empty-state-description">
                        Type at least 2 characters to search for companies in your Accelo account.
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
        
        // Add results header
        container.innerHTML = `
            <div class="search-results-header">
                <span class="results-count">${companies.length} company${companies.length !== 1 ? 'ies' : ''} found</span>
            </div>
            <div class="search-results-list"></div>
        `;
        
        const resultsList = container.querySelector('.search-results-list');
        
        companies.forEach(company => {
            const item = document.createElement('div');
            item.className = 'company-search-result';
            
            // Get company initials for icon
            const initials = company.name
                .split(' ')
                .map(word => word[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            
            item.innerHTML = `
                <div class="company-result-content">
                    <div class="company-result-icon">
                        <span class="company-initials">${initials}</span>
                    </div>
                    <div class="company-result-info">
                        <div class="company-result-name">${UIComponents.escapeHtml(company.name)}</div>
                        <div class="company-result-type">Company</div>
                    </div>
                    <div class="company-result-action">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                </div>
            `;
            
            // Add click handler to immediately proceed to step 2
            item.addEventListener('click', async () => {
                // Set this company as selected
                this.dashboard.selectedCompanies = [company];
                
                // Immediately proceed to item selection
                await this.proceedToItemSelection();
            });
            
            // Add keyboard navigation
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `Select ${company.name}`);
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
            
            resultsList.appendChild(item);
        });
    }

        /**
     * Proceed to item selection (step 2)
     * Advances from company selection to project/agreement selection
     * Fetches available items from the selected company
     * @returns {Promise<void>}
     */
        async proceedToItemSelection() {
        if (this.dashboard.selectedCompanies.length === 0) {
            UIComponents.showToast('Please select at least one company', 'warning');
            return;
        }
        
        try {
            // Show loading state in the search results area
            document.getElementById('searchResults').innerHTML = `
                <div class="search-loading">
                    <div class="spinner"></div>
                    <p class="search-loading-text">Loading projects and agreements...</p>
                </div>
            `;
            
            // Get projects and agreements for selected companies
            const companyIds = this.dashboard.selectedCompanies.map(c => c.id);
            this.dashboard.availableItems = await window.acceloAPI.getProjectsAndAgreements(companyIds);
            
            // Move to step 2
            this.dashboard.modalStep = 2;
            this.updateModalUI();
            
        } catch (error) {
            console.error('Failed to load items:', error);
            // Show error state in the search results area
            document.getElementById('searchResults').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="empty-state-title">Failed to Load Items</div>
                    <div class="empty-state-description">
                        ${UIComponents.escapeHtml(error.message)}
                    </div>
                </div>
            `;
            UIComponents.showToast('Failed to load items: ' + error.message, 'error');
        }
    }

    /**
     * Back to company selection (step 1)
     */
    backToCompanySelection() {
        this.dashboard.modalStep = 1;
        this.dashboard.selectedItems.clear();
        document.getElementById('searchInput').style.display = 'block';
        this.updateModalUI();
    }

    /**
     * Render item selection UI for step 2
     */
    renderItemSelectionUI() {
        const container = document.getElementById('searchResults');
        
        if (this.dashboard.availableItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-inbox"></i></div>
                    <div class="empty-state-title">No Items Available</div>
                    <div class="empty-state-description">
                        ${UIComponents.escapeHtml(this.dashboard.selectedCompanies[0].name)} has no active projects or agreements.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Count total items
        let totalProjects = 0;
        let totalAgreements = 0;
        this.dashboard.availableItems.forEach(companyData => {
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
        this.dashboard.availableItems.forEach(companyData => {
            const companySection = document.createElement('div');
            companySection.className = 'item-selection-company';
            
            // Only show company header if there are multiple companies (future-proofing)
            if (this.dashboard.selectedCompanies.length > 1) {
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
        const isSelected = this.dashboard.selectedItems.has(itemKey);
        
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
            const isNowSelected = !this.dashboard.selectedItems.has(itemKey);
            
            if (isNowSelected) {
                this.dashboard.selectedItems.add(itemKey);
                div.classList.add('selected');
                checkbox.checked = true;
            } else {
                this.dashboard.selectedItems.delete(itemKey);
                div.classList.remove('selected');
                checkbox.checked = false;
            }
            
            // Update the selection counter in real-time
            this.updateSelectionCounter();
        };
        
        // Add click handlers
        div.addEventListener('click', (e) => {
            // Don't trigger if clicking on the checkbox directly
            if (e.target.type !== 'checkbox') {
                toggleSelection();
            }
        });
        
        checkbox.addEventListener('change', toggleSelection);
        
        // Set initial state
        if (isSelected) {
            div.classList.add('selected');
        }
        
        // Add accessibility
        div.setAttribute('role', 'checkbox');
        div.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        div.setAttribute('tabindex', '0');
        
        // Add keyboard support
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSelection();
                div.setAttribute('aria-checked', this.dashboard.selectedItems.has(itemKey) ? 'true' : 'false');
            }
        });
        
        return div;
    }

    /**
     * Update selection counter in modal footer
     */
    updateSelectionCounter() {
        const counter = document.querySelector('.selection-counter .counter-text');
        const addButton = document.querySelector('.modal-footer .btn-primary');
        
        if (counter) {
            const selectedCount = this.dashboard.selectedItems.size;
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
        // Clear current selection
        this.dashboard.selectedItems.clear();
        
        // Add all items
        this.dashboard.availableItems.forEach(companyData => {
            companyData.projects.forEach(project => {
                this.dashboard.selectedItems.add(`project-${project.id}`);
            });
            companyData.agreements.forEach(agreement => {
                this.dashboard.selectedItems.add(`agreement-${agreement.id}`);
            });
        });
        
        // Update UI
        this.updateSelectionUI();
        this.updateSelectionCounter();
    }

    /**
     * Clear all selected items 
     */
    clearAllItems() {
        this.dashboard.selectedItems.clear();
        this.updateSelectionUI();
        this.updateSelectionCounter();
    }

    /**
     * Update selection UI for all items
     */
    updateSelectionUI() {
        document.querySelectorAll('.selectable-item').forEach(item => {
            const type = item.dataset.type;
            const id = item.dataset.id;
            const itemKey = `${type}-${id}`;
            const checkbox = item.querySelector('input[type="checkbox"]');
            
            if (this.dashboard.selectedItems.has(itemKey)) {
                item.classList.add('selected');
                checkbox.checked = true;
                item.setAttribute('aria-checked', 'true');
            } else {
                item.classList.remove('selected');
                checkbox.checked = false;
                item.setAttribute('aria-checked', 'false');
            }
        });
    }

    /**
     * Add selected items to the dashboard
     */
    /**
     * Add selected items to the dashboard
     * Fetches detailed data for each selected item and adds them to the dashboard
     * Handles both projects and agreements with proper company association
     * @returns {Promise<void>}
     */
    async addSelectedItems() {
        if (this.dashboard.selectedItems.size === 0) {
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
            const itemsToAdd = Array.from(this.dashboard.selectedItems).map(id => {
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
                        const selectedCompany = this.dashboard.selectedCompanies[0];
                        const companyId = String(selectedCompany.id);
                        const companyName = selectedCompany.name;
                        
                        // Add to dashboard data with company info preserved
                        this.dashboard.dashboardData.push({
                            ...project,
                            type: 'project',
                            hours: hours,
                            company_id: companyId,
                            company_name: companyName,
                            company_info: selectedCompany
                        });
                        
                        // Add company to order if not already there
                        if (!this.dashboard.companyOrder.includes(companyId)) {
                            this.dashboard.companyOrder.push(companyId);
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
                        const selectedCompany = this.dashboard.selectedCompanies[0];
                        const companyId = String(selectedCompany.id);
                        const companyName = selectedCompany.name;
                        
                        // Add to dashboard data with company info preserved
                        this.dashboard.dashboardData.push({
                            ...agreement,
                            type: 'agreement',
                            usage: usage,
                            company_id: companyId,
                            company_name: companyName,
                            company_info: selectedCompany
                        });
                        
                        // Add company to order if not already there
                        if (!this.dashboard.companyOrder.includes(companyId)) {
                            this.dashboard.companyOrder.push(companyId);
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
            this.dashboard.dataManager.saveDashboardState();
            
            // Re-render dashboard
            this.dashboard.renderDashboard();
            
            // Close modal
            this.hideAddItemModal();
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                this.dashboard.companyColorManager.applySavedCompanyColors();
            }, 50);
            
            UIComponents.showToast(`Added ${itemsToAdd.length} item(s) to dashboard`, 'success');
            
        } catch (error) {
            console.error('Failed to add items:', error);
            UIComponents.showToast('Failed to add items: ' + error.message, 'error');
            // Restore the item selection UI on error
            this.renderItemSelectionUI();
        }
    }

    // ==========================================
    // DASHBOARD RENAME MODAL METHODS
    // ==========================================

    /**
     * Show dashboard rename modal
     */
    /**
     * Show dashboard rename modal
     * Opens modal for renaming the current dashboard
     * @param {string} currentName - The current dashboard name
     */
    showDashboardRenameModal(currentName) {
        const modal = document.getElementById('dashboardRenameModal');
        const input = document.getElementById('newDashboardName');
        
        if (modal && input) {
            input.value = currentName;
            modal.classList.add('show');
            
            // Focus and select text after modal appears
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        }
    }

    /**
     * Save dashboard rename
     */
    saveDashboardRename() {
        const input = document.getElementById('newDashboardName');
        const newName = input.value.trim();
        
        if (!newName) {
            UIComponents.showToast('Please enter a dashboard name', 'error');
            return;
        }

        try {
            // Rename the dashboard
            window.dashboardManager.renameDashboard(this.dashboard.currentDashboardId, newName);
            
            // Update the navbar badge
            this.dashboard.updateDashboardNameBadge(newName);
            
            // Hide the modal
            this.hideDashboardRenameModal();
            
            // Clear URL parameters
            const url = new URL(window.location);
            url.searchParams.delete('rename');
            window.history.replaceState({}, document.title, url.toString());
            
            UIComponents.showToast('Dashboard renamed successfully', 'success');
            
        } catch (error) {
            console.error('Failed to rename dashboard:', error);
            UIComponents.showToast('Failed to rename dashboard: ' + error.message, 'error');
        }
    }

    /**
     * Cancel dashboard rename
     */
    cancelDashboardRename() {
        this.hideDashboardRenameModal();
        
        // Clear URL parameters
        const url = new URL(window.location);
        url.searchParams.delete('rename');
        window.history.replaceState({}, document.title, url.toString());
    }

    /**
     * Hide dashboard rename modal
     */
    hideDashboardRenameModal() {
        const modal = document.getElementById('dashboardRenameModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
} 