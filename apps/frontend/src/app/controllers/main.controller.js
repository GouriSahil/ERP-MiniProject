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
        
        vm.logout = logout;
        vm.isAuthenticated = isAuthenticated;
        vm.getCurrentUser = getCurrentUser;
        vm.isAuthPage = isAuthPage;

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
            var authPages = ['/login', '/register'];
            return authPages.indexOf($location.path()) !== -1;
        }
    }
})();
