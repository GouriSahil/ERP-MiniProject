(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['$scope', '$location', '$cookies', 'AuthService', '$timeout'];

    function DashboardController($scope, $location, $cookies, AuthService, $timeout) {
        var vm = this;
        
        vm.currentUser = null;
        vm.isLoading = true;
        vm.dashboardStats = [];
        vm.recentActivities = [];
        
        init();

        function init() {
            // Get current user
            vm.currentUser = AuthService.getCurrentUser();
            
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }
            
            // Load dashboard data based on role
            loadDashboardData();
        }

        function loadDashboardData() {
            // Simulate loading - in real app, fetch from API
            $timeout(function() {
                vm.isLoading = false;

                // Set dashboard stats based on user role
                switch(vm.currentUser.role) {
                    case 'admin':
                        vm.dashboardStats = [
                            { icon: 'fas fa-users', value: '1,234', label: 'Total Students', color: 'primary' },
                            { icon: 'fas fa-chalkboard-teacher', value: '89', label: 'Total Faculty', color: 'success' },
                            { icon: 'fas fa-book', value: '56', label: 'Active Courses', color: 'warning' },
                            { icon: 'fas fa-building', value: '12', label: 'Departments', color: 'danger' }
                        ];
                        break;
                    case 'faculty':
                        vm.dashboardStats = [
                            { icon: 'fas fa-users', value: '156', label: 'My Students', color: 'primary' },
                            { icon: 'fas fa-book', value: '4', label: 'My Courses', color: 'success' },
                            { icon: 'fas fa-calendar-check', value: '12', label: 'Sessions This Week', color: 'warning' },
                            { icon: 'fas fa-clock', value: '24', label: 'Hours/Week', color: 'danger' }
                        ];
                        break;
                    case 'student':
                        vm.dashboardStats = [
                            { icon: 'fas fa-book', value: '5', label: 'Enrolled Courses', color: 'primary' },
                            { icon: 'fas fa-check-circle', value: '85%', label: 'Attendance Rate', color: 'success' },
                            { icon: 'fas fa-tasks', value: '12', label: 'Pending Assignments', color: 'warning' },
                            { icon: 'fas fa-star', value: '3.8', label: 'GPA', color: 'danger' }
                        ];
                        break;
                    default:
                        vm.dashboardStats = [
                            { icon: 'fas fa-info-circle', value: 'N/A', label: 'No Data Available', color: 'primary' }
                        ];
                }

                vm.recentActivities = [
                    { icon: 'fas fa-sign-in-alt', text: 'Logged in to the system', time: 'Just now', color: 'text-success' },
                    { icon: 'fas fa-user-edit', text: 'Profile updated', time: '2 hours ago', color: 'text-info' },
                    { icon: 'fas fa-book-open', text: 'Course materials accessed', time: '1 day ago', color: 'text-warning' }
                ];
            }, 500);
        }

        vm.getGreeting = function() {
            var hour = new Date().getHours();
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            return 'Good Evening';
        };

        vm.hasPermission = function(permission) {
            // Check if user has specific permission
            // This would be expanded in a real application
            return vm.currentUser && vm.currentUser.role === 'admin';
        };

        vm.navigateTo = function(path) {
            $location.path(path);
        };

        vm.logout = function() {
            AuthService.logout().then(function() {
                $location.path('/login');
            }).catch(function() {
                $location.path('/login');
            });
        };
    }
})();
