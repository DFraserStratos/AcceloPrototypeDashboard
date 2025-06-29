/**
 * ArrowManager - Handles empty state arrow functionality
 */
export default class ArrowManager {
    /**
     * Creates a new ArrowManager instance
     * @param {Dashboard} dashboard - Reference to the main Dashboard instance
     */
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.arrowResizeHandler = null;
        this.arrowObserver = null;
        this.arrowResizeTimeout = null;
    }

    /**
     * Initialize arrow functionality - called when manager is set up
     * Arrow is initialized on-demand when empty state is shown
     */
    init() {
        // Arrow is initialized on-demand when empty state is shown
        // No setup needed here
    }

    /**
     * Clean up arrow resources
     * Removes event listeners and observers to prevent memory leaks
     */
    cleanup() {
        this.cleanupArrowElements();
    }

    /**
     * Initialize the enhanced empty state arrow functionality
     */
    initializeEmptyStateArrow() {
        this.updateArrowPosition();
        
        // Add resize listener to recalculate arrow position
        this.arrowResizeHandler = () => {
            // Debounce the resize handler
            clearTimeout(this.arrowResizeTimeout);
            this.arrowResizeTimeout = setTimeout(() => {
                this.updateArrowPosition();
            }, 150);
        };
        
        window.addEventListener('resize', this.arrowResizeHandler);
        
        // Also update when navbar context changes (when dashboard name changes)
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                this.updateArrowPosition();
            }, 50);
        });
        
        const navbarContext = document.getElementById('navbarDashboardContext');
        if (navbarContext) {
            observer.observe(navbarContext, { childList: true, subtree: true, attributes: true });
        }
        
        // Store observer for cleanup
        this.arrowObserver = observer;
    }

    /**
     * Update the arrow position dynamically
     * Calculates optimal arrow positioning based on button location relative to content
     * Handles both left-side and top-side arrow orientations automatically
     */
    updateArrowPosition() {
        const emptyStateContent = document.querySelector('.enhanced-empty-state .empty-state-content');
        const addItemsButton = document.querySelector('button[onclick*="showAddItemModal"]');
        const arrowBody = document.getElementById('arrowBody');
        const arrowHead = document.getElementById('arrowHead');
        
        if (!emptyStateContent || !addItemsButton || !arrowBody || !arrowHead) {
            return;
        }
        
        try {
            const contentRect = emptyStateContent.getBoundingClientRect();
            const buttonRect = addItemsButton.getBoundingClientRect();
            
            // Determine arrow start position based on button position relative to content box
            let startX, startY, startFromTop;
            
            // If button is to the left of the content box's left edge, start from left side
            if (buttonRect.left + buttonRect.width / 2 < contentRect.left) {
                // Arrow starts from left side of content box
                startX = contentRect.left - 15;
                startY = contentRect.top + contentRect.height / 2;
                startFromTop = false;
            } else {
                // Arrow starts from top of content box
                startX = contentRect.left + contentRect.width / 2;
                startY = contentRect.top - 15;
                startFromTop = true;
            }
            
            // End point: BELOW the nav bar, pointing UP to the button
            const endX = buttonRect.left + buttonRect.width / 2;
            const endY = 48 + 15; // 48px navbar height + 15px padding below nav
            
            // Create curved tapered arrow body
            const bodyPath = this.createCurvedTaperedArrowPath(startX, startY, endX, endY, startFromTop);
            arrowBody.setAttribute('d', bodyPath);
            
            // Create arrow head pointing toward the button
            const headPath = this.createArrowHeadPointingToButton(startX, startY, endX, endY);
            arrowHead.setAttribute('d', headPath);
            
            console.log('🎯 ARROW DEBUG (Adaptive Positioning):', { 
                '1_ButtonCenter': buttonRect.left + buttonRect.width / 2,
                '2_ContentLeft': contentRect.left,
                '3_StartFromTop': startFromTop,
                '4_StartPoint': { startX, startY }, 
                '5_EndPoint': { endX, endY },
                '6_Decision': startFromTop ? 'Button right of content - start from top' : 'Button left of content - start from left'
            });
            
        } catch (error) {
            console.warn('Error updating arrow position:', error);
        }
    }

    /**
     * Create a curved tapered arrow path that starts thin and gets thicker toward the head
     * @param {number} startX - Starting X coordinate
     * @param {number} startY - Starting Y coordinate  
     * @param {number} endX - Ending X coordinate
     * @param {number} endY - Ending Y coordinate
     * @param {boolean} startFromTop - Whether arrow starts from top (true) or left (false)
     * @returns {string} SVG path data string for the tapered arrow body
     */
    createCurvedTaperedArrowPath(startX, startY, endX, endY, startFromTop) {
        const startWidth = 2;  // Start thin at content area
        const endWidth = 12;   // End thick where arrowhead begins
        
        // Create control points for curved path
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Create curve based on starting position
        let controlX, controlY;
        if (startFromTop) {
            // Starting from top of content box - curve sideways then up
            controlX = startX + deltaX * 0.5;
            controlY = startY + deltaY * 0.3;
        } else {
            // Starting from left side of content box - curve inward then up
            controlX = startX + deltaX * 0.7; // Pull control point to the RIGHT (toward content)
            controlY = startY + deltaY * 0.2 - 100; // Arc upward but inward
        }
        
        // Calculate points along the curved path for tapered effect
        const steps = 20;
        const points = [];
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            // Quadratic bezier curve: P = (1-t)²P0 + 2(1-t)tP1 + t²P2
            // FORCE the last point to be exactly at target coordinates to eliminate gap
            let pathX, pathY;
            if (i === steps) {
                // Force last point to exact target coordinates
                pathX = endX;
                pathY = endY;
            } else {
                // Normal bezier calculation for all other points
                pathX = Math.pow(1-t, 2) * startX + 2 * (1-t) * t * controlX + Math.pow(t, 2) * endX;
                pathY = Math.pow(1-t, 2) * startY + 2 * (1-t) * t * controlY + Math.pow(t, 2) * endY;
            }
            
            // Calculate width at this point (taper from thin to thick)
            const width = startWidth + (endWidth - startWidth) * t;
            
            // Calculate tangent for perpendicular
            const tangentX = 2 * (1-t) * (controlX - startX) + 2 * t * (endX - controlX);
            const tangentY = 2 * (1-t) * (controlY - startY) + 2 * t * (endY - controlY);
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
            
            if (tangentLength > 0) {
                const perpX = -tangentY / tangentLength;
                const perpY = tangentX / tangentLength;
                
                points.push({
                    leftX: pathX + perpX * width / 2,
                    leftY: pathY + perpY * width / 2,
                    rightX: pathX - perpX * width / 2,
                    rightY: pathY - perpY * width / 2
                });
            }
        }
        
        // Build the path - go along left side, then back along right side
        let pathData = `M ${points[0].leftX} ${points[0].leftY}`;
        
        // Left side - go ALL the way to the end (thick end)
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].leftX} ${points[i].leftY}`;
        }
        
        // Connect to right side at the thick end
        const endPoint = points[points.length - 1];
        pathData += ` L ${endPoint.rightX} ${endPoint.rightY}`;
        
        // Right side (in reverse) - go all the way back
        for (let i = points.length - 2; i >= 0; i--) {
            pathData += ` L ${points[i].rightX} ${points[i].rightY}`;
        }
        
        pathData += ' Z';
        return pathData;
    }

    /**
     * Create arrow head pointing toward the button (from content to button)
     * @param {number} startX - Starting X coordinate
     * @param {number} startY - Starting Y coordinate  
     * @param {number} endX - Ending X coordinate
     * @param {number} endY - Ending Y coordinate
     * @returns {string} SVG path data string for the arrow head
     */
    createArrowHeadPointingToButton(startX, startY, endX, endY) {
        const bodyEndWidth = 12; // Match the thick end of the body
        const headWidth = 30;    // Less wide for better proportions
        const headLength = 12;   // Shorter for more padding from nav
        
        // The body ends at endX, endY with a thick edge
        // The arrowhead extends toward the button but with padding from nav
        const actualTipX = endX;
        const actualTipY = endY - headLength; // Tip position with more padding from nav
        
        // Calculate the thick base of the arrowhead - much wider than body for seamless connection
        // The wide base will completely cover and overlap the body end
        const baseLeftX = endX - headWidth / 2;
        const baseRightX = endX + headWidth / 2;
        const baseY = endY + 2; // Slightly overlap into the body to ensure connection
        
        // Create arrowhead that starts from the thick base and points to the tip
        return `M ${actualTipX} ${actualTipY} 
                L ${baseLeftX} ${baseY} 
                L ${baseRightX} ${baseY} 
                Z`;
    }

    /**
     * Clean up arrow elements and event handlers
     * Removes resize handlers, observers, and timeouts to prevent memory leaks
     */
    cleanupArrowElements() {
        if (this.arrowResizeHandler) {
            window.removeEventListener('resize', this.arrowResizeHandler);
            this.arrowResizeHandler = null;
        }
        
        if (this.arrowObserver) {
            this.arrowObserver.disconnect();
            this.arrowObserver = null;
        }
        
        if (this.arrowResizeTimeout) {
            clearTimeout(this.arrowResizeTimeout);
            this.arrowResizeTimeout = null;
        }
    }
} 