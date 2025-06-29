/**
 * TickerManager - Handles over budget time and value tickers
 * 
 * Manages the periodic updates of over-budget displays that show increasing
 * time and value amounts for items that have exceeded their budgets.
 */
export default class TickerManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.overBudgetTickerInterval = null;
    }
    
    /**
     * Initialize ticker manager
     * This is called during dashboard initialization
     */
    init() {
        // Start tickers - will be called from dashboard init
        this.start();
    }
    
    /**
     * Cleanup ticker resources
     * This is called during dashboard cleanup
     */
    cleanup() {
        this.stop();
    }
    
    /**
     * Start ticking timers for over budget items
     */
    start() {
        // Clear any existing ticker
        this.stop();
        
        // Update every second
        this.overBudgetTickerInterval = setInterval(() => {
            this.update();
        }, 1000);
    }
    
    /**
     * Stop over budget tickers
     */
    stop() {
        if (this.overBudgetTickerInterval) {
            clearInterval(this.overBudgetTickerInterval);
            this.overBudgetTickerInterval = null;
        }
    }
    
    /**
     * Update all over budget time displays
     */
    update() {
        // Handle time budget over budget tickers
        const overBudgetTimeElements = document.querySelectorAll('.compact-remaining-time[data-over-budget]');
        
        overBudgetTimeElements.forEach(element => {
            const baseOverBudgetHours = parseFloat(element.dataset.overBudget);
            const startTime = parseInt(element.dataset.startTime);
            const currentTime = Date.now();
            
            // Calculate additional time elapsed since the dashboard was loaded (in hours)
            const additionalHours = (currentTime - startTime) / (1000 * 60 * 60);
            const totalOverBudgetHours = baseOverBudgetHours + additionalHours;
            
            // Format hours as "XXXh XXm"
            const h = Math.floor(totalOverBudgetHours);
            const m = Math.round((totalOverBudgetHours - h) * 60);
            element.textContent = `${h}h ${m}m`;
        });
        
        // Handle value budget over budget tickers
        const overBudgetValueElements = document.querySelectorAll('.compact-remaining-value[data-over-budget-value]');
        
        overBudgetValueElements.forEach(element => {
            const baseOverBudgetValue = parseFloat(element.dataset.overBudgetValue);
            const startTime = parseInt(element.dataset.startTime);
            const currentTime = Date.now();
            
            // Calculate additional value based on elapsed time (assuming some hourly rate)
            // For now, we'll just tick up slowly as time passes
            const additionalValue = (currentTime - startTime) / (1000 * 60 * 60) * 0.01; // $0.01 per hour
            const totalOverBudgetValue = baseOverBudgetValue + additionalValue;
            
            element.textContent = `$${totalOverBudgetValue.toFixed(2)} Over Budget`;
        });
    }
}
