/**
 * DragDropManager - Handles all drag and drop functionality
 */
export default class DragDropManager {
    /**
     * Creates a new DragDropManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
        
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
     * Initialize drag and drop functionality
     * Sets up event delegation for all drag and drop interactions
     */
    init() {
        this.setupDragAndDrop();
    }
    
    /**
     * Clean up drag and drop functionality
     * Removes all event listeners to prevent memory leaks
     */
    cleanup() {
        this.cleanupDragAndDrop();
    }
    
    /**
     * Set up drag and drop functionality
     * Uses event delegation on the main content area for optimal performance
     * Handles both progress block and company block dragging
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
     * Removes all event listeners from the main content area
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
     * Determines if a progress block or company block is being dragged
     * @param {DragEvent} e - The drag start event
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
     * Sets up drag state and visual feedback for progress block dragging
     * @param {DragEvent} e - The drag start event
     * @param {HTMLElement} progressBlock - The progress block element being dragged
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
        const item = this.dashboard.dashboardData.find(d => 
            String(d.id) === String(itemId) && d.type === itemType
        );
        
        if (item) {
            this.dragState.draggedData = item;
            this.dragState.sourceCompanyId = item.company_id || (item.company_info ? item.company_info.id : null);
            this.dragState.sourceIndex = this.dashboard.dashboardData.indexOf(item);
            
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
                dashboardData: this.dashboard.dashboardData
            });
        }
    }
    
    /**
     * Start dragging a company block  
     * Sets up drag state and visual feedback for company block dragging
     * @param {DragEvent} e - The drag start event
     * @param {HTMLElement} companyBlock - The company block element being dragged
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
     * Creates a visual representation of the dragged element
     * @param {DragEvent} e - The drag start event
     * @param {HTMLElement} element - The element being dragged
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
     * Shows visual feedback for where items can be dropped
     * @param {string} dragType - Type of drag operation ('progress' or 'company')
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
     * Creates or retrieves the visual marker used to show drop position
     * @returns {HTMLElement} The insertion marker element
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
     * Finds the optimal insertion point based on mouse Y position
     * @param {HTMLElement} container - The container to search within
     * @param {number} y - The Y coordinate of the mouse
     * @param {string} selector - CSS selector for draggable elements
     * @returns {HTMLElement|null} The element after which to insert, or null for beginning
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
     * Provides visual feedback when entering valid drop zones
     * @param {DragEvent} e - The drag enter event
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
     * Removes visual feedback when leaving drop zones
     * @param {DragEvent} e - The drag leave event
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
     * Processes the drop and delegates to appropriate handler
     * @param {DragEvent} e - The drop event
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
     * Handles dropping of progress blocks within the same company
     * @param {DragEvent} e - The drop event
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
     * Handles dropping of company blocks to reorder companies
     * @param {DragEvent} e - The drop event
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
     * Updates dashboard data to reflect new position of progress block
     * Enforces business rule that progress blocks cannot move between companies
     * @param {Object} item - The item being moved
     * @param {number} targetCompanyId - The target company ID
     * @param {HTMLElement|null} afterElement - Element to insert after, or null for beginning
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
            const afterIndex = this.dashboard.dashboardData.findIndex(d => 
                String(d.id) === String(afterItemId) && d.type === afterItemType
            );
            
            if (afterIndex !== -1) {
                // Get current position
                const currentIndex = this.dashboard.dashboardData.indexOf(item);
                
                if (currentIndex !== -1) {
                    // Remove the item from its current position
                    this.dashboard.dashboardData.splice(currentIndex, 1);
                    
                    // Calculate where to insert
                    // If we removed an item before the target position, adjust the index
                    let insertIndex = afterIndex;
                    if (currentIndex < afterIndex) {
                        insertIndex = afterIndex - 1;
                    }
                    
                    // We want to insert AFTER the target element, so add 1
                    insertIndex = insertIndex + 1;
                    
                    this.dashboard.dashboardData.splice(insertIndex, 0, item);
                } else {
                    console.error('Could not find current item in dashboardData');
                }
            } else {
                console.error('Could not find afterElement in dashboardData');
            }
        } else {
            // No afterElement means insert at beginning of company's items
            // Remove from old position
            const currentIndex = this.dashboard.dashboardData.indexOf(item);
            if (currentIndex !== -1) {
                this.dashboard.dashboardData.splice(currentIndex, 1);
            }
            
            // Find first item of target company
            let firstIndex = -1;
            for (let i = 0; i < this.dashboard.dashboardData.length; i++) {
                const itemCompanyId = this.dashboard.dashboardData[i].company_id || 
                                     (this.dashboard.dashboardData[i].company_info ? this.dashboard.dashboardData[i].company_info.id : null);
                if (String(itemCompanyId) === String(targetCompanyId)) {
                    firstIndex = i;
                    break;
                }
            }
            
            if (firstIndex !== -1) {
                // Insert before first item of company
                this.dashboard.dashboardData.splice(firstIndex, 0, item);
            } else {
                // No items for this company yet, just push
                this.dashboard.dashboardData.push(item);
            }
        }
        
        // Save and re-render
        this.dashboard.dataManager.saveDashboardState();
        
        // Add reordering class to prevent height animations
        document.body.classList.add('is-reordering');
        this.dashboard.renderDashboard();
        
        // Reapply saved company colors after rendering
        setTimeout(() => {
            this.dashboard.applySavedCompanyColors();
        }, 50);
    }
    
    /**
     * Reorder companies
     * Updates company order and reorders dashboard data accordingly
     * @param {number} companyId - The ID of the company being moved
     * @param {HTMLElement|null} afterElement - Element to insert after, or null for beginning
     */
    reorderCompanies(companyId, afterElement) {
        // Use the saved company order, not the order from groupItemsByCompany
        let companyIds = [...this.dashboard.companyOrder]; // Clone the array
        
        // If no saved order exists, get it from the data
        if (companyIds.length === 0) {
            const companies = this.dashboard.groupItemsByCompany();
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
            const companyItems = this.dashboard.dashboardData.filter(item => {
                // Check both company_id and company_info.id for compatibility
                const itemCompanyId = item.company_id || (item.company_info ? item.company_info.id : null);
                // Convert both to strings for consistent comparison
                return String(itemCompanyId) === String(id);
            });
            newDashboardData.push(...companyItems);
        });
        
        this.dashboard.dashboardData = newDashboardData;
        
        // Save the new company order
        this.dashboard.companyOrder = companyIds;
        
        // Save and re-render
        this.dashboard.dataManager.saveDashboardState();
        
        // Add reordering class to prevent height animations
        document.body.classList.add('is-reordering');
        this.dashboard.renderDashboard();
        
        // Reapply saved company colors after rendering
        setTimeout(() => {
            this.dashboard.applySavedCompanyColors();
        }, 50);
    }
    
    /**
     * Handle drag end event
     * Cleans up drag state when drag operation ends
     * @param {DragEvent} e - The drag end event
     */
    handleDragEnd(e) {
        this.cleanupDragState();
    }
    
    /**
     * Clean up drag state
     * Removes all visual indicators and resets drag state object
     * Called after successful drop or cancelled drag operation
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
} 