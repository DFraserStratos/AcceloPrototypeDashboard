# Expanded View Feature Documentation

## Overview
The expanded view feature allows users to click on any progress block to see detailed task and milestone information for projects. When clicked, a drawer smoothly expands below the progress block showing all tasks and milestones with their progress bars and time tracking.

## Features

### Click to Expand
- **Single Click**: Click anywhere on a progress block (except the remove button or title link) to expand it
- **Smart Click Detection**: The system distinguishes between clicks and drag operations
  - Click threshold: 200ms (shorter interactions are clicks)
  - Movement threshold: 5 pixels (less movement means it's a click)

### Drawer Behavior
- **Smooth Animation**: The drawer slides down smoothly from the bottom of the progress block
- **Status-Based Coloring**: The drawer inherits the status color of the parent progress block:
  - Green background for on-track projects
  - Yellow background for projects approaching limit (75%+)
  - Red background for over-budget projects
- **One at a Time**: Only one drawer can be open at a time
- **Click Outside to Close**: Click anywhere outside the expanded block to close the drawer
- **Click Same Block to Toggle**: Click the same block again to close its drawer

### Content Display
- **Tasks and Milestones**: Shows all tasks and milestones within a project
- **Hierarchical Display**: 
  - Top-level tasks appear first
  - Milestones appear with their sub-tasks indented below them
- **Progress Information**: Each item shows:
  - Icon (checkbox for tasks, flag for milestones)
  - Title
  - Hours worked vs project budget
  - Progress percentage with color coding
  - Progress bar
  - Remaining/over budget hours

### Performance Features
- **Persistent Caching**: Expanded view data is cached in localStorage and persists across page reloads
  - Cache expires after 24 hours to ensure data freshness
  - Cached data is loaded immediately on dashboard initialization
  - Fresh data overwrites cache when fetched
- **Background Preloading**: After the dashboard loads, the system automatically preloads task and milestone data for all projects in the background
- **Loading Indicator**: The dashboard icon in the navbar shows a spinner while preloading data
- **Instant Display**: Cached data is shown immediately when expanding blocks (no loading delay)
- **Smart Refresh**: When dashboard data is refreshed, expanded view cache is cleared to ensure consistency

### Edge Cases Handled
- **No Data**: Shows "No tasks or milestones to display" for empty projects
- **Loading Errors**: Shows error message if data fails to load
- **Agreements**: Currently shows empty state (tasks/milestones are project-specific)
- **Stale Cache**: Data older than 24 hours is automatically discarded and re-fetched
- **Tab Switching**: Company block heights automatically recalculate when returning to the tab to maintain proper layout
- **State Validation**: Expanded state is automatically validated and orphaned elements are cleaned up

## Technical Implementation

### Key Components

1. **ExpandedViewManager** (`/src/managers/expanded-view-manager.js`)
   - Handles all expanded view logic
   - Manages drawer state and animations
   - Fetches and caches project details (both in-memory and persistent)
   - Controls background preloading
   - Loads cached data from localStorage on initialization
   - Monitors tab visibility changes to maintain proper layout
   - Validates expanded state consistency and cleans up orphaned elements

2. **DataManager** (`/src/managers/data-manager.js`)
   - Extended to handle expanded view data persistence
   - Provides methods for loading and saving expanded view cache
   - Integrates expanded view data with dashboard state storage
   - Manages cache expiration and cleanup

3. **RenderManager** (`/src/managers/render-manager.js`)
   - Modified to add click event listeners to progress blocks
   - Distinguishes between clicks and drags using time/distance thresholds

4. **CSS Styling** (`/styles/dashboard.css`)
   - Defines drawer animations and transitions
   - Status-based color themes
   - Responsive layout adjustments

### Caching Strategy
- **Dual-Layer Cache**: 
  - In-memory Map for immediate access during session
  - localStorage for persistence across page reloads
- **Per-Dashboard Storage**: Each dashboard maintains its own expanded view cache
- **Automatic Expiration**: Cached data older than 24 hours is discarded
- **Refresh Integration**: Cache is cleared when dashboard data is refreshed

### API Integration
- Uses `getProjectTasksAndMilestones()` method to fetch detailed project data
- Retrieves time tracking information for each task and milestone
- Handles API errors gracefully with user-friendly messages
- Data is cached immediately after successful API calls

## Usage Instructions

### For End Users
1. **Click any project block** to see its tasks and milestones
2. **Instant display** from cache (if available) or quick loading for new data
3. **Review progress** for each task and milestone
4. **Click outside or on the same block** to close the drawer
5. **Data persists** across page reloads for faster subsequent access

### For Developers
1. The feature is automatically initialized when the dashboard loads
2. Cached data is loaded from localStorage during initialization
3. Background preloading starts 1 second after dashboard load (reduced from 3 seconds due to caching)
4. To disable preloading, comment out the `preloadAllProjectDetails()` call in `ExpandedViewManager.init()`
5. To adjust cache expiration, modify the hours check in `loadCachedData()` method
6. To clear all expanded view cache, call `dataManager.clearExpandedViewData()`

## Future Enhancements
- Add task/milestone details for agreements (if applicable)
- Include assignee information for tasks
- Add quick actions (mark complete, edit, etc.)
- Export expanded view data
- Show task dependencies and relationships
- Implement selective cache refresh instead of full clear on dashboard refresh

## Troubleshooting

### Drawer Won't Open
- Check browser console for errors
- Ensure API credentials are valid
- Verify project has proper permissions
- Check if localStorage is accessible

### Slow Loading
- Check API rate limits
- Consider reducing preload frequency
- Check network connection
- Verify cache is working (should see console logs about cached data)

### Data Not Updating
- Refresh the dashboard to clear cache and get latest data
- Check if API is returning updated information
- Cache automatically expires after 24 hours
- Console will show when cached vs fresh data is used

### Cache Issues
- Check browser's localStorage quota and usage
- Clear dashboard cache via developer tools if needed
- Console logs will indicate cache hits and misses
- Verify dashboard ID is properly set for cache storage

### Layout Issues
- If company blocks don't match height after tab switching, the system automatically detects and corrects this
- Company block heights recalculate when returning to the dashboard tab
- If layout still appears incorrect, try collapsing and re-expanding the drawer

### State Validation Issues
- System automatically validates expanded state to prevent multiple drawers
- If orphaned expanded elements are detected, they are automatically cleaned up
- After tab switching, may need to manually close/reopen drawer if state gets out of sync
- Console logs will show when state validation and cleanup occurs
