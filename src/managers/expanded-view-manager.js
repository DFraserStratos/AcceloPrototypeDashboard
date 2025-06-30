/**
 * ExpandedViewManager - Handles expanded drawer views for progress blocks
 */
export default class ExpandedViewManager {
    /**
     * Creates a new ExpandedViewManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentExpandedId = null;
        this.expandedData = new Map(); // Cache for expanded view data
        this.isLoadingDetails = new Map(); // Track loading state per project
        this.clickThreshold = 200; // ms to distinguish click from drag
        this.dragThreshold = 5; // pixels to distinguish drag from click
    }
    
    /**
     * Initialize the expanded view manager
     */
    init() {
        // Load any previously cached expanded view data from localStorage
        this.loadCachedData();
        
        // Set up click outside handler
        this.setupClickOutsideHandler();
        
        // Set up visibility change handler for tab switching
        this.setupVisibilityChangeHandler();
        
        // Start background data loading after initial render
        // Reduced delay since we now have cached data to show immediately
        setTimeout(() => this.preloadAllProjectDetails(), 1000);
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        document.removeEventListener('click', this.handleClickOutside);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        // Don't clear cache on cleanup - we want it to persist
        this.isLoadingDetails.clear();
        this.currentExpandedId = null;
    }
    
    /**
     * Setup click outside handler
     */
    setupClickOutsideHandler() {
        this.handleClickOutside = (e) => {
            if (this.currentExpandedId && 
                !e.target.closest('.compact-progress-block') && 
                !e.target.closest('.expanded-drawer')) {
                this.collapseDrawer();
            }
        };
        
        document.addEventListener('click', this.handleClickOutside);
    }
    
    /**
     * Setup visibility change handler for tab switching
     */
    setupVisibilityChangeHandler() {
        this.handleVisibilityChange = () => {
            // When the tab becomes visible again, validate expanded state and recalculate heights
            if (!document.hidden) {
                // Small delay to ensure layout has settled after tab switch
                setTimeout(() => {
                    this.validateExpandedState();
                    if (this.currentExpandedId) {
                        this.dashboard.renderManager.updateCompanyBlockHeights();
                    }
                }, 100);
            }
        };
        
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    /**
     * Handle click on progress block
     */
    handleProgressBlockClick(blockElement, item) {
        // First validate that our current state matches the DOM
        this.validateExpandedState();
        
        const itemId = `${item.type}_${item.id}`;
        
        if (this.currentExpandedId === itemId) {
            // Clicking the same block closes it
            this.collapseDrawer();
        } else {
            // Close any existing drawer first
            if (this.currentExpandedId) {
                this.collapseDrawer(false); // Don't animate the close
            }
            
            // Open the new drawer
            this.expandDrawer(blockElement, item);
        }
    }
    
    /**
     * Expand a drawer for a progress block
     */
    async expandDrawer(blockElement, item) {
        const itemId = `${item.type}_${item.id}`;
        this.currentExpandedId = itemId;
        
        // Check if block already has a wrapper
        let wrapper = blockElement.closest('.progress-block-wrapper');
        if (!wrapper) {
            // Create wrapper and wrap the block
            wrapper = document.createElement('div');
            wrapper.className = 'progress-block-wrapper';
            blockElement.parentNode.insertBefore(wrapper, blockElement);
            wrapper.appendChild(blockElement);
        }
        
        // Mark block as expanded
        blockElement.classList.add('is-expanded');
        
        // Create drawer element
        const drawer = this.createDrawerElement(item);
        wrapper.appendChild(drawer);
        
        // Load content
        await this.loadDrawerContent(drawer, item);
        
        // Trigger reflow for animation
        drawer.offsetHeight;
        drawer.classList.add('is-open');
        
        // Update company block heights after animation
        setTimeout(() => {
            this.dashboard.renderManager.updateCompanyBlockHeights();
        }, 300);
    }
    
    /**
     * Collapse the current drawer
     */
    collapseDrawer(animate = true) {
        if (!this.currentExpandedId) return;
        
        const expandedBlock = document.querySelector('.compact-progress-block.is-expanded');
        const wrapper = expandedBlock?.closest('.progress-block-wrapper');
        const drawer = wrapper?.querySelector('.expanded-drawer');
        
        if (drawer) {
            if (animate) {
                drawer.classList.remove('is-open');
                setTimeout(() => {
                    expandedBlock?.classList.remove('is-expanded');
                    drawer.remove();
                    // Unwrap if needed
                    if (wrapper && wrapper.children.length === 1) {
                        const block = wrapper.firstElementChild;
                        wrapper.parentNode.insertBefore(block, wrapper);
                        wrapper.remove();
                    }
                    this.dashboard.renderManager.updateCompanyBlockHeights();
                }, 300);
            } else {
                expandedBlock?.classList.remove('is-expanded');
                drawer.remove();
                // Unwrap if needed
                if (wrapper && wrapper.children.length === 1) {
                    const block = wrapper.firstElementChild;
                    wrapper.parentNode.insertBefore(block, wrapper);
                    wrapper.remove();
                }
                this.dashboard.renderManager.updateCompanyBlockHeights();
            }
        }
        
        this.currentExpandedId = null;
    }
    
    /**
     * Create the drawer element structure
     */
    createDrawerElement(item) {
        const drawer = document.createElement('div');
        drawer.className = 'expanded-drawer';
        
        // Get the status class from the parent block
        const statusClass = item.hours ? this.getStatusClass(item) : '';
        if (statusClass) {
            drawer.classList.add(statusClass);
        }
        
        drawer.innerHTML = `
            <div class="drawer-content">
                <div class="drawer-loading">
                    <div class="spinner-small"></div>
                    <span>Loading details...</span>
                </div>
                <div class="drawer-items" style="display: none;">
                    <!-- Items will be loaded here -->
                </div>
                <div class="drawer-empty" style="display: none;">
                    <i class="fa-solid fa-inbox"></i>
                    <p>No tasks or milestones to display</p>
                </div>
                <div class="drawer-error" style="display: none;">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Failed to load details</p>
                </div>
            </div>
        `;
        
        return drawer;
    }
    
    /**
     * Load content for the drawer
     */
    async loadDrawerContent(drawer, item) {
        const itemId = `${item.type}_${item.id}`;
        const loadingEl = drawer.querySelector('.drawer-loading');
        const itemsEl = drawer.querySelector('.drawer-items');
        const emptyEl = drawer.querySelector('.drawer-empty');
        const errorEl = drawer.querySelector('.drawer-error');
        
        try {
            // Check if data is already cached
            if (this.expandedData.has(itemId)) {
                const data = this.expandedData.get(itemId);
                this.renderDrawerItems(itemsEl, data, item);
                loadingEl.style.display = 'none';
                
                if (data.tasks.length === 0 && data.milestones.length === 0) {
                    emptyEl.style.display = 'block';
                } else {
                    itemsEl.style.display = 'block';
                }
            } else {
                // Data not cached, fetch it
                if (item.type === 'project') {
                    const data = await window.acceloAPI.getProjectTasksAndMilestones(item.id);
                    
                    // Cache in memory for immediate access
                    this.expandedData.set(itemId, data);
                    
                    // Save to persistent storage for future page loads
                    this.dashboard.dataManager.saveExpandedViewData(itemId, data);
                    
                    this.renderDrawerItems(itemsEl, data, item);
                    loadingEl.style.display = 'none';
                    
                    if (data.tasks.length === 0 && data.milestones.length === 0) {
                        emptyEl.style.display = 'block';
                    } else {
                        itemsEl.style.display = 'block';
                    }
                } else {
                    // For agreements, show empty state for now
                    loadingEl.style.display = 'none';
                    emptyEl.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Failed to load drawer content:', error);
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
            
            // Log to API log
            if (window.addLog) {
                window.addLog('error', `Failed to load details for ${item.type} ${item.id}: ${error.message}`);
            }
        }
    }
    
    /**
     * Render drawer items (tasks and milestones)
     */
    renderDrawerItems(container, data, parentItem) {
        container.innerHTML = '';
        
        // Get project budget for calculating task/milestone progress
        const projectBudget = this.dashboard.renderManager.getProjectBudget(
            parentItem.id, 
            parentItem.title, 
            parentItem.hours?.totalHours || 0
        );
        
        // Render top-level tasks first (indented 1 level)
        const topLevelTasks = data.tasks.filter(task => !task.parentMilestoneId);
        topLevelTasks.forEach(task => {
            const taskEl = this.createDrawerItemElement(task, projectBudget, 1); // Indent level 1
            container.appendChild(taskEl);
        });
        
        // Render milestones with their sub-tasks
        data.milestones.forEach(milestone => {
            const milestoneEl = this.createDrawerItemElement(milestone, projectBudget, 1); // Indent level 1
            container.appendChild(milestoneEl);
            
            // Render sub-tasks under this milestone (indented 2 levels)
            if (milestone.tasks && milestone.tasks.length > 0) {
                milestone.tasks.forEach(task => {
                    const taskEl = this.createDrawerItemElement(task, projectBudget, 2); // Indent level 2
                    container.appendChild(taskEl);
                });
            }
        });
    }
    
    /**
     * Create an individual drawer item element
     */
    createDrawerItemElement(item, projectBudget, indentLevel = 0) {
        const itemEl = document.createElement('div');
        itemEl.className = `drawer-item drawer-item-${item.type}`;
        if (indentLevel > 0) {
            itemEl.classList.add(`indent-${indentLevel}`);
        }
        
        // Get hours data
        const totalHours = item.hours?.totalHours || 0;
        const budgetHours = item.hours?.budgetHours || 0;
        
        // Calculate progress based on individual item budget (not project budget)
        const percentage = budgetHours > 0 ? (totalHours / budgetHours) * 100 : 0;
        const remainingHours = Math.max(0, budgetHours - totalHours);
        const overBudgetHours = Math.max(0, totalHours - budgetHours);
        const isOverBudget = percentage > 100;
        
        // Determine status
        let progressStatus = 'success';
        let statusClass = '';
        if (budgetHours > 0) {
            if (percentage > 100) {
                progressStatus = 'danger';
                statusClass = 'status-danger';
            } else if (percentage >= 75) {
                progressStatus = 'warning';
                statusClass = 'status-warning';
            }
        }
        
        // Icon based on type
        const icon = item.type === 'milestone' 
            ? '<i class="fa-solid fa-flag-checkered"></i>' 
            : '<i class="fa-solid fa-list-check"></i>';
        
        // Type label
        const typeLabel = item.type === 'milestone' ? 'MILESTONE' : 'TASK';
        
        // Format hours
        const formatHours = (hours) => {
            if (hours === 0) return '0h 0m';
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${h}h ${m}m`;
        };
        
        // Handle cases where there's no budget allocation
        const budgetDisplay = budgetHours > 0 ? formatHours(budgetHours) : '-';
        const showProgressBar = budgetHours > 0;
        const showPercentage = budgetHours > 0;
        const showRemaining = budgetHours > 0;
        
        // Create the exact same structure as compact progress blocks
        itemEl.innerHTML = `
            <div class="drawer-item-content">
                <div class="drawer-item-left">
                    <div class="drawer-item-header">
                        <div class="drawer-item-icon">${icon}</div>
                        <div class="drawer-item-title-section">
                            <div class="drawer-item-title">${UIComponents.escapeHtml(item.title)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="drawer-item-type-section">
                    <div class="drawer-item-type">${typeLabel}</div>
                </div>
                
                <div class="drawer-item-hours">
                    <span class="drawer-hours-logged">${formatHours(totalHours)}</span>
                    <span class="drawer-hours-separator"> / </span>
                    <span class="drawer-hours-total">${budgetDisplay}</span>
                </div>
                
                ${showPercentage ? `<div class="drawer-item-percentage ${statusClass}">${Math.round(percentage)}%</div>` : '<div class="drawer-item-percentage">-</div>'}
                
                ${showProgressBar ? `
                    <div class="drawer-item-progress-bar">
                        <div class="drawer-item-progress-fill progress-${progressStatus}" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                ` : '<div class="drawer-item-progress-bar"><div class="drawer-item-progress-fill progress-none" style="width: 0%"></div></div>'}
                
                ${showRemaining ? `
                    <div class="drawer-item-remaining">
                        <div class="drawer-item-remaining-value">${isOverBudget ? formatHours(overBudgetHours) : formatHours(remainingHours)}</div>
                        <div class="drawer-item-remaining-label">${isOverBudget ? 'Over' : 'Remaining'}</div>
                    </div>
                ` : '<div class="drawer-item-remaining"><div class="drawer-item-remaining-value">-</div><div class="drawer-item-remaining-label">No Budget</div></div>'}
            </div>
        `;
        
        return itemEl;
    }
    
    /**
     * Get status class based on progress
     */
    getStatusClass(item) {
        if (item.type === 'project' && item.hours) {
            const loggedHours = item.hours.totalHours || 0;
            const budgetHours = this.dashboard.renderManager.getProjectBudget(item.id, item.title, loggedHours);
            const percentage = budgetHours > 0 ? (loggedHours / budgetHours) * 100 : 0;
            
            if (percentage > 100) return 'status-danger';
            if (percentage >= 75) return 'status-warning';
            return 'status-success';
        }
        
        if ((item.type === 'agreement' || item.type === 'contract') && item.usage) {
            const usage = item.usage;
            let percentage = 0;
            
            if (usage.budgetType === 'time' && usage.timeAllowance > 0) {
                percentage = (usage.timeUsed / usage.timeAllowance) * 100;
            } else if (usage.budgetType === 'value' && usage.valueAllowance > 0) {
                percentage = (usage.valueUsed / usage.valueAllowance) * 100;
            }
            
            if (percentage > 100) return 'status-danger';
            if (percentage >= 75) return 'status-warning';
            if (percentage > 0) return 'status-success';
        }
        
        return 'status-success'; // Default to success if no status can be determined
    }
    
    /**
     * Preload all project details in the background
     */
    async preloadAllProjectDetails() {
        // Get all projects from dashboard data
        const projects = this.dashboard.dashboardData.filter(item => item.type === 'project');
        
        if (projects.length === 0) return;
        
        // Update loading indicator
        this.updateLoadingIndicator(true);
        
        let loadedCount = 0;
        const totalCount = projects.length;
        
        for (const project of projects) {
            const itemId = `project_${project.id}`;
            
            // Skip if already cached
            if (this.expandedData.has(itemId)) {
                loadedCount++;
                continue;
            }
            
            // Skip if already loading
            if (this.isLoadingDetails.get(itemId)) {
                continue;
            }
            
            try {
                this.isLoadingDetails.set(itemId, true);
                const data = await window.acceloAPI.getProjectTasksAndMilestones(project.id);
                
                // Cache in memory for immediate access
                this.expandedData.set(itemId, data);
                
                // Save to persistent storage for future page loads
                this.dashboard.dataManager.saveExpandedViewData(itemId, data);
                
                loadedCount++;
                
                console.log(`[ExpandedView] Preloaded project ${project.id} (${loadedCount}/${totalCount})`);
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to preload details for project ${project.id}:`, error);
            } finally {
                this.isLoadingDetails.set(itemId, false);
            }
        }
        
        // Update loading indicator
        this.updateLoadingIndicator(false);
        
        console.log(`[ExpandedView] Background preloading complete: ${loadedCount}/${totalCount} projects loaded`);
    }
    
    /**
     * Update the loading indicator in the navbar
     */
    updateLoadingIndicator(isLoading) {
        const dashboardIcon = document.querySelector('.dashboard-info i');
        
        if (dashboardIcon) {
            if (isLoading) {
                // Replace dashboard icon with spinner
                dashboardIcon.className = 'fa-solid fa-spinner fa-spin';
                dashboardIcon.title = 'Loading project details...';
            } else {
                // Restore dashboard icon
                dashboardIcon.className = 'fa-solid fa-chart-simple';
                dashboardIcon.title = '';
            }
        }
    }
    
    /**
     * Load cached expanded view data from localStorage
     */
    loadCachedData() {
        try {
            const cachedData = this.dashboard.dataManager.getAllExpandedViewData();
            
            // Convert the cached object back to Map entries
            for (const [itemId, data] of Object.entries(cachedData)) {
                // Only load data that's not too old (within 24 hours)
                const cachedAt = new Date(data.cachedAt);
                const now = new Date();
                const hoursOld = (now - cachedAt) / (1000 * 60 * 60);
                
                if (hoursOld < 24) {
                    // Remove the cachedAt timestamp before storing in the Map
                    const { cachedAt, ...expandedData } = data;
                    this.expandedData.set(itemId, expandedData);
                    console.log(`[ExpandedView] Loaded cached data for ${itemId} (${Math.round(hoursOld)}h old)`);
                } else {
                    console.log(`[ExpandedView] Skipping stale cached data for ${itemId} (${Math.round(hoursOld)}h old)`);
                }
            }
            
            if (this.expandedData.size > 0) {
                console.log(`[ExpandedView] Loaded ${this.expandedData.size} cached expanded view items from localStorage`);
            }
        } catch (error) {
            console.error('Failed to load cached expanded view data:', error);
            this.expandedData.clear();
        }
    }
    
    /**
     * Validate that the current expanded state matches the DOM
     * If the DOM was re-rendered and the expanded elements no longer exist, clear the state
     * Also cleans up any orphaned expanded elements
     */
    validateExpandedState() {
        // Check for multiple expanded blocks (should never happen)
        const expandedBlocks = document.querySelectorAll('.compact-progress-block.is-expanded');
        const expandedDrawers = document.querySelectorAll('.expanded-drawer.is-open');
        
        // Clean up multiple expanded elements
        if (expandedBlocks.length > 1) {
            console.warn(`[ExpandedView] Found ${expandedBlocks.length} expanded blocks, cleaning up extras`);
            for (let i = 1; i < expandedBlocks.length; i++) {
                expandedBlocks[i].classList.remove('is-expanded');
            }
        }
        
        if (expandedDrawers.length > 1) {
            console.warn(`[ExpandedView] Found ${expandedDrawers.length} expanded drawers, cleaning up extras`);
            for (let i = 1; i < expandedDrawers.length; i++) {
                expandedDrawers[i].remove();
            }
        }
        
        // If we think something is expanded, validate it exists in DOM
        if (this.currentExpandedId) {
            const expandedBlock = document.querySelector('.compact-progress-block.is-expanded');
            const expandedDrawer = document.querySelector('.expanded-drawer.is-open');
            
            // If we think something is expanded but can't find the visual elements, clear the state
            if (!expandedBlock || !expandedDrawer) {
                console.log(`[ExpandedView] Clearing stale expanded state for ${this.currentExpandedId}`);
                this.currentExpandedId = null;
            }
        } else {
            // If we don't think anything is expanded but find expanded elements, clean them up
            if (expandedBlocks.length > 0 || expandedDrawers.length > 0) {
                console.log(`[ExpandedView] Found orphaned expanded elements, cleaning up`);
                expandedBlocks.forEach(block => block.classList.remove('is-expanded'));
                expandedDrawers.forEach(drawer => drawer.remove());
            }
        }
    }
}
