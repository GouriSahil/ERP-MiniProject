(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('MainController', MainController);

    MainController.$inject = ['$scope', '$location', '$cookies', 'AuthService', '$rootScope'];

    function MainController($scope, $location, $cookies, AuthService, $rootScope) {
        var vm = this;

        // Expose $location to scope for debugging
        $scope.$location = $location;

        // Mobile menu and dropdown states
        vm.mobileMenuOpen = false;
        vm.userDropdownOpen = false;

        vm.logout = logout;
        vm.isAuthenticated = isAuthenticated;
        vm.getCurrentUser = getCurrentUser;
        vm.isAuthPage = isAuthPage;
        vm.isPublicAuthPage = isPublicAuthPage;
        vm.isActive = isActive;
        vm.toggleMobileMenu = toggleMobileMenu;
        vm.toggleUserDropdown = toggleUserDropdown;
        vm.closeDropdowns = closeDropdowns;
        vm.getCurrentPageName = getCurrentPageName;

        // Close dropdowns when clicking outside
        angular.element(document).on('click', function(event) {
            var target = angular.element(event.target);
            if (!target.closest('.user-dropdown-container').length &&
                !target.closest('.mobile-menu-container').length) {
                $scope.$apply(function() {
                    vm.userDropdownOpen = false;
                    if (vm.mobileMenuOpen) {
                        vm.mobileMenuOpen = false;
                    }
                });
            }
        });

        function toggleMobileMenu() {
            vm.mobileMenuOpen = !vm.mobileMenuOpen;
            vm.userDropdownOpen = false;
        }

        function toggleUserDropdown() {
            vm.userDropdownOpen = !vm.userDropdownOpen;
            vm.mobileMenuOpen = false;
        }

        function closeDropdowns() {
            vm.mobileMenuOpen = false;
            vm.userDropdownOpen = false;
        }

        function logout() {
            AuthService.logout()
                .then(function() {
                    Swal.fire({
                        icon: 'success',
                        title: 'Logged Out',
                        text: 'You have been logged out successfully',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(function() {
                        $location.path('/');
                        $scope.$apply();
                    });
                })
                .catch(function(error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to logout. Please try again.'
                    });
                });
        }

        function isAuthenticated() {
            return AuthService.isAuthenticated();
        }

        function getCurrentUser() {
            return AuthService.getCurrentUser();
        }

        function isAuthPage() {
            var path = $location.path() || '/';
            return path !== '/';
        }

        function isPublicAuthPage() {
            var path = $location.path() || '';
            var publicAuthPages = ['/login', '/register', '/forgot-password'];
            return publicAuthPages.indexOf(path) !== -1 || path.indexOf('/reset-password') === 0;
        }

        function isActive(pathArg) {
            var path = $location.path() || '';
            return path.indexOf(pathArg) === 0;
        }

        function getCurrentPageName() {
            var path = $location.path() || '';
            var parts = path.split('/');
            return parts[1] ? parts[1].replace(/-/g, ' ') : 'Dashboard';
        }
    }
})();
