/**
 * CompanyColorManager - Handles company color customization
 * Extracted from Dashboard class to improve code organization
 */
export default class CompanyColorManager {
    /**
     * Creates a new CompanyColorManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    /**
     * Initialize the company color manager
     * No initialization needed - colors are applied on demand
     */
    init() {
        // No initialization needed - colors are applied on demand
    }

    /**
     * Cleanup resources 
     * No cleanup needed for company color functionality
     */
    cleanup() {
        // No cleanup needed for company color functionality
    }

    /**
     * Apply saved company colors for this dashboard
     * Iterates through all saved company colors and applies them to the UI
     */
    applySavedCompanyColors() {
        if (!this.dashboard.companyColors || Object.keys(this.dashboard.companyColors).length === 0) {
            return;
        }

        Object.entries(this.dashboard.companyColors).forEach(([companyId, colorData]) => {
            if (colorData && colorData.value && colorData.contrast) {
                try {
                    this.applyCompanyColor(companyId, colorData.value, colorData.contrast);
                } catch (error) {
                    console.warn(`Failed to apply color for company ${companyId}:`, error);
                }
            }
        });
    }

    /**
     * Apply company color to all elements for a specific company
     * @param {string|number} companyId - The company ID to apply colors to
     * @param {string} colorValue - The hex color value (e.g., "#ff0000")
     * @param {string} contrastColor - The contrasting color for text readability
     */
    applyCompanyColor(companyId, colorValue, contrastColor) {
        try {
            // Apply to company block styling
            const companyElement = document.querySelector(`[data-company-id="${companyId}"]`);
            if (companyElement) {
                if (colorValue) {
                    // Apply a subtle colored border to the company block
                    companyElement.style.borderColor = colorValue;
                    companyElement.style.background = `linear-gradient(135deg, ${colorValue} 0%, ${colorValue}dd 100%)`;
                } else {
                    // Reset to default styling
                    companyElement.style.borderColor = '';
                    companyElement.style.background = '';
                }
            }

            // Apply to progress blocks for this company
            const progressBlocks = document.querySelectorAll('.compact-progress-block');
            progressBlocks.forEach(block => {
                // Check if this block belongs to the company
                const blockCompanyId = block.dataset.companyId;
                if (blockCompanyId == companyId) {
                    if (colorValue) {
                        // Apply company color to the left border bar via CSS custom property
                        block.style.setProperty('--border-color', colorValue);
                    } else {
                        // Reset to default
                        block.style.removeProperty('--border-color');
                    }
                }
            });
        } catch (error) {
            console.error(`Error applying company color for company ${companyId}:`, error);
        }
    }

    /**
     * Save company color for this dashboard
     * @param {string|number} companyId - The company ID
     * @param {string} colorValue - The hex color value
     * @param {string} contrastColor - The contrasting color for text
     * @param {string} colorName - Human-readable color name
     */
    saveCompanyColor(companyId, colorValue, contrastColor, colorName) {
        try {
            if (!this.dashboard.companyColors) {
                this.dashboard.companyColors = {};
            }
            
            this.dashboard.companyColors[companyId] = {
                value: colorValue,
                contrast: contrastColor,
                name: colorName
            };
            
            this.dashboard.dataManager.saveDashboardState();
        } catch (error) {
            console.error(`Error saving company color for company ${companyId}:`, error);
            throw error; // Re-throw to allow caller to handle
        }
    }

    /**
     * Remove company color for this dashboard
     * @param {string|number} companyId - The company ID to remove color from
     */
    removeCompanyColor(companyId) {
        try {
            if (this.dashboard.companyColors && this.dashboard.companyColors[companyId]) {
                delete this.dashboard.companyColors[companyId];
                this.dashboard.dataManager.saveDashboardState();
            }
            
            // Reset to default styling - use applyCompanyColor with null values
            this.applyCompanyColor(companyId, null, null);
        } catch (error) {
            console.error(`Error removing company color for company ${companyId}:`, error);
            throw error; // Re-throw to allow caller to handle
        }
    }
} 