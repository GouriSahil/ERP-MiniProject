(function() {
  'use strict';

  angular.module('erpApp')
    .constant('API_CONFIG', {
      baseUrl: 'http://localhost:3000/api',
      timeout: 10000
    });

})();
