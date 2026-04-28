We will update the `index.html` to globally handle the main authenticated layout. This maintains layout consistency across all existing and future frontend pages.

### Steps
1. **Update `MainController` in `main.controller.js`**:
   - Add a `isPublicAuthPage()` method (for `/login`, `/register`, `/forgot-password`, `reset-password`).
   - Add `isActive(path)` to help highlight the active link in the sidebar menu.
   - Adjust `isAuthPage` if needed.

2. **Update `index.html`**:
   - Introduce the global `.sidebar` HTML element which only renders if `main.isAuthenticated()`.
   - Wrap the `<div ng-view></div>` in a `<div ng-class="{'main-content': main.isAuthenticated()}">`.
   - Add a newly structured global Top Nav inside `.main-content` that displays if `main.isAuthenticated()`. This Top Nav will contain:
     - Mobile hamburger menu `ng-click="main.toggleMobileMenu()"`
     - Breadcrumb navigation (dynamic or static placeholder for now based on $location)
     - User dropdown menu (User name display, Profile link, Settings link, Logout button).
   - Add a global Footer inside `.main-content` for authenticated pages.

3. **Modify `dashboard.html`**:
   - Remove its inline `<nav class="dashboard-glass-nav">` since it will be handled globally by `index.html`.
   - Keep the dashboard content layout.

4. **Modify `profile.html`**:
   - Remove its inline `<nav class="profile-glass-nav">`.
   
5. **Update `TODO.frontend.todo`**:
   - Mark the relevant items as complete (Sidebar, Hamburger, Breadcrumbs, User dropdown, Footer).
