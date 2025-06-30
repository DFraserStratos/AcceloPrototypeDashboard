/**
 * DataManager handles data persistence, routing, and dashboard state management
 */
export default class DataManager {
    /**
     * Creates a new DataManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
    }
    
    /**
     * Initialize data-related functionality
     * Most initialization is handled by specific method calls from Dashboard.init()
     */
    init() {
        // Initialize data-related functionality
        // Most initialization is handled by specific method calls from Dashboard.init()
    }
    
    /**
     * Cleanup resources
     * No event listeners or timers to clean up for DataManager
     */
    cleanup() {
        // Cleanup resources - no event listeners or timers to clean up
    }
    
    /**
     * Handle routing for dashboard selection
     * Processes URL parameters to determine which dashboard to load
     * and handles dashboard rename functionality if requested
     * @returns {Promise<void>}
     */
    async handleRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const dashboardIdParam = urlParams.get('dashboard');
        const shouldRename = urlParams.get('rename') === 'true';
        
        if (dashboardIdParam) {
            // Validate dashboard exists
            const dashboard = window.dashboardManager.getDashboard(dashboardIdParam);
            if (dashboard) {
                this.dashboard.currentDashboardId = dashboardIdParam;
                window.dashboardManager.setCurrentDashboard(dashboardIdParam);
                window.dashboardManager.updateDashboardAccess(dashboardIdParam);
                this.updateDashboardNameBadge(dashboard.name);
                
                // If rename flag is set, show rename modal after a brief delay
                if (shouldRename) {
                    setTimeout(() => {
                        this.dashboard.showDashboardRenameModal(dashboard.name);
                    }, 500);
                }
            } else {
                // Dashboard doesn't exist, redirect to dashboards page
                window.location.href = '/dashboards.html';
                return;
            }
        } else {
            // No dashboard specified, check if we have a current dashboard
            const currentDashboardId = window.dashboardManager.getCurrentDashboardId();
            if (currentDashboardId) {
                this.dashboard.currentDashboardId = currentDashboardId;
                const dashboard = window.dashboardManager.getDashboard(currentDashboardId);
                if (dashboard) {
                    this.updateDashboardNameBadge(dashboard.name);
                }
            } else {
                // No current dashboard, redirect to dashboards page
                window.location.href = '/dashboards.html';
                return;
            }
        }
    }

    /**
     * Update dashboard name badge in navbar
     * Shows or hides the dashboard name badge based on whether a name is provided
     * @param {string} dashboardName - The name to display in the navbar badge
     */
    updateDashboardNameBadge(dashboardName) {
        const context = document.getElementById('navbarDashboardContext');
        const nameElement = document.getElementById('navbarDashboardName');
        
        if (context && nameElement) {
            if (dashboardName && dashboardName.trim()) {
                nameElement.textContent = dashboardName;
                context.style.display = 'flex';
            } else {
                context.style.display = 'none';
            }
        }
    }
    
    /**
     * Load saved dashboard state from localStorage
     * Restores dashboard data, company order, and company colors from persistent storage
     * @returns {Promise<void>}
     */
    async loadDashboardState() {
        if (!this.dashboard.currentDashboardId) {
            console.error('No current dashboard ID set');
            return;
        }
        
        const dashboardData = window.dashboardManager.loadDashboardData(this.dashboard.currentDashboardId);
        this.dashboard.dashboardData = dashboardData.dashboardData || [];
        this.dashboard.companyOrder = dashboardData.companyOrder || [];
        this.dashboard.companyColors = dashboardData.companyColors || {};
        
        // Load expanded view data for the expanded view manager
        this.dashboard.expandedViewData = dashboardData.expandedViewData || {};
        
        // If no company order saved, derive it from dashboardData
        if (this.dashboard.companyOrder.length === 0 && this.dashboard.dashboardData.length > 0) {
            const companies = this.dashboard.groupItemsByCompany();
            this.dashboard.companyOrder = Object.keys(companies);
        }
    }
    
    /**
     * Save dashboard state to localStorage
     * Persists current dashboard data, company order, and company colors
     */
    saveDashboardState() {
        if (!this.dashboard.currentDashboardId) {
            console.error('No current dashboard ID set');
            return;
        }
        
        const state = {
            dashboardData: this.dashboard.dashboardData,
            companyOrder: this.dashboard.companyOrder,
            companyColors: this.dashboard.companyColors,
            expandedViewData: this.dashboard.expandedViewData || {}
        };
        
        window.dashboardManager.saveDashboardData(this.dashboard.currentDashboardId, state);
    }
    
    /**
     * Load expanded view data for a specific item
     * @param {string} itemId - The item ID (e.g., "project_123")
     * @returns {object|null} - The cached expanded view data or null if not found
     */
    loadExpandedViewData(itemId) {
        return this.dashboard.expandedViewData?.[itemId] || null;
    }
    
    /**
     * Save expanded view data for a specific item
     * @param {string} itemId - The item ID (e.g., "project_123")
     * @param {object} data - The expanded view data to cache
     */
    saveExpandedViewData(itemId, data) {
        if (!this.dashboard.expandedViewData) {
            this.dashboard.expandedViewData = {};
        }
        
        this.dashboard.expandedViewData[itemId] = {
            ...data,
            cachedAt: new Date().toISOString()
        };
        
        // Save to localStorage immediately
        this.saveDashboardState();
    }
    
    /**
     * Get all expanded view data
     * @returns {object} - All cached expanded view data
     */
    getAllExpandedViewData() {
        return this.dashboard.expandedViewData || {};
    }
    
    /**
     * Clear all expanded view data
     */
    clearExpandedViewData() {
        this.dashboard.expandedViewData = {};
        this.saveDashboardState();
    }
    
    /**
     * Refresh all dashboard data from API
     * Re-fetches hours/usage data for all dashboard items from the Accelo API
     * and updates the display with the latest information
     * @returns {Promise<void>}
     */
    async refreshDashboardData() {
        if (this.dashboard.dashboardData.length === 0) {
            this.dashboard.renderManager.renderDashboard();
            return;
        }

        try {
            UIComponents.showLoading();
            
            // Clear expanded view cache since we're refreshing all data
            this.clearExpandedViewData();
            
            // Clear the in-memory expanded view cache as well
            if (this.dashboard.expandedViewManager) {
                this.dashboard.expandedViewManager.expandedData.clear();
            }
            
            // Refresh data for each item
            for (let i = 0; i < this.dashboard.dashboardData.length; i++) {
                const item = this.dashboard.dashboardData[i];
                
                if (item.type === 'project') {
                    try {
                        const hours = await window.acceloAPI.getProjectHours(item.id);
                        this.dashboard.dashboardData[i].hours = hours;
                    } catch (error) {
                        console.error(`Failed to refresh hours for project ${item.id}:`, error);
                    }
                } else if (item.type === 'agreement') {
                    try {
                        const usage = await window.acceloAPI.getAgreementUsage(item.id);
                        this.dashboard.dashboardData[i].usage = usage;
                    } catch (error) {
                        console.error(`Failed to refresh usage for agreement ${item.id}:`, error);
                    }
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Save the refreshed data and re-render
            this.saveDashboardState();
            this.dashboard.renderManager.renderDashboard();
            
            // Reapply saved company colors after rendering
            setTimeout(() => {
                this.dashboard.applySavedCompanyColors();
            }, 50);
            
            UIComponents.showToast('Dashboard data refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Failed to refresh dashboard data:', error);
            UIComponents.showToast('Failed to refresh data: ' + error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }
} 