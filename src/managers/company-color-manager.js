/**
 * CompanyColorManager - Handles company color customization
 * Extracted from Dashboard class to improve code organization
 */
export default class CompanyColorManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    /**
     * Initialize the company color manager
     */
    init() {
        // No initialization needed - colors are applied on demand
    }

    /**
     * Cleanup resources (none needed for company colors)
     */
    cleanup() {
        // No cleanup needed for company color functionality
    }

    /**
     * Apply saved company colors for this dashboard
     */
    applySavedCompanyColors() {
        if (!this.dashboard.companyColors || Object.keys(this.dashboard.companyColors).length === 0) {
            return;
        }

        Object.entries(this.dashboard.companyColors).forEach(([companyId, colorData]) => {
            if (colorData && colorData.value && colorData.contrast) {
                this.applyCompanyColor(companyId, colorData.value, colorData.contrast);
            }
        });
    }

    /**
     * Apply company color to all elements
     */
    applyCompanyColor(companyId, colorValue, contrastColor) {
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
    }

    /**
     * Save company color for this dashboard
     */
    saveCompanyColor(companyId, colorValue, contrastColor, colorName) {
        if (!this.dashboard.companyColors) {
            this.dashboard.companyColors = {};
        }
        
        this.dashboard.companyColors[companyId] = {
            value: colorValue,
            contrast: contrastColor,
            name: colorName
        };
        
        this.dashboard.dataManager.saveDashboardState();
    }

    /**
     * Remove company color for this dashboard
     */
    removeCompanyColor(companyId) {
        if (this.dashboard.companyColors && this.dashboard.companyColors[companyId]) {
            delete this.dashboard.companyColors[companyId];
            this.dashboard.dataManager.saveDashboardState();
        }
        
        // Reset to default styling - use applyCompanyColor with null values
        this.applyCompanyColor(companyId, null, null);
    }
} 