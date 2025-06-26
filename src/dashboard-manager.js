/**
 * Dashboard Manager - Handles multiple dashboards
 */

class DashboardManager {
    constructor() {
        this.dashboards = [];
        this.currentDashboardId = null;
    }

    /**
     * Initialize the dashboard manager
     */
    async init() {
        await this.loadDashboards();
        await this.migrateOldData();
        
        // Ensure we have at least one dashboard
        if (this.dashboards.length === 0) {
            await this.createDashboard('Main Dashboard');
        }
    }

    /**
     * Load dashboards from localStorage
     */
    async loadDashboards() {
        try {
            const dashboardsData = localStorage.getItem('dashboards_index');
            if (dashboardsData) {
                const data = JSON.parse(dashboardsData);
                this.dashboards = data.dashboards || [];
                this.currentDashboardId = data.currentDashboardId || null;
            }
        } catch (error) {
            console.error('Failed to load dashboards:', error);
            this.dashboards = [];
            this.currentDashboardId = null;
        }
    }

    /**
     * Save dashboards to localStorage
     */
    saveDashboards() {
        const data = {
            dashboards: this.dashboards,
            currentDashboardId: this.currentDashboardId,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('dashboards_index', JSON.stringify(data));
    }

    /**
     * Create a new dashboard
     */
    async createDashboard(name, setAsCurrent = true) {
        const id = Date.now().toString();
        const dashboard = {
            id: id,
            name: name,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.dashboards.push(dashboard);
        
        if (setAsCurrent) {
            this.currentDashboardId = id;
        }

        // Initialize empty dashboard data
        const dashboardData = {
            dashboardData: [],
            companyOrder: [],
            companyColors: {},
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(`dashboard_data_${id}`, JSON.stringify(dashboardData));
        this.saveDashboards();
        
        return dashboard;
    }

    /**
     * Delete a dashboard
     */
    deleteDashboard(dashboardId) {
        // Don't delete the last dashboard
        if (this.dashboards.length <= 1) {
            throw new Error('Cannot delete the last dashboard');
        }

        // Remove from dashboards array
        this.dashboards = this.dashboards.filter(d => d.id !== dashboardId);
        
        // Remove dashboard data
        localStorage.removeItem(`dashboard_data_${dashboardId}`);
        
        // If this was the current dashboard, switch to another
        if (this.currentDashboardId === dashboardId) {
            this.currentDashboardId = this.dashboards[0].id;
        }
        
        this.saveDashboards();
    }

    /**
     * Rename a dashboard
     */
    renameDashboard(dashboardId, newName) {
        const dashboard = this.dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
            dashboard.name = newName;
            dashboard.lastUpdated = new Date().toISOString();
            this.saveDashboards();
        }
    }

    /**
     * Get dashboard by ID
     */
    getDashboard(dashboardId) {
        return this.dashboards.find(d => d.id === dashboardId);
    }

    /**
     * Get all dashboards
     */
    getAllDashboards() {
        return [...this.dashboards];
    }

    /**
     * Set current dashboard
     */
    setCurrentDashboard(dashboardId) {
        if (this.dashboards.find(d => d.id === dashboardId)) {
            this.currentDashboardId = dashboardId;
            this.saveDashboards();
        }
    }

    /**
     * Get current dashboard ID
     */
    getCurrentDashboardId() {
        return this.currentDashboardId;
    }

    /**
     * Load dashboard data
     */
    loadDashboardData(dashboardId) {
        try {
            const data = localStorage.getItem(`dashboard_data_${dashboardId}`);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
        
        // Return empty dashboard data if not found
        return {
            dashboardData: [],
            companyOrder: [],
            companyColors: {},
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Save dashboard data
     */
    saveDashboardData(dashboardId, data) {
        const dashboardData = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(`dashboard_data_${dashboardId}`, JSON.stringify(dashboardData));
        
        // Update dashboard's lastUpdated
        const dashboard = this.dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
            dashboard.lastUpdated = new Date().toISOString();
            this.saveDashboards();
        }
    }

    /**
     * Migrate old single dashboard data to new format
     */
    async migrateOldData() {
        const oldData = localStorage.getItem('accelo_dashboard_state');
        const oldColors = localStorage.getItem('company_colors');
        
        if (oldData && this.dashboards.length === 0) {
            try {
                const data = JSON.parse(oldData);
                let colors = {};
                
                if (oldColors) {
                    colors = JSON.parse(oldColors);
                }
                
                // Create "Main Dashboard" with old data
                const dashboard = await this.createDashboard('Main Dashboard');
                
                const dashboardData = {
                    dashboardData: data.dashboardData || [],
                    companyOrder: data.companyOrder || [],
                    companyColors: colors,
                    lastUpdated: data.lastUpdated || new Date().toISOString()
                };
                
                this.saveDashboardData(dashboard.id, dashboardData);
                
                // Remove old data
                localStorage.removeItem('accelo_dashboard_state');
                localStorage.removeItem('company_colors');
                
                console.log('Successfully migrated old dashboard data');
                
            } catch (error) {
                console.error('Failed to migrate old data:', error);
            }
        }
    }

    /**
     * Get dashboard count
     */
    getDashboardCount() {
        return this.dashboards.length;
    }

    /**
     * Update dashboard's last accessed time
     */
    updateDashboardAccess(dashboardId) {
        const dashboard = this.dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
            dashboard.lastAccessed = new Date().toISOString();
            this.saveDashboards();
        }
    }
}

// Create global instance
window.dashboardManager = new DashboardManager(); 