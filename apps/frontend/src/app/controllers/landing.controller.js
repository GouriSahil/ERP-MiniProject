(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('LandingController', LandingController);

    LandingController.$inject = ['$scope', '$location'];
    
    function LandingController($scope, $location) {
        var vm = this;
        
        vm.features = [
            {
                icon: 'fas fa-user-graduate',
                title: 'Student Management',
                description: 'Comprehensive student information management with profiles, enrollment tracking, and academic records.'
            },
            {
                icon: 'fas fa-chalkboard-teacher',
                title: 'Faculty Management',
                description: 'Manage faculty profiles, assignments, qualifications, and workload distribution efficiently.'
            },
            {
                icon: 'fas fa-book',
                title: 'Course Management',
                description: 'Create and manage courses with prerequisites, levels, and detailed curriculum information.'
            },
            {
                icon: 'fas fa-calendar-alt',
                title: 'Session Management',
                description: 'Schedule classes, manage sessions with conflict detection, and track attendance seamlessly.'
            },
            {
                icon: 'fas fa-chart-line',
                title: 'Reports & Analytics',
                description: 'Generate comprehensive reports on enrollment, attendance, and academic performance.'
            },
            {
                icon: 'fas fa-shield-alt',
                title: 'Role-Based Access',
                description: 'Secure access control with role-based permissions for students, faculty, and administrators.'
            }
        ];

        vm.stats = [
            {
                icon: 'fas fa-users',
                value: '1000+',
                label: 'Active Students',
                color: 'primary'
            },
            {
                icon: 'fas fa-chalkboard-teacher',
                value: '100+',
                label: 'Faculty Members',
                color: 'success'
            },
            {
                icon: 'fas fa-book',
                value: '50+',
                label: 'Courses',
                color: 'warning'
            },
            {
                icon: 'fas fa-building',
                value: '10+',
                label: 'Departments',
                color: 'danger'
            }
        ];

        vm.goToLogin = goToLogin;
        vm.goToRegister = goToRegister;
        vm.scrollToFeatures = scrollToFeatures;
        vm.scrollToContact = scrollToContact;

        function goToLogin() {
            $location.path('/login');
        }

        function goToRegister() {
            $location.path('/register');
        }

        function scrollToFeatures() {
            angular.element(document.getElementById('features')).animatescroll({scrollSpeed: 2000,easing: 'easeInOutQuad'});
        }

        function scrollToContact() {
            angular.element(document.getElementById('contact')).animatescroll({scrollSpeed: 2000,easing: 'easeInOutQuad'});
        }
    }
})();
