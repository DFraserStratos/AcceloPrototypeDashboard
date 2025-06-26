/**
 * Dashboard Name Generator - Creates fun, random names for new dashboards
 * 
 * This module generates humorous but workplace-appropriate dashboard names
 * using three different formats. It can be easily enabled/disabled via the
 * feature flag.
 * 
 * USAGE:
 * - Automatically generates names when creating new dashboards
 * - Enable/disable: window.dashboardNameGenerator.enable() / .disable()
 * - Test names: window.generateFunNames(10) (on dashboards page)
 * - Manual generation: window.dashboardNameGenerator.generateName()
 * 
 * FORMATS:
 * 1. Descriptor + Reference (40%): "Mildly Chaotic Projects"
 * 2. Team + Concept (35%): "Team Coffee Station" 
 * 3. Situational (25%): "Meeting That Could've Been an Email"
 * 
 * SAFETY: All word combinations are curated to be workplace-appropriate
 * and avoid potentially problematic content.
 */

class DashboardNameGenerator {
    constructor() {
        // Feature flag - easily toggleable
        this.enabled = true;
        
        // Format 1: Casual Descriptor + Project/Office Reference
        this.descriptors = [
            "Mildly Chaotic",
            "Slightly Overdue", 
            "Perfectly Organized",
            "Surprisingly Smooth",
            "Cautiously Optimistic",
            "Delightfully Confusing",
            "Strategically Delayed",
            "Accidentally Brilliant",
            "Moderately Ambitious",
            "Refreshingly Simple",
            "Pleasantly Overwhelming",
            "Creatively Structured",
            "Diplomatically Urgent",
            "Professionally Scattered"
        ];

        this.projectReferences = [
            "Projects",
            "Tasks", 
            "Deliverables",
            "Initiatives",
            "Objectives",
            "Mission Control",
            "Operations",
            "Dashboard",
            "Hub",
            "Command Center",
            "Workspace",
            "Chronicles",
            "Adventures",
            "Endeavors"
        ];

        // Format 2: Team + Office Item/Concept
        this.teamConcepts = [
            "Coffee Station",
            "Snack Inventory", 
            "Whiteboard Wisdom",
            "Supply Closet",
            "Break Room",
            "Printer Chronicles",
            "Meeting Notes",
            "Desk Plant",
            "Lost and Found",
            "Time Machine",
            "File Cabinet",
            "Water Cooler",
            "Brainstorm Central",
            "Sticky Note Collection",
            "Calendar Chaos",
            "Email Archive"
        ];

        // Format 3: Humorous Situations (pre-built phrases)
        this.situationalNames = [
            "Meeting That Could've Been an Email",
            "Strategic Nap Planning",
            "Professional Procrastinators",
            "Last-Minute Miracle Workers",
            "Caffeine-Powered Excellence",
            "Organized Chaos Theory",
            "Work-From-Home Warriors",
            "Deadline Dodgers United",
            "Productive Procrastination",
            "Monday Morning Motivation",
            "Friday Afternoon Focus",
            "Multitasking Masterclass",
            "Controlled Mayhem",
            "Structured Spontaneity",
            "Efficient Inefficiency",
            "Planned Improvisation"
        ];

        // Format weights (percentages)
        this.formatWeights = {
            format1: 40,  // Descriptor + Project Reference
            format2: 35,  // Team + Concept
            format3: 25   // Situational
        };
    }

    /**
     * Generate a random fun dashboard name
     * @returns {string} A fun dashboard name or fallback
     */
    generateName() {
        // If disabled, return standard name
        if (!this.enabled) {
            return 'Untitled Dashboard';
        }

        try {
            const format = this.selectRandomFormat();
            
            switch (format) {
                case 'format1':
                    return this.generateFormat1Name();
                case 'format2':
                    return this.generateFormat2Name();
                case 'format3':
                    return this.generateFormat3Name();
                default:
                    return this.getFallbackName();
            }
        } catch (error) {
            console.warn('Dashboard name generation failed, using fallback:', error);
            return this.getFallbackName();
        }
    }

    /**
     * Select a random format based on weights
     * @returns {string} The selected format
     */
    selectRandomFormat() {
        const random = Math.random() * 100;
        
        if (random < this.formatWeights.format1) {
            return 'format1';
        } else if (random < this.formatWeights.format1 + this.formatWeights.format2) {
            return 'format2';
        } else {
            return 'format3';
        }
    }

    /**
     * Generate Format 1: Descriptor + Project Reference
     * @returns {string} Generated name
     */
    generateFormat1Name() {
        const descriptor = this.getRandomElement(this.descriptors);
        const reference = this.getRandomElement(this.projectReferences);
        return `${descriptor} ${reference}`;
    }

    /**
     * Generate Format 2: Team + Concept
     * @returns {string} Generated name
     */
    generateFormat2Name() {
        const concept = this.getRandomElement(this.teamConcepts);
        return `Team ${concept}`;
    }

    /**
     * Generate Format 3: Situational Name
     * @returns {string} Generated name
     */
    generateFormat3Name() {
        return this.getRandomElement(this.situationalNames);
    }

    /**
     * Get a random element from an array
     * @param {Array} array The array to select from
     * @returns {*} Random element
     */
    getRandomElement(array) {
        if (!array || array.length === 0) {
            throw new Error('Cannot select from empty array');
        }
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Get fallback name when generation fails
     * @returns {string} Fallback name
     */
    getFallbackName() {
        return 'Untitled Dashboard';
    }

    /**
     * Enable the name generator
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable the name generator
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Check if the generator is enabled
     * @returns {boolean} Whether the generator is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Generate multiple names for testing purposes
     * @param {number} count How many names to generate
     * @returns {Array<string>} Array of generated names
     */
    generateMultipleNames(count = 10) {
        const names = [];
        for (let i = 0; i < count; i++) {
            names.push(this.generateName());
        }
        return names;
    }
}

// Create global instance for browser usage
if (typeof window !== 'undefined') {
    window.dashboardNameGenerator = new DashboardNameGenerator();
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardNameGenerator;
} 