(function() {
  'use strict';

  angular.module('erpApp')
    .config(config);

  config.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];

  function config($stateProvider, $urlRouterProvider, $locationProvider) {
    
    $urlRouterProvider.otherwise('/dashboard');

    $stateProvider
      .state('login', {
        url: '/login',
        templateUrl: 'views/login.html',
        controller: 'LoginController',
        controllerAs: 'vm'
      })
      .state('dashboard', {
        url: '/dashboard',
        templateUrl: 'views/dashboard.html',
        controller: 'DashboardController',
        controllerAs: 'vm'
      })
      .state('products', {
        url: '/products',
        templateUrl: 'views/products.html',
        controller: 'ProductsController',
        controllerAs: 'vm'
      })
      .state('orders', {
        url: '/orders',
        templateUrl: 'views/orders.html',
        controller: 'OrdersController',
        controllerAs: 'vm'
      });

    $locationProvider.html5Mode(false);
  }

})();
