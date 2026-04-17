(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('NavigationController', NavigationController);

    NavigationController.$inject = ['$location'];

    function NavigationController($location) {
        var vm = this;

        var sectionMeta = {
            '/departments': { title: 'Departments', icon: 'fas fa-building' },
            '/courses': { title: 'Courses', icon: 'fas fa-book' },
            '/terms': { title: 'Terms', icon: 'fas fa-calendar-alt' },
            '/course-offerings': { title: 'Course Offerings', icon: 'fas fa-layer-group' },
            '/sessions': { title: 'Sessions', icon: 'fas fa-calendar-check' },
            '/students': { title: 'Students', icon: 'fas fa-user-graduate' },
            '/faculty': { title: 'Faculty', icon: 'fas fa-chalkboard-teacher' },
            '/enrollments': { title: 'Enrollments', icon: 'fas fa-clipboard-check' },
            '/attendance': { title: 'Attendance', icon: 'fas fa-user-check' },
            '/reports': { title: 'Reports', icon: 'fas fa-chart-bar' },
            '/audit-logs': { title: 'Audit Logs', icon: 'fas fa-history' },
            '/settings': { title: 'Settings', icon: 'fas fa-cog' }
        };

        vm.section = getCurrentSection();

        function getCurrentSection() {
            var path = $location.path();
            var section = sectionMeta[path];

            if (section) {
                return section;
            }

            return {
                title: 'Module',
                icon: 'fas fa-puzzle-piece'
            };
        }
    }
})();
