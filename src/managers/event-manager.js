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
        // Setup click vs drag detection for progress blocks
        this.setupProgressBlockClickHandling();
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
                } else if (this.dashboard.expandedViewManager?.currentExpandedId) {
                    // Close expanded drawer
                    this.dashboard.expandedViewManager.collapseDrawer();
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
        
        // Clean up progress block click handling
        this.cleanupProgressBlockClickHandling();
    }
    
    /**
     * Setup click vs drag detection for progress blocks
     */
    setupProgressBlockClickHandling() {
        let mouseDownTime = 0;
        let mouseDownX = 0;
        let mouseDownY = 0;
        let isDragging = false;
        let clickTarget = null;
        
        // Create handlers
        const mouseDownHandler = (e) => {
            const progressBlock = e.target.closest('.compact-progress-block');
            if (progressBlock && !e.target.closest('.compact-remove-btn') && !e.target.closest('.expanded-drawer')) {
                mouseDownTime = Date.now();
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
                isDragging = false;
                clickTarget = progressBlock;
            }
        };
        
        const mouseMoveHandler = (e) => {
            if (clickTarget && !isDragging) {
                const moveDistance = Math.sqrt(
                    Math.pow(e.clientX - mouseDownX, 2) + 
                    Math.pow(e.clientY - mouseDownY, 2)
                );
                
                if (moveDistance > 5) { // 5px threshold
                    isDragging = true;
                    clickTarget = null;
                }
            }
        };
        
        const mouseUpHandler = (e) => {
            if (clickTarget && !isDragging) {
                const clickDuration = Date.now() - mouseDownTime;
                const progressBlock = e.target.closest('.compact-progress-block');
                
                if (progressBlock === clickTarget && clickDuration < 200 && !e.target.closest('.expanded-drawer')) {
                    // This is a click, not a drag
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const itemId = progressBlock.dataset.itemId;
                    const item = this.dashboard.dashboardData.find(d => 
                        String(d.id) === String(itemId)
                    );
                    
                    if (item && this.dashboard.expandedViewManager) {
                        this.dashboard.expandedViewManager.handleProgressBlockClick(progressBlock, item);
                    }
                }
            }
            
            clickTarget = null;
            isDragging = false;
        };
        
        // Store handlers
        this.eventHandlers.set('progressMouseDown', mouseDownHandler);
        this.eventHandlers.set('progressMouseMove', mouseMoveHandler);
        this.eventHandlers.set('progressMouseUp', mouseUpHandler);
        
        // Add listeners
        document.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }
    
    /**
     * Clean up progress block click handling
     */
    cleanupProgressBlockClickHandling() {
        const mouseDownHandler = this.eventHandlers.get('progressMouseDown');
        const mouseMoveHandler = this.eventHandlers.get('progressMouseMove');
        const mouseUpHandler = this.eventHandlers.get('progressMouseUp');
        
        if (mouseDownHandler) {
            document.removeEventListener('mousedown', mouseDownHandler);
        }
        if (mouseMoveHandler) {
            document.removeEventListener('mousemove', mouseMoveHandler);
        }
        if (mouseUpHandler) {
            document.removeEventListener('mouseup', mouseUpHandler);
        }
    }
} 