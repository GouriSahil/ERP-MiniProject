(function() {
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
        $httpProvider.interceptors.push(function($q, $location, $cookies) {
            return {
                'request': function(config) {
                    var token = $cookies.get('erp_token');
                    if (token) {
                        config.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return config;
                },
                'responseError': function(response) {
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
            .otherwise({
                redirectTo: '/'
            });
    }

    run.$inject = ['$rootScope', '$location', '$cookies', 'AuthService'];
    
    function run($rootScope, $location, $cookies, AuthService) {
        // Track current user
        $rootScope.$on('$routeChangeStart', function(event, next) {
            // Skip if it's the landing page
            var publicPages = ['/', '/login', '/register'];
            var restrictedPage = publicPages.indexOf($location.path()) === -1;
            
            if (restrictedPage && !AuthService.isAuthenticated()) {
                $location.path('/login');
            }
        });

        // Set current user on root scope
        $rootScope.getCurrentUser = function() {
            return AuthService.getCurrentUser();
        };

        $rootScope.isAuthenticated = function() {
            return AuthService.isAuthenticated();
        };
    }
})();
