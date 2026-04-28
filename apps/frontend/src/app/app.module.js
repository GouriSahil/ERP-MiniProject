(function () {
    'use strict';

    angular
        .module('erpApp', ['ngRoute', 'ngCookies'])
        .config(config)
        .run(run);

    config.$inject = ['$routeProvider', '$locationProvider', '$httpProvider'];

    function config($routeProvider, $locationProvider, $httpProvider) {
        // Enable HTML5 mode (requires server configuration)
        $locationProvider.hashPrefix('!');

        // HTTP interceptor for auth
        $httpProvider.interceptors.push(function ($q, $location, $cookies) {
            return {
                'request': function (config) {
                    var token = $cookies.get('erp_token');
                    if (token) {
                        config.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return config;
                },
                'responseError': function (response) {
                    if (response.status === 401) {
                        $cookies.remove('erp_token');
                        $cookies.remove('erp_user');
                        $cookies.remove('erp_refresh_token');
                        $location.path('/login');
                    }
                    return $q.reject(response);
                }
            };
        });

        // Routes
        $routeProvider
            .when('/', {
                templateUrl: 'src/app/views/landing/landing.html',
                controller: 'LandingController',
                controllerAs: 'landing'
            })
            .when('/login', {
                templateUrl: 'src/app/views/auth/login.html',
                controller: 'AuthController',
                controllerAs: 'auth'
            })
            .when('/register', {
                templateUrl: 'src/app/views/auth/register.html',
                controller: 'AuthController',
                controllerAs: 'auth'
            })
            .when('/forgot-password', {
                templateUrl: 'src/app/views/auth/forgot-password.html',
                controller: 'AuthController',
                controllerAs: 'auth'
            })
            .when('/reset-password/:token', {
                templateUrl: 'src/app/views/auth/reset-password.html',
                controller: 'AuthController',
                controllerAs: 'auth'
            })
            .when('/dashboard', {
                templateUrl: 'src/app/views/dashboard/dashboard.html',
                controller: 'DashboardController',
                controllerAs: 'dashboard',
                authenticate: true
            })
            .when('/profile', {
                templateUrl: 'src/app/views/dashboard/profile.html',
                controller: 'DashboardController',
                controllerAs: 'dashboard',
                authenticate: true
            })
            .when('/departments', {
                templateUrl: 'src/app/views/departments/list.html',
                controller: 'DepartmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/departments/create', {
                templateUrl: 'src/app/views/departments/form.html',
                controller: 'DepartmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/departments/:id', {
                templateUrl: 'src/app/views/departments/detail.html',
                controller: 'DepartmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/departments/:id/edit', {
                templateUrl: 'src/app/views/departments/form.html',
                controller: 'DepartmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/courses', {
                templateUrl: 'src/app/views/courses/list.html',
                controller: 'CourseController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/courses/create', {
                templateUrl: 'src/app/views/courses/form.html',
                controller: 'CourseController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/courses/:id', {
                templateUrl: 'src/app/views/courses/detail.html',
                controller: 'CourseController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/courses/:id/edit', {
                templateUrl: 'src/app/views/courses/form.html',
                controller: 'CourseController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/terms', {
                templateUrl: 'src/app/views/terms/list.html',
                controller: 'TermController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/terms/create', {
                templateUrl: 'src/app/views/terms/form.html',
                controller: 'TermController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/terms/:id/edit', {
                templateUrl: 'src/app/views/terms/form.html',
                controller: 'TermController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/course-offerings', {
                templateUrl: 'src/app/views/offerings/list.html',
                controller: 'OfferingController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/course-offerings/create', {
                templateUrl: 'src/app/views/offerings/form.html',
                controller: 'OfferingController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/course-offerings/:id/edit', {
                templateUrl: 'src/app/views/offerings/form.html',
                controller: 'OfferingController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/sessions', {
                templateUrl: 'src/app/views/sessions/list.html',
                controller: 'SessionController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/sessions/create', {
                templateUrl: 'src/app/views/sessions/form.html',
                controller: 'SessionController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/sessions/:id/edit', {
                templateUrl: 'src/app/views/sessions/form.html',
                controller: 'SessionController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/students', {
                templateUrl: 'src/app/views/students/list.html',
                controller: 'StudentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/students/create', {
                templateUrl: 'src/app/views/students/form.html',
                controller: 'StudentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/students/:id', {
                templateUrl: 'src/app/views/students/detail.html',
                controller: 'StudentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/students/:id/edit', {
                templateUrl: 'src/app/views/students/form.html',
                controller: 'StudentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/faculty', {
                templateUrl: 'src/app/views/faculty/list.html',
                controller: 'FacultyController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/faculty/create', {
                templateUrl: 'src/app/views/faculty/form.html',
                controller: 'FacultyController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/faculty/:id', {
                templateUrl: 'src/app/views/faculty/detail.html',
                controller: 'FacultyController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/faculty/:id/edit', {
                templateUrl: 'src/app/views/faculty/form.html',
                controller: 'FacultyController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/enrollments', {
                templateUrl: 'src/app/views/enrollments/list.html',
                controller: 'EnrollmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/enrollments/create', {
                templateUrl: 'src/app/views/enrollments/form.html',
                controller: 'EnrollmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/enrollments/bulk', {
                templateUrl: 'src/app/views/enrollments/bulk.html',
                controller: 'EnrollmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/enrollments/:id', {
                templateUrl: 'src/app/views/enrollments/detail.html',
                controller: 'EnrollmentController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/attendance/mark/:sessionId', {
                templateUrl: 'src/app/views/attendance/mark.html',
                controller: 'AttendanceController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/attendance/history', {
                templateUrl: 'src/app/views/attendance/history.html',
                controller: 'AttendanceController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/attendance/my', {
                templateUrl: 'src/app/views/attendance/dashboard.html',
                controller: 'AttendanceController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/reports', {
                templateUrl: 'src/app/views/reports/dashboard.html',
                controller: 'ReportController',
                controllerAs: 'vm',
                authenticate: true
            })
            .when('/audit-logs', {
                templateUrl: 'src/app/views/shared/section-placeholder.html',
                controller: 'NavigationController',
                controllerAs: 'navigation',
                authenticate: true
            })
            .when('/settings', {
                templateUrl: 'src/app/views/dashboard/profile.html',
                controller: 'DashboardController',
                controllerAs: 'dashboard',
                authenticate: true
            })
            .otherwise({
                redirectTo: '/'
            });
    }

    run.$inject = ['$rootScope', '$location', '$cookies', 'AuthService'];

    function run($rootScope, $location, $cookies, AuthService) {
        // Track current user
        $rootScope.$on('$routeChangeStart', function (event, next) {
            // Skip if it's the landing page
            var publicPages = ['/', '/login', '/register', '/forgot-password'];
            var isPublicPage = publicPages.indexOf($location.path()) !== -1 || $location.path().indexOf('/reset-password') === 0;
            var restrictedPage = !isPublicPage;

            if (restrictedPage && !AuthService.isAuthenticated()) {
                $location.path('/login');
            }
        });

        // Set current user on root scope
        $rootScope.getCurrentUser = function () {
            return AuthService.getCurrentUser();
        };

        $rootScope.isAuthenticated = function () {
            return AuthService.isAuthenticated();
        };
    }
})();
