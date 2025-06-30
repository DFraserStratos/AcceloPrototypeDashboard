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
import ExpandedViewManager from './managers/expanded-view-manager.js';

class Dashboard {
    constructor() {
        this.selectedCompanyId = null;
        this.dashboardData = []; // Will now store individual projects/agreements
        this.searchTimeout = null;
        this.selectedItems = new Set();
        
        // Dashboard management
        this.currentDashboardId = null;
        this.companyColors = {};
        this.expandedViewData = {}; // Cache for expanded view data
        
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
        this.expandedViewManager = new ExpandedViewManager(this);
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
            this.expandedViewManager.init();
            
            // Render dashboard
            this.renderManager.renderDashboard();
            
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
        this.expandedViewManager.cleanup();
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
