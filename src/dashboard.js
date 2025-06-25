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
        
        // Add company order tracking
        this.companyOrder = []; // Track the explicit order of companies
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            draggedElement: null,
            draggedData: null,
            draggedType: null, // 'progress' or 'company'
            sourceCompanyId: null,
            sourceIndex: null,
            dropTargets: [],
            currentDropTarget: null
        };
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
            
            // Apply saved company colors after rendering
            setTimeout(() => {
                UIComponents.applySavedCompanyColors();
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
        
        // Set up drag and drop event delegation
        this.setupDragAndDrop();
    }
    
    /**
     * Clean up event listeners
     */
    cleanupEventListeners() {
        if (this.eventHandlers) {
            document.getElementById('addItemModal').removeEventListener('click', this.eventHandlers.modalClick);
            document.removeEventListener('keydown', this.eventHandlers.escapeKey);
        }
        
        // Clean up drag and drop listeners
        this.cleanupDragAndDrop();
    }
    
    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop() {
        // Use event delegation on the main content area
        const mainContent = document.getElementById('mainContent');
        
        // Drag events for progress blocks and company blocks
        mainContent.addEventListener('dragstart', this.handleDragStart.bind(this));
        mainContent.addEventListener('dragend', this.handleDragEnd.bind(this));
        mainContent.addEventListener('dragover', this.handleDragOver.bind(this));
        mainContent.addEventListener('drop', this.handleDrop.bind(this));
        mainContent.addEventListener('dragenter', this.handleDragEnter.bind(this));
        mainContent.addEventListener('dragleave', this.handleDragLeave.bind(this));
    }
    
    /**
     * Clean up drag and drop event listeners
     */
    cleanupDragAndDrop() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.removeEventListener('dragstart', this.handleDragStart);
            mainContent.removeEventListener('dragend', this.handleDragEnd);
            mainContent.removeEventListener('dragover', this.handleDragOver);
            mainContent.removeEventListener('drop', this.handleDrop);
            mainContent.removeEventListener('dragenter', this.handleDragEnter);
            mainContent.removeEventListener('dragleave', this.handleDragLeave);
        }
    }
    
    /**
     * Handle drag start event
     */
    handleDragStart(e) {
        const progressBlock = e.target.closest('.compact-progress-block');
        const companyBlock = e.target.closest('.company-block');
        
        if (progressBlock && progressBlock.hasAttribute('draggable')) {
            // Dragging a progress block
            this.startProgressBlockDrag(e, progressBlock);
        } else if (companyBlock && companyBlock.hasAttribute('draggable')) {
            // Dragging a company block
            this.startCompanyBlockDrag(e, companyBlock);
        }
    }
    
    /**
     * Start dragging a progress block
     */
    startProgressBlockDrag(e, progressBlock) {
        this.dragState.isDragging = true;
        this.dragState.draggedElement = progressBlock;
        this.dragState.draggedType = 'progress';
        
        // Get the data for this block
        const projectId = progressBlock.dataset.projectId;
        const agreementId = progressBlock.dataset.agreementId;
        const itemId = projectId || agreementId;
        const itemType = projectId ? 'project' : 'agreement';
        
        // Find the item in our data (compare as strings to handle both string and number IDs)
        const item = this.dashboardData.find(d => 
            String(d.id) === String(itemId) && d.type === itemType
        );
        
        if (item) {
            this.dragState.draggedData = item;
            this.dragState.sourceCompanyId = item.company_id || (item.company_info ? item.company_info.id : null);
            this.dragState.sourceIndex = this.dashboardData.indexOf(item);
            
            // Set drag data
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'progress',
                itemType: itemType,
                itemId: itemId,
                companyId: item.company_id
            }));
            
            // Add dragging class
            progressBlock.classList.add('dragging');
            
            // Create custom drag image
            this.createDragPreview(e, progressBlock);
            
            // Highlight valid drop zones
            this.highlightDropZones('progress');
        } else {
            console.error('Could not find item in dashboardData:', {
                itemId,
                itemType,
                dashboardData: this.dashboardData
            });
        }
    }
    
    /**
     * Start dragging a company block
     */
    startCompanyBlockDrag(e, companyBlock) {
        this.dragState.isDragging = true;
        this.dragState.draggedElement = companyBlock;
        this.dragState.draggedType = 'company';
        
        const companyId = parseInt(companyBlock.dataset.companyId);
        this.dragState.draggedData = { companyId };
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'company',
            companyId: companyId
        }));
        
        // Add dragging class
        companyBlock.classList.add('dragging');
        
        // Create custom drag image
        this.createDragPreview(e, companyBlock);
        
        // Highlight valid drop zones
        this.highlightDropZones('company');
    }
    
    /**
     * Create a custom drag preview
     */
    createDragPreview(e, element) {
        // Clone the element for the drag image
        const dragImage = element.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'rotate(2deg)';
        document.body.appendChild(dragImage);
        
        // Set as drag image
        e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
        
        // Remove after a short delay
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    }
    
    /**
     * Highlight valid drop zones
     */
    highlightDropZones(dragType) {
        if (dragType === 'progress') {
            // Only highlight the progress container for the same company
            const sourceCompanyId = this.dragState.sourceCompanyId || 
                                   (this.dragState.draggedData?.company_id) || 
                                   (this.dragState.draggedData?.company_info?.id);
            
            if (sourceCompanyId) {
                // Find the company block with this ID
                const companyBlock = document.querySelector(`.company-block[data-company-id="${sourceCompanyId}"]`);
                if (companyBlock) {
                    // Get its index
                    const companyIndex = companyBlock.dataset.companyIndex;
                    // Find the corresponding progress container
                    const progressContainer = document.querySelector(`.company-progress-container[data-company-index="${companyIndex}"] .progress-blocks-container`);
                    if (progressContainer) {
                        progressContainer.classList.add('drop-zone-active');
                    }
                }
            }
        } else if (dragType === 'company') {
            // Highlight company blocks section
            const companySection = document.querySelector('.all-company-blocks-section');
            if (companySection) {
                companySection.classList.add('drop-zone-active');
            }
        }
    }
    
    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        if (!this.dragState.isDragging) return;
        
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'move';
        
        if (this.dragState.draggedType === 'progress') {
            this.handleProgressBlockDragOver(e);
        } else if (this.dragState.draggedType === 'company') {
            this.handleCompanyBlockDragOver(e);
        }
    }
    
    /**
     * Handle progress block drag over
     */
    handleProgressBlockDragOver(e) {
        const container = e.target.closest('.progress-blocks-container');
        if (!container) return;
        
        // Check if this is the correct company's container
        const progressContainer = container.closest('.company-progress-container');
        if (!progressContainer) return;
        
        const containerIndex = progressContainer.dataset.companyIndex;
        const companyBlocks = document.querySelectorAll('.company-block');
        const companyBlock = companyBlocks[containerIndex];
        
        if (!companyBlock) return;
        
        const targetCompanyId = companyBlock.dataset.companyId;
        const sourceCompanyId = this.dragState.sourceCompanyId || 
                               (this.dragState.draggedData?.company_id) || 
                               (this.dragState.draggedData?.company_info?.id);
        
        // Only show insertion marker if it's the same company
        if (String(sourceCompanyId) !== String(targetCompanyId)) {
            return;
        }
        
        // Find the closest progress block to show insertion point
        const afterElement = this.getDragAfterElement(container, e.clientY);
        const insertMarker = this.getOrCreateInsertMarker();
        
        if (afterElement == null) {
            container.appendChild(insertMarker);
        } else {
            container.insertBefore(insertMarker, afterElement);
        }
    }
    
    /**
     * Handle company block drag over
     */
    handleCompanyBlockDragOver(e) {
        const container = e.target.closest('.all-company-blocks-section');
        if (!container) return;
        
        // Find the closest company block to show insertion point
        const afterElement = this.getDragAfterElement(container, e.clientY, '.company-block');
        const insertMarker = this.getOrCreateInsertMarker();
        
        if (afterElement == null) {
            container.appendChild(insertMarker);
        } else {
            container.insertBefore(insertMarker, afterElement);
        }
    }
    
    /**
     * Get or create insertion marker
     */
    getOrCreateInsertMarker() {
        let marker = document.getElementById('drag-insert-marker');
        if (!marker) {
            marker = document.createElement('div');
            marker.id = 'drag-insert-marker';
            marker.className = 'drag-insert-marker';
        }
        return marker;
    }
    
    /**
     * Get the element after which to insert
     */
    getDragAfterElement(container, y, selector = '.compact-progress-block') {
        const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    /**
     * Handle drag enter event
     */
    handleDragEnter(e) {
        if (!this.dragState.isDragging) return;
        
        const dropZone = e.target.closest('.progress-blocks-container') || 
                        e.target.closest('.all-company-blocks-section');
        
        if (dropZone) {
            dropZone.classList.add('drop-zone-hover');
        }
    }
    
    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        if (!this.dragState.isDragging) return;
        
        const dropZone = e.target.closest('.progress-blocks-container') || 
                        e.target.closest('.all-company-blocks-section');
        
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drop-zone-hover');
        }
    }
    
    /**
     * Handle drop event
     */
    handleDrop(e) {
        if (!this.dragState.isDragging) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        if (this.dragState.draggedType === 'progress') {
            this.handleProgressBlockDrop(e);
        } else if (this.dragState.draggedType === 'company') {
            this.handleCompanyBlockDrop(e);
        }
        
        // Clean up
        this.cleanupDragState();
    }
    
    /**
     * Handle progress block drop
     */
    handleProgressBlockDrop(e) {
        const container = e.target.closest('.progress-blocks-container');
        if (!container) {
            return;
        }
        
        // Get the target company ID - need to look at the structure differently
        const companyProgressContainer = container.closest('.company-progress-container');
        
        if (!companyProgressContainer) {
            return;
        }
        
        // Get the index and find the corresponding company block
        const containerIndex = companyProgressContainer.dataset.companyIndex;
        const companyBlocks = document.querySelectorAll('.company-block');
        const companyBlock = companyBlocks[containerIndex];
        
        const targetCompanyId = companyBlock ? parseInt(companyBlock.dataset.companyId) : null;
        
        if (!targetCompanyId) {
            return;
        }
        
        // Find position to insert
        const insertMarker = document.getElementById('drag-insert-marker');
        const afterElement = insertMarker?.previousElementSibling;
        
        // Update the data model
        this.moveProgressBlock(
            this.dragState.draggedData,
            targetCompanyId,
            afterElement
        );
    }
    
    /**
     * Handle company block drop
     */
    handleCompanyBlockDrop(e) {
        const container = e.target.closest('.all-company-blocks-section');
        if (!container) {
            return;
        }
        
        // Find position to insert
        const insertMarker = document.getElementById('drag-insert-marker');
        const afterElement = insertMarker?.previousElementSibling;
        
        // Update the company order
        this.reorderCompanies(
            this.dragState.draggedData.companyId,
            afterElement
        );
    }
    
    /**
     * Move a progress block to a new company/position
     */
    moveProgressBlock(item, targetCompanyId, afterElement) {
        // Check if item exists
        if (!item) {
            console.error('Cannot move null item');
            return;
        }
        
        // Get the current company ID
        const currentCompanyId = item.company_id || (item.company_info ? item.company_info.id : null);
        
        // Prevent cross-company moves
        if (String(currentCompanyId) !== String(targetCompanyId)) {
            UIComponents.showToast('Progress blocks cannot be moved between companies', 'warning');
            return;
        }
        
        // If there's an afterElement, find its data and position
        if (afterElement) {
            const afterProjectId = afterElement.dataset.projectId;
            const afterAgreementId = afterElement.dataset.agreementId;
            const afterItemId = afterProjectId || afterAgreementId;
            const afterItemType = afterProjectId ? 'project' : 'agreement';
            
            // Use string comparison to handle both string and number IDs
            const afterIndex = this.dashboardData.findIndex(d => 
                String(d.id) === String(afterItemId) && d.type === afterItemType
            );
            
            if (afterIndex !== -1) {
                // Get current position
                const currentIndex = this.dashboardData.indexOf(item);
                
                if (currentIndex !== -1) {
                    // Remove the item from its current position
                    this.dashboardData.splice(currentIndex, 1);
                    
                    // Calculate where to insert
                    // If we removed an item before the target position, adjust the index
                    let insertIndex = afterIndex;
                    if (currentIndex < afterIndex) {
                        insertIndex = afterIndex - 1;
                    }
                    
                    // We want to insert AFTER the target element, so add 1
                    insertIndex = insertIndex + 1;
                    
                    this.dashboardData.splice(insertIndex, 0, item);
                } else {
                    console.error('Could not find current item in dashboardData');
                }
            } else {
                console.error('Could not find afterElement in dashboardData');
            }
        } else {
            // No afterElement means insert at beginning of company's items
            // Remove from old position
            const currentIndex = this.dashboardData.indexOf(item);
            if (currentIndex !== -1) {
                this.dashboardData.splice(currentIndex, 1);
            }
            
            // Find first item of target company
            let firstIndex = -1;
            for (let i = 0; i < this.dashboardData.length; i++) {
                const itemCompanyId = this.dashboardData[i].company_id || 
                                     (this.dashboardData[i].company_info ? this.dashboardData[i].company_info.id : null);
                if (String(itemCompanyId) === String(targetCompanyId)) {
                    firstIndex = i;
                    break;
                }
            }
            
            if (firstIndex !== -1) {
                // Insert before first item of company
                this.dashboardData.splice(firstIndex, 0, item);
            } else {
                // No items for this company yet, just push
                this.dashboardData.push(item);
            }
        }
        
        // Save and re-render
        this.saveDashboardState();
        this.renderDashboard();
        
        // Reapply saved company colors after rendering
        setTimeout(() => {
            UIComponents.applySavedCompanyColors();
        }, 50);
    }
    
    /**
     * Reorder companies
     */
    reorderCompanies(companyId, afterElement) {
        // Use the saved company order, not the order from groupItemsByCompany
        let companyIds = [...this.companyOrder]; // Clone the array
        
        // If no saved order exists, get it from the data
        if (companyIds.length === 0) {
            const companies = this.groupItemsByCompany();
            companyIds = Object.keys(companies);
        }
        
        // Convert companyId to string for consistent comparison
        const draggedCompanyIdStr = String(companyId);
        
        // Remove the dragged company from the list
        const draggedIndex = companyIds.indexOf(draggedCompanyIdStr);
        
        if (draggedIndex !== -1) {
            companyIds.splice(draggedIndex, 1);
        }
        
        // Find where to insert
        let insertIndex = companyIds.length; // Default to end
        if (afterElement) {
            const afterId = String(afterElement.dataset.companyId);
            const afterIndex = companyIds.indexOf(afterId);
            if (afterIndex !== -1) {
                insertIndex = afterIndex + 1;
            }
        } else {
            insertIndex = 0; // Insert at beginning if no afterElement
        }
        
        // Insert the company at new position
        companyIds.splice(insertIndex, 0, draggedCompanyIdStr);
        
        // Reorder dashboard data based on new company order
        const newDashboardData = [];
        companyIds.forEach(id => {
            const companyItems = this.dashboardData.filter(item => {
                // Check both company_id and company_info.id for compatibility
                const itemCompanyId = item.company_id || (item.company_info ? item.company_info.id : null);
                // Convert both to strings for consistent comparison
                return String(itemCompanyId) === String(id);
            });
            newDashboardData.push(...companyItems);
        });
        
        this.dashboardData = newDashboardData;
        
        // Save the new company order
        this.companyOrder = companyIds;
        
        // Save and re-render
        this.saveDashboardState();
        this.renderDashboard();
        
        // Reapply saved company colors after rendering
        setTimeout(() => {
            UIComponents.applySavedCompanyColors();
        }, 50);
    }
    
    /**
     * Handle drag end event
     */
    handleDragEnd(e) {
        this.cleanupDragState();
    }
    
    /**
     * Clean up drag state
     */
    cleanupDragState() {
        // Remove dragging classes
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.classList.remove('dragging');
        }
        
        // Remove drop zone highlights
        document.querySelectorAll('.drop-zone-active').forEach(zone => {
            zone.classList.remove('drop-zone-active', 'drop-zone-hover');
        });
        
        // Remove insertion marker
        const marker = document.getElementById('drag-insert-marker');
        if (marker) {
            marker.remove();
        }
        
        // Reset drag state
        this.dragState = {
            isDragging: false,
            draggedElement: null,
            draggedData: null,
            draggedType: null,
            sourceCompanyId: null,
            sourceIndex: null,
            dropTargets: [],
            currentDropTarget: null
        };
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
                this.companyOrder = state.companyOrder || [];
                
                // If no company order saved, derive it from dashboardData
                if (this.companyOrder.length === 0 && this.dashboardData.length > 0) {
                    const companies = this.groupItemsByCompany();
                    this.companyOrder = Object.keys(companies);
                }
            } catch (error) {
                console.error('Failed to parse saved state:', error);
                this.dashboardData = [];
                this.companyOrder = [];
            }
        }
    }
    
    /**
     * Save dashboard state
     */
    saveDashboardState() {
        const state = {
            dashboardData: this.dashboardData,
            companyOrder: this.companyOrder,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('accelo_dashboard_state', JSON.stringify(state));
    }
    
    /**
     * Refresh all dashboard data from API
     */
    async refreshDashboardData() {
        if (this.dashboardData.length === 0) {
            this.renderDashboard();
            return;
        }

        try {
            UIComponents.showLoading();
            
            // Refresh data for each item
            for (let i = 0; i < this.dashboardData.length; i++) {
                const item = this.dashboardData[i];
                
                if (item.type === 'project') {
                    try {
                        const hours = await window.acceloAPI.getProjectHours(item.id);
                        this.dashboardData[i].hours = hours;
                    } catch (error) {
                        console.error(`Failed to refresh hours for project ${item.id}:`, error);
                    }
                } else if (item.type === 'agreement') {
                    try {
                        const usage = await window.acceloAPI.getAgreementUsage(item.id);
                        this.dashboardData[i].usage = usage;
                    } catch (error) {
                        console.error(`Failed to refresh usage for agreement ${item.id}:`, error);
                    }
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Save the refreshed data and re-render
            this.saveDashboardState();
            this.renderDashboard();
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                UIComponents.applySavedCompanyColors();
            }, 50);
            
            UIComponents.showToast('Dashboard data refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Failed to refresh dashboard data:', error);
            UIComponents.showToast('Failed to refresh data: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
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
        
        const icon = type === 'project' ? '<i class="fa-solid fa-diagram-project"></i>' : '<i class="fa-solid fa-file-contract"></i>';
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
     * Add selected items to the dashboard
     */
    async addSelectedItems() {
        if (this.selectedItems.size === 0) {
            UIComponents.showToast('Please select at least one item', 'warning');
            return;
        }
        
        try {
            UIComponents.showLoading();
            
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
                        
                        // Add to dashboard data with company info preserved
                        this.dashboardData.push({
                            ...project,
                            type: 'project',
                            hours: hours,
                            company_info: project.company || project.affiliation
                        });
                        
                        // Add company to order if not already there
                        const companyId = String(project.company_id || project.company?.id || project.affiliation?.id);
                        if (companyId && !this.companyOrder.includes(companyId)) {
                            this.companyOrder.push(companyId);
                        }
                        
                    } else if (item.type === 'agreement') {
                        // Get agreement details and usage
                        const agreement = await window.acceloAPI.getAgreement(item.id);
                        const usage = await window.acceloAPI.getAgreementUsage(item.id);
                        
                        // Add to dashboard data with company info preserved
                        this.dashboardData.push({
                            ...agreement,
                            type: 'agreement',
                            usage: usage,
                            company_info: agreement.company || agreement.affiliation
                        });
                        
                        // Add company to order if not already there
                        const companyId = String(agreement.company_id || agreement.company?.id || agreement.affiliation?.id);
                        if (companyId && !this.companyOrder.includes(companyId)) {
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
            this.saveDashboardState();
            
            // Re-render dashboard
            this.renderDashboard();
            
            // Close modal
            this.hideAddItemModal();
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                UIComponents.applySavedCompanyColors();
            }, 50);
            
            UIComponents.showToast(`Added ${itemsToAdd.length} item(s) to dashboard`, 'success');
            
        } catch (error) {
            console.error('Failed to add items:', error);
            UIComponents.showToast('Failed to add items: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    /**
     * Render the dashboard based on current data
     */
    renderDashboard() {
        // Use company-grouped layout
        this.renderCompanyGroupedLayout();
    }
    
    /**
     * Render company-grouped layout matching user's mockup
     */
    renderCompanyGroupedLayout() {
        const contentGrid = document.querySelector('.content-grid');
        
        // Hide the sidebar since we're using company-grouped layout
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        
        // Clear and create layout
        const layoutContainer = document.createElement('div');
        layoutContainer.className = 'company-grouped-layout';
        
        // Create main split container
        const mainSplitContainer = document.createElement('div');
        mainSplitContainer.className = 'main-split-container';
        
        // Get all companies
        const companies = this.groupItemsByCompany();
        
        // Use saved company order or derive from data
        let companyOrder = this.companyOrder;
        if (companyOrder.length === 0) {
            companyOrder = Object.keys(companies);
            this.companyOrder = companyOrder;
        }
        
        // Filter out companies that no longer have items
        companyOrder = companyOrder.filter(id => companies[id]);
        
        // Check for new companies not in the order
        Object.keys(companies).forEach(companyId => {
            if (!companyOrder.includes(companyId)) {
                companyOrder.push(companyId);
            }
        });
        
        // Update the saved order
        this.companyOrder = companyOrder;
        
        // Create all company blocks section
        const allCompanyBlocksSection = document.createElement('div');
        allCompanyBlocksSection.className = 'all-company-blocks-section';
        
        // Create all progress blocks section
        const allProgressBlocksSection = document.createElement('div');
        allProgressBlocksSection.className = 'all-progress-blocks-section';
        
        // Get saved company width or use default
        const savedCompanyWidth = localStorage.getItem('accelo_dashboard_company_width');
        const companyWidth = savedCompanyWidth ? parseInt(savedCompanyWidth) : 150;
        document.documentElement.style.setProperty('--company-blocks-width', companyWidth + 'px');
        
        if (companyOrder.length === 0) {
            const emptyState = UIComponents.createEmptyState(
                'No items on dashboard',
                'Click the "Add Items" button to add projects and agreements to your dashboard',
                'fa-clipboard'
            );
            layoutContainer.appendChild(emptyState);
            contentGrid.innerHTML = '';
            contentGrid.appendChild(layoutContainer);
            return;
        }
        
        // Create company blocks and progress containers
        companyOrder.forEach((companyId, index) => {
            const companyData = companies[companyId];
            if (!companyData) return;
            
            const company = companyData.company;
            
            // Create company block
            const companyBlock = document.createElement('div');
            companyBlock.className = 'company-block';
            companyBlock.dataset.companyId = companyId;
            companyBlock.draggable = true;
            companyBlock.dataset.companyIndex = index;
            
            // Calculate height based on number of progress items
            const itemCount = companyData.items.length;
            const progressBlockHeight = 50; // Base height of each progress block
            const gapHeight = 8; // var(--spacing-xs)
            const totalHeight = (progressBlockHeight * itemCount) + (gapHeight * (itemCount - 1));
            companyBlock.style.height = `${totalHeight}px`;
            
            // Get saved color theme for potential use later
            const savedColors = UIComponents.getSavedCompanyColors();
            const companyColor = savedColors[companyId];
            
            companyBlock.innerHTML = `
                <div class="company-block-content">
                    <div class="company-block-name">${UIComponents.escapeHtml(company.name)}</div>
                    <div class="company-block-overlay">
                        <button class="btn btn-icon btn-ghost company-color-btn" 
                                onclick="event.stopPropagation(); UIComponents.showColorPicker(${companyId}, '${UIComponents.escapeHtml(company.name)}')" 
                                title="Change company color">
                            <i class="fa-solid fa-palette"></i>
                        </button>
                    </div>
                </div>
            `;
            
            allCompanyBlocksSection.appendChild(companyBlock);
            
            // Create progress blocks container for this company
            const companyProgressContainer = document.createElement('div');
            companyProgressContainer.className = 'company-progress-container';
            companyProgressContainer.dataset.companyIndex = index;
            
            // Create the actual progress blocks container
            const progressBlocksContainer = document.createElement('div');
            progressBlocksContainer.className = 'progress-blocks-container';
            
            // Add progress blocks for this specific company in the correct order
            // Filter items from dashboardData to maintain order
            const companyItems = this.dashboardData.filter(item => {
                const itemCompanyId = item.company_id || (item.company_info ? item.company_info.id : null);
                return String(itemCompanyId) === String(companyId);
            });
            
            companyItems.forEach(item => {
                const block = this.createCompactProgressBlock(item);
                progressBlocksContainer.appendChild(block);
            });
            
            companyProgressContainer.appendChild(progressBlocksContainer);
            allProgressBlocksSection.appendChild(companyProgressContainer);
        });
        
        // Create the single global resizer
        const globalResizer = document.createElement('div');
        globalResizer.className = 'global-split-resizer';
        globalResizer.style.left = companyWidth + 'px'; // Set initial position
        
        mainSplitContainer.appendChild(allCompanyBlocksSection);
        mainSplitContainer.appendChild(globalResizer);
        mainSplitContainer.appendChild(allProgressBlocksSection);
        layoutContainer.appendChild(mainSplitContainer);
        
        // Add global resize functionality
        this.initializeGlobalResizer();
        
        contentGrid.innerHTML = '';
        contentGrid.appendChild(layoutContainer);
        
        // Update heights after rendering
        setTimeout(() => this.updateCompanyBlockHeights(), 100);
    }
    
    /**
     * Update company block heights to match their corresponding progress containers
     */
    updateCompanyBlockHeights() {
        const companyBlocks = document.querySelectorAll('.all-company-blocks-section .company-block');
        const progressContainers = document.querySelectorAll('.all-progress-blocks-section .company-progress-container');
        
        companyBlocks.forEach((block, index) => {
            const correspondingContainer = progressContainers[index];
            if (correspondingContainer) {
                const containerHeight = correspondingContainer.offsetHeight;
                block.style.height = `${containerHeight}px`;
            }
        });
    }

    /**
     * Initialize the global resizer functionality that affects all split panes
     */
    initializeGlobalResizer() {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        const minWidth = 80;
        const maxWidth = 300;

        const startResize = (e) => {
            isResizing = true;
            startX = e.clientX || e.touches[0].clientX;
            startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--company-blocks-width'), 10);
            
            // Add resizing class to the global resizer
            document.querySelectorAll('.global-split-resizer').forEach(r => r.classList.add('resizing'));
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            // Prevent text selection during drag
            e.preventDefault();
        };

        const doResize = (e) => {
            if (!isResizing) return;
            
            const clientX = e.clientX || e.touches[0].clientX;
            const delta = clientX - startX;
            const newWidth = Math.min(Math.max(startWidth + delta, minWidth), maxWidth);
            
            // Update CSS custom property globally
            document.documentElement.style.setProperty('--company-blocks-width', newWidth + 'px');
            
            // Update resizer position
            const resizer = document.querySelector('.global-split-resizer');
            if (resizer) {
                resizer.style.left = newWidth + 'px';
            }
            
            // Save preference
            localStorage.setItem('accelo_dashboard_company_width', newWidth);
            
            e.preventDefault();
        };

        const stopResize = () => {
            if (!isResizing) return;
            
            isResizing = false;
            document.querySelectorAll('.global-split-resizer').forEach(r => r.classList.remove('resizing'));
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        // Add event listeners to the global resizer
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('global-split-resizer')) {
                startResize(e);
            }
        });

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);

        // Touch events for mobile
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('global-split-resizer')) {
                startResize(e);
            }
        });

        document.addEventListener('touchmove', doResize);
        document.addEventListener('touchend', stopResize);
    }
    
    /**
     * Create a compact progress block matching the user's mockup design
     */
    createCompactProgressBlock(item) {
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
        
        const icon = isProject ? '<i class="fa-solid fa-diagram-project"></i>' : '<i class="fa-solid fa-file-contract"></i>';
        const title = item.title || item.name || `${type} #${item.id}`;
        
        // Calculate hours and percentage
        let loggedHours = 0;
        let totalHours = 0;
        let percentage = 0;
        let isBudgetSuspicious = false;
        
        if (isProject && item.hours) {
            loggedHours = (item.hours.billableHours || 0) + (item.hours.nonBillableHours || 0);
            
            // Look for budget in custom fields or use known project budgets
            totalHours = this.getProjectBudget(item.id, item.title, loggedHours);
            percentage = totalHours > 0 ? (loggedHours / totalHours) * 100 : 0;
            
            // Check if budget seems suspicious (likely calculated fallback)
            isBudgetSuspicious = this.isProjectBudgetSuspicious(item.id, item.title, loggedHours, totalHours);
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
        
        // Calculate remaining hours
        const remainingHours = Math.max(0, totalHours - loggedHours);
        
        // Determine progress status and colors
        let progressStatus = 'success'; // default green
        let statusClass = '';
        
        if (percentage > 100) {
            // Over budget - Red
            progressStatus = 'danger';
            statusClass = 'status-danger';
        } else if (percentage >= 75) {
            // Approaching limit - Yellow
            progressStatus = 'warning';
            statusClass = 'status-warning';
        } else {
            // On track - Green
            progressStatus = 'success';
            statusClass = 'status-success';
        }
        
        // Format period dates for agreements
        let periodInfo = '';
        if (!isProject && item.usage && item.usage.periodStart && item.usage.periodEnd) {
            const startDate = new Date(item.usage.periodStart + 'T00:00:00');
            const endDate = new Date(item.usage.periodEnd + 'T00:00:00');
            
            const formatDate = (date) => {
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });
            };
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                periodInfo = `<div class="compact-period-info">${formatDate(startDate)} - ${formatDate(endDate)}</div>`;
            }
        }

        // Create block element with status class
        const block = document.createElement('div');
        block.className = `compact-progress-block ${statusClass}`;
        block.dataset.itemId = item.id;
        block.draggable = true;
        
        // Add specific type dataset
        if (isProject) {
            block.dataset.projectId = item.id;
        } else {
            block.dataset.agreementId = item.id;
        }
        
        // Add company association for theming
        const companyId = item.company_id || (item.company_info ? item.company_info.id : null);
        if (companyId) {
            block.dataset.companyId = companyId;
        }

        // Create Accelo URL for the item
        const acceloUrl = this.createAcceloUrl(item.id, type);
        
        block.innerHTML = `
            <div class="compact-block-content">
                <div class="compact-block-left">
                    <div class="compact-block-header">
                        <div class="compact-block-icon">${icon}</div>
                        <div class="compact-block-title-section">
                            <a href="${acceloUrl}" target="_blank" class="compact-block-title compact-block-title-link" title="Open in Accelo">
                                ${UIComponents.escapeHtml(title)}
                            </a>
                        </div>
                    </div>
                </div>
                
                <div class="compact-block-type-section">
                    <div class="compact-block-type">${type === 'project' ? 'PROJECT' : 'AGREEMENT'}</div>
                    ${periodInfo}
                </div>
                
                <div class="compact-hours-section">
                    <div class="compact-hours-display">
                        <span class="compact-hours-logged">${formatHours(loggedHours)}</span>
                        <span class="compact-hours-separator">/</span>
                        <span class="compact-hours-total">${formatHours(totalHours)}</span>
                        ${isBudgetSuspicious ? '<span class="budget-warning" title="Budget may be estimated. Consider setting actual project budget.">⚠️</span>' : ''}
                    </div>
                </div>
                
                <div class="compact-percentage ${statusClass}">${Math.round(percentage)}%</div>
                
                <div class="compact-progress-bar">
                    <div class="compact-progress-fill compact-progress-${progressStatus}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                
                <div class="compact-remaining-section">
                    <div class="compact-remaining-time">${formatHours(remainingHours)}</div>
                    <div class="compact-remaining-label">Remaining</div>
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
     * Create Accelo URL for a project or agreement
     */
    createAcceloUrl(itemId, type) {
        if (!window.acceloAPI || !window.acceloAPI.deployment) {
            return '#';
        }
        
        const deployment = window.acceloAPI.deployment;
        
        if (type === 'project') {
            return `https://${deployment}.accelo.com/app/projects/${itemId}?tab=Overview`;
        } else if (type === 'agreement') {
            // Agreements use a different URL format
            return `https://${deployment}.accelo.com/?action=view_contract&id=${itemId}#?selected_tab=overview#END`;
        }
        
        return '#';
    }

    /**
     * Get project budget/maximum hours with better fallback handling
     */
    getProjectBudget(projectId, projectTitle, loggedHours) {
        // Known project budgets based on user's data
        const knownBudgets = {
            '415': 200, // PGG002 - 200h budget
            '423': 40,  // DLF - 40h budget  
            '268': 572, // Mussels App - 572h budget (confirmed from Project Plan)
            '352': 80,  // LMS Feature Requests Q1 2025 - 80h budget
        };
        
        // Check by ID first
        if (knownBudgets[projectId]) {
            return knownBudgets[projectId];
        }
        
        // Check by title patterns for known projects
        const titleLower = (projectTitle || '').toLowerCase();
        
        if (titleLower.includes('pgg002') || titleLower.includes('backlog development')) {
            return 200;
        }
        if (titleLower.includes('dlf') || titleLower.includes('tenant migration')) {
            return 40;
        }
        if (titleLower.includes('mussels app')) {
            return 572;
        }
        if (titleLower.includes('lms feature requests')) {
            return 80;
        }
        
        // For unknown projects, implement a smarter fallback system
        if (loggedHours > 0) {
            // Instead of arbitrary 120%, use different strategies based on logged hours
            if (loggedHours < 10) {
                // Small projects: assume 20-40h budget
                return Math.max(Math.ceil(loggedHours * 2), 20);
            } else if (loggedHours < 50) {
                // Medium projects: assume 10-25% buffer
                return Math.ceil(loggedHours * 1.15);
            } else if (loggedHours < 100) {
                // Large projects: assume 5-15% buffer
                return Math.ceil(loggedHours * 1.1);
            } else {
                // Very large projects: assume 5-10% buffer
                return Math.ceil(loggedHours * 1.05);
            }
        }
        
        // Final fallback - return a reasonable default based on company/project patterns
        return 40; // Conservative default for new projects
    }

    /**
     * Check if a project budget should be flagged as potentially incorrect
     */
    isProjectBudgetSuspicious(projectId, projectTitle, loggedHours, budgetHours) {
        // Known projects shouldn't be flagged
        const knownBudgets = {
            '415': 200, '423': 40, '268': 572, '352': 80
        };
        
        if (knownBudgets[projectId]) {
            return false;
        }
        
        // Flag if logged hours are significantly over budget and budget seems calculated
        const usagePercentage = (loggedHours / budgetHours) * 100;
        const seemsCalculated = budgetHours === Math.ceil(loggedHours * 1.2) || 
                               budgetHours === Math.ceil(loggedHours * 1.15) ||
                               budgetHours === Math.ceil(loggedHours * 1.1) ||
                               budgetHours === Math.ceil(loggedHours * 1.05);
        
        return usagePercentage > 90 && seemsCalculated;
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
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                UIComponents.applySavedCompanyColors();
            }, 50);
            
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
