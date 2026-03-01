(function() {
  'use strict';

  angular.module('erpApp')
    .controller('MainController', MainController);

  function MainController() {
    var vm = this;
    vm.isAuthenticated = false;
    vm.user = null;
    vm.logout = logout;

    init();

    function init() {
      // Check if user is authenticated
      var user = localStorage.getItem('erp_user');
      if (user) {
        vm.user = JSON.parse(user);
        vm.isAuthenticated = true;
      }
    }

    function logout() {
      localStorage.removeItem('erp_user');
      localStorage.removeItem('erp_token');
      vm.isAuthenticated = false;
      vm.user = null;
      window.location.href = '#!/login';
    }
  }

})();
