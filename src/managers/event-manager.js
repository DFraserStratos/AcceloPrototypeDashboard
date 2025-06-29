/**
 * EventManager handles basic event listeners for modals and keyboard shortcuts
 * Drag and drop events are handled separately in DragDropManager
 */
export default class EventManager {
    /**
     * Creates a new EventManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.eventHandlers = new Map();
    }
    
    /**
     * Initialize event listeners
     * Sets up all basic event handlers for modal interactions and keyboard shortcuts
     */
    init() {
        this.setupBasicEventListeners();
    }
    
    /**
     * Clean up event listeners
     * Removes all event handlers and clears the handlers map
     */
    cleanup() {
        this.cleanupBasicEventListeners();
    }
    
    /**
     * Set up basic event listeners (modal clicks, keyboard shortcuts)
     * Configures event handlers for modal backdrop clicks and keyboard navigation
     * All handlers are stored in a Map for proper cleanup
     */
    setupBasicEventListeners() {
        // Create event handlers with references to dashboard
        const modalClickHandler = (e) => {
            if (e.target.id === 'addItemModal') {
                this.dashboard.hideAddItemModal();
            }
            if (e.target.id === 'dashboardRenameModal') {
                this.dashboard.cancelDashboardRename();
            }
        };
        
        const escapeKeyHandler = (e) => {
            if (e.key === 'Escape') {
                const renameModal = document.getElementById('dashboardRenameModal');
                if (renameModal && renameModal.classList.contains('show')) {
                    this.dashboard.cancelDashboardRename();
                } else {
                    this.dashboard.hideAddItemModal();
                }
            }
        };
        
        const enterKeyHandler = (e) => {
            if (e.key === 'Enter') {
                const renameModal = document.getElementById('dashboardRenameModal');
                if (renameModal && renameModal.classList.contains('show')) {
                    this.dashboard.saveDashboardRename();
                }
            }
        };
        
        // Store handlers for cleanup
        this.eventHandlers.set('modalClick', modalClickHandler);
        this.eventHandlers.set('escapeKey', escapeKeyHandler);
        this.eventHandlers.set('enterKey', enterKeyHandler);
        
        // Add event listeners
        
        // Modal backdrop clicks
        const addItemModal = document.getElementById('addItemModal');
        if (addItemModal) {
            addItemModal.addEventListener('click', modalClickHandler);
        }
        
        const renameModal = document.getElementById('dashboardRenameModal');
        if (renameModal) {
            renameModal.addEventListener('click', modalClickHandler);
        }
        
        // Keyboard events
        document.addEventListener('keydown', escapeKeyHandler);
        document.addEventListener('keydown', enterKeyHandler);
    }
    
    /**
     * Clean up basic event listeners
     * Removes all event listeners and clears the handlers map to prevent memory leaks
     */
    cleanupBasicEventListeners() {
        const modalClickHandler = this.eventHandlers.get('modalClick');
        const escapeKeyHandler = this.eventHandlers.get('escapeKey');
        const enterKeyHandler = this.eventHandlers.get('enterKey');
        
        if (modalClickHandler) {
            const addItemModal = document.getElementById('addItemModal');
            if (addItemModal) {
                addItemModal.removeEventListener('click', modalClickHandler);
            }
            
            const renameModal = document.getElementById('dashboardRenameModal');
            if (renameModal) {
                renameModal.removeEventListener('click', modalClickHandler);
            }
        }
        
        if (escapeKeyHandler) {
            document.removeEventListener('keydown', escapeKeyHandler);
        }
        
        if (enterKeyHandler) {
            document.removeEventListener('keydown', enterKeyHandler);
        }
        
        // Clear handlers map
        this.eventHandlers.clear();
    }
} 