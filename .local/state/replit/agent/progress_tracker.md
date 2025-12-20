[x] 1-31. (Previous migration and setup tasks completed)
[x] 32-34. (Step 5 page with map preview implemented and fixed)
[x] 35. December 20, 2025 - Added Grid Point Selection/Deselection in Step 5
   - Made all grid points clickable on the map preview
   - Added state management to track selected grid points
   - Selected points show in blue (larger radius, higher opacity)
   - Deselected points show in gray (smaller radius, lower opacity)
   - Added "Grid Points Selected" counter showing current selection (e.g., "7 / 49")
   - Added "Select All" and "Deselect All" buttons for bulk operations
   - Generate Report button is disabled until at least one point is selected
   - Shows toast notification if user tries to generate report with no points selected
   - Added on-map hint text: "Click grid points to select/deselect"
   - Selected grid point IDs are stored in sessionStorage for use in report generation
   - Workflow restarted and verified - application running successfully on port 5000
